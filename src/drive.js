import { state } from './state.js';
import { toast } from './helpers.js';
import { saveBoxes, saveSettings } from './storage.js';

async function loadGIS() {
  if (window.google?.accounts?.oauth2) return;
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = res;
    s.onerror = () => rej(new Error('Google nicht erreichbar'));
    document.head.appendChild(s);
  });
}

export async function ensureGToken() {
  if (state.gToken) return true;
  if (!state.gClientId) { toast('❌ Bitte Google Client-ID in Einstellungen eingeben'); return false; }
  try {
    await loadGIS();
    return new Promise(resolve => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: state.gClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: resp => {
          if (resp.error) { toast('❌ Google-Anmeldung fehlgeschlagen'); resolve(false); return; }
          state.gToken = resp.access_token;
          toast('✅ Mit Google Drive verbunden');
          resolve(true);
        },
      });
      client.requestAccessToken();
    });
  } catch(e) { toast('❌ ' + e.message); return false; }
}

async function driveGet(path) {
  const r = await fetch('https://www.googleapis.com/' + path,
    { headers: { Authorization: 'Bearer ' + state.gToken } });
  if (r.status === 401) { state.gToken = null; throw new Error('Token abgelaufen, bitte neu anmelden'); }
  return r.json();
}

async function getOrCreateFolder(name, parentId) {
  const pq = parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`;
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${pq}`);
  const data = await driveGet(`drive/v3/files?q=${q}&fields=files(id)`);
  if (data.files?.length) return data.files[0].id;
  const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  const r = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + state.gToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const f = await r.json();
  return f.id;
}

async function ensureRootFolder() {
  if (state.rootFolderId) return state.rootFolderId;
  state.rootFolderId = await getOrCreateFolder('UmzugsBox', null);
  await saveSettings();
  return state.rootFolderId;
}

export async function getBoxFolder(box) {
  if (box.driveFolderId) return box.driveFolderId;
  const root = await ensureRootFolder();
  const name = `${box.name} [${box.id}]`;
  const id = await getOrCreateFolder(name, root);
  box.driveFolderId = id;
  await saveBoxes();
  return id;
}

export async function uploadToDrive(dataUrl, filename, folderId) {
  const blob = await (await fetch(dataUrl)).blob();
  const meta = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: 'Bearer ' + state.gToken }, body: form });
  if (!r.ok) throw new Error('Upload fehlgeschlagen: ' + r.status);
  const d = await r.json();
  return d.id;
}

export async function downloadFromDrive(fileId) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: 'Bearer ' + state.gToken } });
  if (!r.ok) throw new Error('Download fehlgeschlagen');
  const blob = await r.blob();
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result);
    fr.readAsDataURL(blob);
  });
}
