import { state } from '../state.js';
import { esc, escAttr, activeBoxes, getBox, getColor, toast } from '../helpers.js';

export function renderScanner() {
  document.getElementById('hdr-title').textContent = '🔍 QR-Code scannen';
  document.getElementById('hdr-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    <div class="card">
      <p style="color:var(--ink2);margin-bottom:14px;font-size:14px;font-weight:500;line-height:1.5">
        Halte die Kamera auf den QR-Code des Umzugskartons. Der Karton wird automatisch geöffnet.
      </p>
      <div id="reader" style="width:100%"></div>
      <div id="scan-msg" style="margin-top:14px;text-align:center;font-size:14px;font-weight:600;color:var(--muted)">Kamera wird gestartet…</div>
    </div>
    <div class="sec">Manuell suchen</div>
    <div class="card">
      <div class="fg" style="margin-bottom:10px">
        <label>Box-Name oder ID</label>
        <input type="text" id="search-q" placeholder="Karton suchen…" oninput="doSearch(this.value)">
      </div>
      <div id="search-results"></div>
    </div>
  </div>`;
  setTimeout(startScanner, 150);
}

export async function startScanner() {
  killScanner();
  const { Html5Qrcode } = await import('html5-qrcode');
  state.scanner = new Html5Qrcode('reader');
  const msg = document.getElementById('scan-msg');
  state.scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 240, height: 240 } },
    text => { killScanner(); handleScan(text); },
    () => {}
  ).then(() => { if (msg) msg.textContent = '📷 Scanne QR-Code…'; })
   .catch(err => { if (msg) msg.innerHTML = `<span style="color:var(--danger)">Kamerazugriff verweigert: ${err}</span>`; });
}

export function killScanner() {
  if (state.scanner) {
    try { state.scanner.stop().catch(() => {}); } catch(e) {}
    state.scanner = null;
  }
}

function handleScan(text) {
  if (text.startsWith('UMZUGSBOX:')) {
    const token = text.slice(10);
    const box = state.boxes.find(b => !b.deletedAt && (b.boxNumber === token || b.id === token));
    if (box) {
      toast('✅ Karton gefunden!');
      window.navigate?.('detail', { boxId: box.id });
    } else {
      const m = document.getElementById('scan-msg');
      if (m) m.innerHTML = `<span style="color:var(--danger)">❌ Karton nicht gefunden</span>`;
      setTimeout(() => { if (state.view === 'scan') startScanner(); }, 2500);
    }
  } else {
    const m = document.getElementById('scan-msg');
    if (m) m.innerHTML = `<span style="color:var(--danger)">❌ Kein UmzugsBox QR-Code</span>`;
    setTimeout(() => { if (state.view === 'scan') startScanner(); }, 2000);
  }
}

export function doSearch(q) {
  const el = document.getElementById('search-results');
  if (!el) return;
  if (!q.trim()) { el.innerHTML = ''; return; }
  const ql = q.toLowerCase();
  const res = activeBoxes().filter(b => b.name.toLowerCase().includes(ql) || b.id.includes(ql) || (b.boxNumber && b.boxNumber.includes(q)));
  if (!res.length) { el.innerHTML = `<p style="color:var(--muted);font-size:14px">Keine Treffer</p>`; return; }
  el.innerHTML = res.map(b => {
    const c = getColor(b.color);
    return `<button class="box-card" style="margin-bottom:8px" onclick="navigate('detail',{boxId:'${escAttr(b.id)}'})">
      <div class="color-slab" style="background:${c.hex}">${c.emoji}</div>
      <div class="box-info"><div class="box-name">${esc(b.name)}</div>
        <div class="box-meta">${esc(b.sourceRoom || '—')} → ${esc(b.destination || '—')}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
  }).join('');
}
