import { state } from './state.js';
import { toast, getBox } from './helpers.js';
import { store, saveBoxes } from './storage.js';
import { ensureGToken, getBoxFolder, uploadToDrive, downloadFromDrive } from './drive.js';

export function compressImage(file, maxPx, quality) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function saveFullPhoto(id, dataUrl) {
  try { await store.set('ub_photo_' + id, dataUrl, false); } catch(e) {}
}
export async function loadFullPhoto(id) {
  try { const r = await store.get('ub_photo_' + id, false); return r ? r.value : null; } catch(e) { return null; }
}
export async function deleteFullPhoto(id) {
  try { await store.delete('ub_photo_' + id, false); } catch(e) {}
}

export async function pushPhotoToDrive(fullDataUrl, targetId, isItem) {
  try {
    if (!await ensureGToken()) return;
    const box = isItem ? getBox(state.selBox) : getBox(targetId);
    if (!box) return;
    const folderId = await getBoxFolder(box);
    const filename = isItem ? `${targetId}.jpg` : 'karton.jpg';
    const driveId = await uploadToDrive(fullDataUrl, filename, folderId);
    if (isItem) {
      const item = box.items?.find(i => i.id === targetId);
      if (item) { item.drivePhotoId = driveId; await saveBoxes(); }
      if (state.tempItem && state.tempItem.id === targetId) state.tempItem.drivePhotoId = driveId;
    } else {
      box.drivePhotoId = driveId;
      await saveBoxes();
      if (state.tempBox && state.tempBox.id === targetId) state.tempBox.drivePhotoId = driveId;
    }
    toast('☁️ Foto in Drive hochgeladen');
  } catch(e) { toast('⚠️ Drive-Upload: ' + e.message); }
}

export async function handlePhotoInput(file, targetId, isItem) {
  if (!file) return;
  toast('⏳ Foto wird verarbeitet…', 4000);
  try {
    const full = await compressImage(file, 800, 0.75);
    const thumb = await compressImage(file, 120, 0.65);
    await saveFullPhoto(targetId, full);
    if (isItem) {
      if (state.tempItem) state.tempItem.thumbnail = thumb;
      const prev = document.getElementById('photo-preview-' + targetId);
      if (prev) prev.src = thumb;
      const ph = document.getElementById('photo-placeholder-' + targetId);
      if (ph) ph.style.display = 'none';
    } else {
      if (state.tempBox) {
        state.tempBox.thumbnail = thumb;
        window.render?.();
      }
    }
    toast('✅ Foto lokal gespeichert');
    pushPhotoToDrive(full, targetId, isItem);
  } catch(e) { toast('❌ Foto-Fehler: ' + e.message); }
}

export async function openPhotoModal(id, thumb, isItem, driveId) {
  state.modalPhotoId = id;
  state.modalIsItem = isItem;
  state.modalDriveId = driveId || null;
  const modal = document.getElementById('photo-modal');
  const img = document.getElementById('photo-modal-img');
  const driveBtn = document.getElementById('photo-modal-drive');
  const del = document.getElementById('photo-modal-del');
  img.src = thumb;
  modal.classList.add('open');
  del.style.display = 'block';
  driveBtn.style.display = 'none';
  const local = await loadFullPhoto(id);
  if (local) { img.src = local; return; }
  if (driveId) {
    if (state.gToken) {
      await loadModalFromDrive();
    } else {
      driveBtn.style.display = 'block';
    }
  }
}

export async function loadModalFromDrive() {
  const driveBtn = document.getElementById('photo-modal-drive');
  if (driveBtn) driveBtn.style.display = 'none';
  try {
    if (!await ensureGToken()) return;
    toast('⏳ Lade von Drive…', 5000);
    const full = await downloadFromDrive(state.modalDriveId);
    await saveFullPhoto(state.modalPhotoId, full);
    const img = document.getElementById('photo-modal-img');
    if (img) img.src = full;
    toast('✅ Vollbild geladen & lokal gecacht');
  } catch(e) { toast('⚠️ Drive: ' + e.message); }
}

export function closePhotoModal() {
  document.getElementById('photo-modal').classList.remove('open');
  document.getElementById('photo-modal-img').src = '';
}

export async function deleteModalPhoto() {
  if (!confirm('Foto löschen?')) return;
  await deleteFullPhoto(state.modalPhotoId);
  if (state.modalIsItem) {
    const box = getBox(state.selBox);
    const item = box?.items?.find(i => i.id === state.modalPhotoId);
    if (item) { delete item.thumbnail; await saveBoxes(); }
  } else {
    const box = getBox(state.modalPhotoId);
    if (box) { delete box.thumbnail; await saveBoxes(); }
  }
  closePhotoModal();
  toast('🗑️ Foto gelöscht');
  window.render?.();
}
