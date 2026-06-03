import { state } from '../state.js';
import { esc, getColor, highlight } from '../helpers.js';

export function renderSearch() {
  document.getElementById('hdr-title').textContent = '🔎 Suche';
  document.getElementById('hdr-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    <div style="position:relative;margin-bottom:16px">
      <svg style="position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)"
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="search" id="item-search-q" placeholder="Gegenstand oder Karton suchen…"
        style="padding-left:42px;font-size:16px;border-radius:12px;border:1.5px solid var(--border);width:100%;height:48px"
        oninput="runItemSearch(this.value)" autofocus>
    </div>
    <div id="item-search-results">
      <div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px;font-weight:500">
        Tippe um Gegenstände oder Kartons zu suchen
      </div>
    </div>
  </div>`;
  setTimeout(() => document.getElementById('item-search-q')?.focus(), 100);
}

export function runItemSearch(q) {
  const el = document.getElementById('item-search-results');
  if (!el) return;
  const term = q.trim().toLowerCase();
  if (!term) {
    el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px;font-weight:500">Tippe um Gegenstände oder Kartons zu suchen</div>`;
    return;
  }

  const itemHits = [];
  const boxHits = [];

  state.boxes.forEach(box => {
    if (box.name.toLowerCase().includes(term) ||
        (box.sourceRoom || '').toLowerCase().includes(term) ||
        (box.destination || '').toLowerCase().includes(term)) {
      boxHits.push(box);
    }
    (box.items || []).forEach(item => {
      if (item.name.toLowerCase().includes(term) || (item.notes || '').toLowerCase().includes(term)) {
        itemHits.push({ item, box });
      }
    });
  });

  if (!itemHits.length && !boxHits.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:12px">🔍</div>
      <p style="color:var(--muted);font-size:15px;font-weight:600">Keine Treffer für „${esc(q)}"</p>
    </div>`;
    return;
  }

  let html = '';
  if (itemHits.length) {
    html += `<div class="sec">📦 Gegenstände (${itemHits.length})</div>`;
    itemHits.forEach(({ item, box }) => {
      const col = getColor(box.color);
      html += `<button class="box-card" onclick="navigate('detail',{boxId:'${box.id}'})" style="align-items:flex-start">
        <div class="color-slab" style="background:${col.hex};margin-top:2px">${col.emoji}</div>
        <div class="box-info">
          <div class="item-name" style="font-size:15px">${highlight(item.name, term)}</div>
          ${item.notes ? `<div class="item-note" style="margin-top:2px">${highlight(item.notes, term)}</div>` : ''}
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;background:var(--bg);padding:3px 8px;border-radius:6px;color:var(--ink2)">${esc(box.name)}</span>
            <span style="font-size:11px;color:var(--muted);font-weight:500">${esc(box.sourceRoom || '—')} → ${esc(box.destination || '—')}</span>
          </div>
        </div>
        <span class="item-qty" style="margin-top:2px">${item.quantity}×</span>
      </button>`;
    });
  }
  if (boxHits.length) {
    html += `<div class="sec">🗂️ Kartons (${boxHits.length})</div>`;
    boxHits.forEach(box => {
      const col = getColor(box.color);
      const ic = box.items?.length || 0;
      html += `<button class="box-card" onclick="navigate('detail',{boxId:'${box.id}'})">
        <div class="color-slab" style="background:${col.hex}">${col.emoji}</div>
        <div class="box-info">
          <div class="box-name">${highlight(box.name, term)}</div>
          <div class="box-meta">${highlight(box.sourceRoom || '—', term)} → ${highlight(box.destination || '—', term)} · ${ic} Gegenstand${ic !== 1 ? 'stände' : ''}</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`;
    });
  }
  el.innerHTML = html;
}
