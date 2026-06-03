import { state } from '../state.js';
import { esc, getBox, uid, toast } from '../helpers.js';
import { saveBoxes } from '../storage.js';

export function renderItemForm(isNew) {
  if (!state.tempItem) {
    state.tempItem = isNew
      ? { id: uid(), name: '', quantity: 1, notes: '' }
      : JSON.parse(JSON.stringify(getBox(state.selBox).items.find(i => i.id === state.selItem)));
  }
  const box = getBox(state.selBox);
  document.getElementById('hdr-title').textContent = isNew ? 'Neuer Gegenstand' : 'Gegenstand bearbeiten';
  document.getElementById('hdr-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    <div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:14px">Karton: ${esc(box?.name)}</div>
    <div class="fg">
      <label>Foto des Gegenstands</label>
      ${state.tempItem.thumbnail
        ? `<div style="position:relative;margin-bottom:4px">
            <img src="${state.tempItem.thumbnail}" style="width:100%;height:120px;object-fit:cover;border-radius:11px;border:1.5px solid var(--border)">
            <button onclick="tempItemRemovePhoto()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);
              border:none;color:#fff;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">✕ Entfernen</button>
          </div>`
        : `<label class="box-photo-add" for="item-photo-inp" style="height:90px">
            <span style="font-size:28px">📷</span>
            <span>Foto aufnehmen oder auswählen</span>
          </label>`}
      <input type="file" id="item-photo-inp" accept="image/*" capture="environment" style="display:none"
        onchange="handlePhotoInput(this.files[0],'${state.tempItem.id}',true)">
    </div>
    <div class="fg">
      <label>Bezeichnung</label>
      <input type="text" id="iname" value="${esc(state.tempItem.name)}" placeholder="z.B. Töpfe, Bücher, Kissen…" oninput="tempItemSetName(this.value)">
    </div>
    <div class="fg">
      <label>Anzahl</label>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-s" style="width:48px;height:48px;padding:0;font-size:22px" onclick="adjQty(-1)">−</button>
        <input type="number" id="iqty" value="${state.tempItem.quantity}" min="1" style="text-align:center;font-size:22px;font-weight:800;font-family:'DM Mono',monospace" oninput="tempItemSetQty(this.value)">
        <button class="btn btn-s" style="width:48px;height:48px;padding:0;font-size:22px" onclick="adjQty(1)">+</button>
      </div>
    </div>
    <div class="fg">
      <label>Notizen (optional)</label>
      <textarea id="inotes" placeholder="Hinweise, Beschreibung, Vorsicht zerbrechlich…" oninput="tempItemSetNotes(this.value)">${esc(state.tempItem.notes || '')}</textarea>
    </div>
    <button class="btn btn-p btn-w" onclick="saveItem(${isNew})">💾 ${isNew ? 'Hinzufügen' : 'Speichern'}</button>
    ${!isNew ? `<button class="btn btn-d btn-w" onclick="delItem('${state.selBox}','${state.tempItem.id}',true)" style="margin-top:10px">🗑️ Löschen</button>` : ''}
    <div style="height:24px"></div>
  </div>`;
}

export function tempItemRemovePhoto() { if (state.tempItem) { state.tempItem.thumbnail = null; window.render?.(); } }
export function tempItemSetName(v) { if (state.tempItem) state.tempItem.name = v; }
export function tempItemSetQty(v) { if (state.tempItem) state.tempItem.quantity = Math.max(1, parseInt(v) || 1); }
export function tempItemSetNotes(v) { if (state.tempItem) state.tempItem.notes = v; }

export function adjQty(d) {
  state.tempItem.quantity = Math.max(1, (state.tempItem.quantity || 1) + d);
  const el = document.getElementById('iqty');
  if (el) el.value = state.tempItem.quantity;
}

export async function saveItem(isNew) {
  if (!state.tempItem.name.trim()) { toast('❌ Bitte eine Bezeichnung eingeben'); return; }
  const box = getBox(state.selBox);
  if (!box.items) box.items = [];
  if (isNew) box.items.push(state.tempItem);
  else { const i = box.items.findIndex(x => x.id === state.tempItem.id); if (i >= 0) box.items[i] = state.tempItem; }
  box.lastEditor = state.currentUser;
  box.updatedAt = new Date().toISOString();
  state.tempItem = null;
  await saveBoxes();
  toast('✅ Gespeichert');
  window.navigate?.('detail', { boxId: state.selBox });
}

export async function delItem(boxId, itemId, nav = false) {
  if (!confirm('Gegenstand löschen?')) return;
  const box = getBox(boxId);
  if (!box) return;
  box.items = box.items.filter(i => i.id !== itemId);
  box.lastEditor = state.currentUser;
  box.updatedAt = new Date().toISOString();
  await saveBoxes();
  toast('🗑️ Gelöscht');
  if (nav) window.navigate?.('detail', { boxId });
  else window.render?.();
}
