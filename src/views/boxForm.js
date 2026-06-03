import { state } from '../state.js';
import { esc, getRooms, getBox, getColor, uid, toast } from '../helpers.js';
import { COLORS } from '../constants.js';
import { saveBoxes } from '../storage.js';
import { saveFullPhoto, compressImage, pushPhotoToDrive } from '../photo.js';

export function renderBoxForm(isNew) {
  if (!state.tempBox) {
    state.tempBox = isNew
      ? { id: uid(), name: '', sourceRoom: '', destination: '', color: 'blau', items: [] }
      : JSON.parse(JSON.stringify(getBox(state.selBox)));
  }
  document.getElementById('hdr-title').textContent = isNew ? 'Neuer Karton' : 'Karton bearbeiten';
  document.getElementById('hdr-actions').innerHTML = '';
  const rOpts = getRooms().map(r => `<option value="${r}"${state.tempBox.sourceRoom === r ? ' selected' : ''}>${r}</option>`).join('');
  const dOpts = getRooms().map(r => `<option value="${r}"${state.tempBox.destination === r ? ' selected' : ''}>${r}</option>`).join('');
  const swatches = COLORS.map(c => `<div class="csw${state.tempBox.color === c.id ? ' sel' : ''}"
    style="background:${c.hex}" title="${c.name}" onclick="pickColor('${c.id}',this)"></div>`).join('');
  const selCol = getColor(state.tempBox.color);
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    <div class="fg">
      <label>Foto des Kartons</label>
      ${state.tempBox.thumbnail
        ? `<div style="position:relative;margin-bottom:4px">
            <img id="photo-preview-${state.tempBox.id}" src="${state.tempBox.thumbnail}"
              style="width:100%;height:140px;object-fit:cover;border-radius:11px;border:1.5px solid var(--border)">
            <button onclick="removeBoxPhoto()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);
              border:none;color:#fff;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer">✕ Entfernen</button>
          </div>
          <button class="btn btn-s btn-sm" onclick="document.getElementById('box-photo-inp').click()" style="margin-top:6px">📷 Foto ändern</button>`
        : `<div class="box-photo-add" onclick="document.getElementById('box-photo-inp').click()">
            <span style="font-size:32px">📷</span>
            <span>Foto aufnehmen oder auswählen</span>
          </div>`}
      <input type="file" id="box-photo-inp" accept="image/*" capture="environment" style="display:none"
        onchange="handlePhotoInput(this.files[0],'${state.tempBox.id}',false)">
    </div>
    <div class="fg">
      <label>Name / Bezeichnung</label>
      <input type="text" id="bn" value="${esc(state.tempBox.name)}" placeholder="z.B. Küche 1, Bücher Regal…" oninput="tempBoxSetName(this.value)">
    </div>
    <div class="fg">
      <label>Herkunftszimmer</label>
      <select onchange="tempBoxSetSource(this.value)">
        <option value="">— Zimmer wählen —</option>${rOpts}
      </select>
    </div>
    <div class="fg">
      <label>Zielzimmer</label>
      <select onchange="tempBoxSetDest(this.value)">
        <option value="">— Ziel wählen —</option>${dOpts}
      </select>
    </div>
    <div class="fg">
      <label>Farbcode (für Umzugshelfer)</label>
      <div class="color-grid">${swatches}</div>
      <div id="col-label" style="margin-top:8px;font-size:14px;color:var(--ink2);font-weight:500">
        Ausgewählt: <strong>${selCol.emoji} ${selCol.name}</strong>
      </div>
    </div>
    <button class="btn btn-p btn-w" onclick="saveBox(${isNew})" style="margin-top:4px">
      💾 ${isNew ? 'Karton erstellen' : 'Änderungen speichern'}
    </button>
    ${!isNew ? `<button class="btn btn-d btn-w" onclick="delBox('${state.tempBox.id}')" style="margin-top:10px">🗑️ Karton löschen</button>` : ''}
    <div style="height:24px"></div>
  </div>`;
}

export function startEditBox() {
  state.tempBox = null;
  window.navigate?.('edit-box', { boxId: state.selBox });
}

export function pickColor(id, el) {
  state.tempBox.color = id;
  document.querySelectorAll('.csw').forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
  const col = getColor(id);
  document.getElementById('col-label').innerHTML = `Ausgewählt: <strong>${col.emoji} ${col.name}</strong>`;
}

export function removeBoxPhoto() {
  if (state.tempBox) state.tempBox.thumbnail = null;
  window.render?.();
}

export function tempBoxSetName(v) { if (state.tempBox) state.tempBox.name = v; }
export function tempBoxSetSource(v) { if (state.tempBox) state.tempBox.sourceRoom = v; }
export function tempBoxSetDest(v) { if (state.tempBox) state.tempBox.destination = v; }

export async function quickItemPhoto(input, boxId, itemId) {
  const file = input.files[0];
  if (!file) return;
  toast('⏳ Foto wird verarbeitet…', 4000);
  try {
    const full = await compressImage(file, 800, 0.75);
    const thumb = await compressImage(file, 120, 0.65);
    await saveFullPhoto(itemId, full);
    const box = getBox(boxId);
    const item = box?.items?.find(i => i.id === itemId);
    if (item) { item.thumbnail = thumb; await saveBoxes(); }
    toast('✅ Foto lokal gespeichert');
    window.render?.();
    pushPhotoToDrive(full, itemId, true);
  } catch(e) { toast('❌ ' + e.message); }
}

export async function saveBox(isNew) {
  if (!state.tempBox.name.trim()) { toast('❌ Bitte einen Namen eingeben'); return; }
  state.tempBox.lastEditor = state.currentUser;
  state.tempBox.updatedAt = new Date().toISOString();
  if (isNew) { state.tempBox.createdAt = state.tempBox.updatedAt; state.boxes.push(state.tempBox); state.selBox = state.tempBox.id; }
  else { const i = state.boxes.findIndex(b => b.id === state.tempBox.id); if (i >= 0) state.boxes[i] = state.tempBox; }
  const bid = state.tempBox.id;
  state.tempBox = null;
  await saveBoxes();
  toast('✅ Gespeichert');
  window.navigate?.('detail', { boxId: bid });
}

export async function delBox(id) {
  if (!confirm('Karton wirklich löschen? Alle Einträge gehen verloren.')) return;
  const now = new Date().toISOString();
  state.deletedBoxIds[id] = now;
  const box = state.boxes.find(b => b.id === id);
  if (box) { box.deletedAt = now; box.updatedAt = now; }
  state.tempBox = null;
  await saveBoxes();
  window.navigate?.('list');
  toast('🗑️ Karton gelöscht');
}
