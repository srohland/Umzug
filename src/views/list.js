import { esc, escAttr, activeBoxes, getColor } from '../helpers.js';

export function renderList() {
  document.getElementById('hdr-title').textContent = '📦 UmzugsBox';
  document.getElementById('hdr-actions').innerHTML = `
    <button onclick="navigate('new-box')" title="Neu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>`;
  const c = document.getElementById('content');
  if (activeBoxes().length === 0) {
    c.innerHTML = `<div class="scroll-area"><div class="empty"><div class="emo">📦</div>
      <p style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--ink)">Noch keine Kartons</p>
      <p style="margin-bottom:28px">Erstelle deinen ersten Umzugskarton</p>
      <button class="btn btn-p btn-w" onclick="navigate('new-box')">+ Neuen Karton anlegen</button>
    </div></div>`;
    return;
  }
  const groups = {};
  activeBoxes().forEach(b => { const k = b.sourceRoom || 'Sonstiges'; if (!groups[k]) groups[k] = []; groups[k].push(b); });
  let html = `<div class="scroll-area">
    <div style="color:var(--muted);font-size:13px;font-weight:600;margin-bottom:14px;padding:0 2px">
      ${activeBoxes().length} Karton${activeBoxes().length !== 1 ? 'en' : ''} · ${activeBoxes().reduce((s, b) => s + (b.items?.length || 0), 0)} Gegenstände
    </div>`;
  Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).forEach(([room, rb]) => {
    html += `<div class="sec">📍 ${room}</div>`;
    rb.forEach(box => {
      const col = getColor(box.color);
      const ic = box.items?.length || 0;
      html += `<button class="box-card" onclick="navigate('detail',{boxId:'${escAttr(box.id)}'})">
        <div class="color-slab" style="background:${col.hex}">${col.emoji}</div>
        <div class="box-info">
          <div class="box-name">${box.boxNumber ? `<span style="font-family:monospace;font-size:12px;font-weight:900;opacity:.6;margin-right:6px">${esc(box.boxNumber)}</span>` : ''}${esc(box.name)}</div>
          <div class="box-meta">${esc(box.sourceRoom || '—')} → ${esc(box.destination || '—')} · ${ic} Gegenstand${ic !== 1 ? 'stände' : ''}</div>
          ${box.lastEditor ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;font-weight:500">✏️ ${esc(box.lastEditor)}</div>` : ''}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`;
    });
  });
  c.innerHTML = html + '</div>';
}
