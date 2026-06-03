import { getBox, getColor } from '../helpers.js';

async function generateLabelPng(box) {
  const col = getColor(box.color);
  const num = box.boxNumber || box.id;
  const textColor = ['gelb', 'weiss'].includes(box.color) ? '#1e293b' : '#fff';

  const QRCode = (await import('qrcode')).default;
  const qrDataUrl = await QRCode.toDataURL('UMZUGSBOX:' + num, {
    width: 400,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });

  const qrSize = 400;
  const stripH = Math.round(qrSize / 3);
  const canvas = document.createElement('canvas');
  canvas.width = qrSize;
  canvas.height = qrSize + stripH;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await new Promise(resolve => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, qrSize, qrSize); resolve(); };
    img.src = qrDataUrl;
  });

  ctx.fillStyle = col.hex;
  ctx.fillRect(0, qrSize, canvas.width, stripH);

  const numFontSize = Math.round(stripH * 0.55);
  ctx.font = `900 ${numFontSize}px monospace`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(num, Math.round(canvas.width * 0.06), qrSize + stripH / 2);

  ctx.font = `700 ${Math.round(stripH * 0.22)}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`${col.emoji} ${col.name}`, canvas.width - Math.round(canvas.width * 0.06), qrSize + stripH / 2);

  return canvas.toDataURL('image/png');
}

export async function printLabels(boxId) {
  const box = getBox(boxId);
  if (!box) return;
  const num = box.boxNumber || box.id;
  const pngDataUrl = await generateLabelPng(box);

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Etiketten – ${num}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: sans-serif; }
      @page { size: A4 portrait; margin: 8mm; }
      .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 0; width: 190mm; height: 277mm; }
      .cell { display: flex; align-items: center; justify-content: center; border: 1px dashed #bbb; }
      .cell img { width: 88mm; height: auto; display: block; }
    </style>
  </head><body>
    <div class="page">
      <div class="cell"><img src="${pngDataUrl}"></div>
      <div class="cell"><img src="${pngDataUrl}"></div>
      <div class="cell"><img src="${pngDataUrl}"></div>
      <div class="cell"><img src="${pngDataUrl}"></div>
    </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export function printInventory(boxId) {
  const box = getBox(boxId);
  if (!box) return;
  const col = getColor(box.color);
  const num = box.boxNumber || box.id;
  const items = box.items || [];
  const textColor = ['gelb', 'weiss'].includes(box.color) ? '#1e293b' : '#fff';

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Inventar – ${box.name}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: sans-serif; padding: 0; margin: 0; color: #0f172a; }
      @page { size: A4; margin: 15mm; }
      .header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; }
      .badge {
        font-size: 26pt; font-weight: 900; font-family: monospace;
        background: ${col.hex}; color: ${textColor};
        padding: 4px 14px; border-radius: 8px; letter-spacing: 2px;
        print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
      .title { font-size: 18pt; font-weight: 800; }
      .meta { font-size: 10pt; color: #64748b; margin-top: 5px; }
      .item { display: flex; align-items: flex-start; gap: 12px; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
      .cb { width: 16px; height: 16px; border: 2px solid #94a3b8; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
      .iname { font-size: 12pt; font-weight: 700; }
      .inotes { font-size: 9pt; color: #94a3b8; margin-top: 2px; }
      .iqty { font-size: 11pt; color: #475569; font-weight: 700; white-space: nowrap; margin-left: auto; padding-left: 8px; }
      .empty { color: #94a3b8; font-style: italic; padding: 20px 0; }
    </style>
  </head><body>
    <div class="header">
      <div class="badge">${num}</div>
      <div>
        <div class="title">${box.name}</div>
        <div class="meta">${col.emoji} ${col.name} · ${box.sourceRoom || '—'} → ${box.destination || '—'} · ${items.length} Gegenstand${items.length !== 1 ? 'stände' : ''}</div>
      </div>
    </div>
    ${items.length === 0
      ? '<div class="empty">Keine Gegenstände erfasst.</div>'
      : items.map(it => `<div class="item">
          <div class="cb"></div>
          <div style="flex:1">
            <div class="iname">${it.name}</div>
            ${it.notes ? `<div class="inotes">${it.notes}</div>` : ''}
          </div>
          <div class="iqty">${it.quantity}×</div>
        </div>`).join('')}
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
