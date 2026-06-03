import { state } from '../state.js';
import { esc, escAttr, getBox, getColor, showQR } from '../helpers.js';

export function renderDetail() {
  const box = getBox(state.selBox);
  if (!box || box.deletedAt) { window.navigate?.('list'); return; }
  const col = getColor(box.color);
  const items = box.items || [];
  document.getElementById('hdr-title').textContent = box.name;
  document.getElementById('hdr-actions').innerHTML = `
    <button onclick="startEditBox()" title="Bearbeiten">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>`;
  const textColor = ['gelb', 'weiss'].includes(box.color) ? '#1e293b' : '#fff';
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    <div class="card">
      <div class="dcb" style="background:${col.hex}"></div>
      ${box.thumbnail
        ? `<div class="box-photo-wrap no-print" onclick="openPhotoModal('${escAttr(box.id)}','${escAttr(box.thumbnail)}',false,'${escAttr(box.drivePhotoId || '')}')">
            <img src="${box.thumbnail}" alt="Karton Foto">
            <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.5);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px">${box.drivePhotoId ? '☁️ Tippen für Vollbild' : 'Tippen zum Vergrößern'}</div>
          </div>`
        : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <span class="chip" style="background:${col.hex};color:${textColor}">${col.emoji} ${col.name}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.7px">Herkunft</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px">${esc(box.sourceRoom || '—')}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.7px">Ziel</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px">${esc(box.destination || '—')}</div>
        </div>
      </div>
      ${box.lastEditor ? `<div style="font-size:12px;color:var(--muted);margin-top:10px;font-weight:500">Zuletzt bearbeitet von ${esc(box.lastEditor)}</div>` : ''}
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-weight:800;font-size:15px">Inhalt <span style="color:var(--muted);font-weight:600">(${items.length})</span></span>
        <button class="btn btn-s btn-sm no-print" onclick="navigate('new-item',{boxId:'${escAttr(box.id)}'})">+ Hinzufügen</button>
      </div>
      ${items.length === 0
        ? '<div style="text-align:center;padding:24px 0;color:var(--muted);font-size:14px;font-weight:500">Noch keine Gegenstände erfasst</div>'
        : items.map(it => `<div class="item-row">
          ${it.thumbnail
            ? `<img class="photo-thumb" src="${escAttr(it.thumbnail)}" onclick="openPhotoModal('${escAttr(it.id)}','${escAttr(it.thumbnail)}',true,'${escAttr(it.drivePhotoId || '')}')">`
            : `<div class="photo-placeholder no-print" title="Foto hinzufügen"
                onclick="document.getElementById('photo-item-quick-${escAttr(it.id)}').click()">📷
                <input type="file" id="photo-item-quick-${escAttr(it.id)}" accept="image/*" capture="environment" style="display:none"
                  onchange="quickItemPhoto(this,'${escAttr(box.id)}','${escAttr(it.id)}')">
              </div>`}
          <div class="item-body">
            <div class="item-name">${esc(it.name)}</div>
            ${it.notes ? `<div class="item-note">${esc(it.notes)}</div>` : ''}
          </div>
          <span class="item-qty">${it.quantity}×</span>
          <button class="icon-btn no-print" onclick="navigate('edit-item',{boxId:'${escAttr(box.id)}',itemId:'${escAttr(it.id)}'})">✏️</button>
          <button class="icon-btn no-print" onclick="delItem('${escAttr(box.id)}','${escAttr(it.id)}')">🗑️</button>
        </div>`).join('')}
    </div>

    <div class="card">
      <div style="font-weight:800;font-size:15px;margin-bottom:14px">QR-Code</div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
        <div id="qr-code" style="padding:12px;background:#fff;border-radius:12px;box-shadow:0 0 0 1px var(--border)"></div>
        <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:900;color:var(--ink);text-align:center;letter-spacing:3px">${esc(box.boxNumber || box.id)}</div>
        <div style="display:flex;gap:8px;width:100%">
          <button class="btn btn-s btn-sm no-print" style="flex:1" onclick="printLabels('${escAttr(box.id)}')">🏷️ Etiketten</button>
          <button class="btn btn-s btn-sm no-print" style="flex:1" onclick="printInventory('${escAttr(box.id)}')">📋 Inventar</button>
        </div>
      </div>
    </div>
    <div style="height:20px"></div>
  </div>`;
  setTimeout(() => showQR('qr-code', 'UMZUGSBOX:' + (box.boxNumber || box.id)), 60);
}
