// Generates icon-192.png and icon-512.png in public/ using only Node built-ins.
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '..', 'public');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, draw) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const o = y * (1 + size * 4) + 1 + x * 4;
      raw[o] = r; raw[o+1] = g; raw[o+2] = b; raw[o+3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bit depth=8, color type=RGBA
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// All coordinates below are in 512×512 space, scaled to actual size.
// Background: indigo #4f46e5, rounded corners r=96
// Lid:   x 72–440,  y 156–220  (white; tape x 224–288 = #818cf8)
// Body:  x 88–424,  y 220–432  (white; tape x 224–288 = #c7d2fe; seam y 220–228 = #e0e7ff)
function drawIcon(px, py, size) {
  const S = 512;
  const x = px * S / size, y = py * S / size;

  // Rounded background
  const R = 96;
  const dx = x < R ? R - x : x > S - R ? x - (S - R) : 0;
  const dy = y < R ? R - y : y > S - R ? y - (S - R) : 0;
  if (Math.sqrt(dx*dx + dy*dy) > R) return [0, 0, 0, 0]; // transparent corner

  const BG    = [0x4f, 0x46, 0xe5, 255];
  const WHITE = [255,  255,  255,  255];
  const TAPE1 = [0x81, 0x8c, 0xf8, 255]; // lid tape
  const TAPE2 = [0xc7, 0xd2, 0xfe, 255]; // body tape + seam

  const inLid  = y >= 156 && y < 220 && x >= 72  && x <= 440;
  const inBody = y >= 220 && y <= 432 && x >= 88  && x <= 424;
  const onTape = x >= 224 && x <= 288;

  if (inLid)  return onTape ? TAPE1 : WHITE;
  if (inBody) return (y < 228 || onTape) ? TAPE2 : WHITE;
  return BG;
}

for (const size of [192, 512]) {
  const png = makePNG(size, drawIcon);
  const out = join(outDir, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`✓ public/icon-${size}.png (${size}×${size})`);
}
