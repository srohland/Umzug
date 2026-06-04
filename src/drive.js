import { state } from './state.js';
import { toast } from './helpers.js';
import { saveBoxes, saveSettings } from './storage.js';

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createJWT(sa) {
  const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const now = Math.floor(Date.now() / 1000);
  const header = enc({ alg: 'RS256', typ: 'JWT' });
  const payload = enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });
  const signingInput = `${header}.${payload}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

export async function ensureGToken() {
  if (state.gToken && state.gTokenExpiry > Date.now() + 60_000) return true;
  if (!state.serviceAccountJson) {
    toast('❌ Bitte Service Account JSON in Einstellungen laden');
    return false;
  }
  try {
    const jwt = await createJWT(state.serviceAccountJson);
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const data = await resp.json();
    if (!data.access_token) throw new Error(data.error_description || 'Token-Fehler');
    state.gToken = data.access_token;
    state.gTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    return true;
  } catch(e) {
    toast('❌ Drive-Auth: ' + e.message);
    return false;
  }
}

async function driveGet(path) {
  const r = await fetch('https://www.googleapis.com/' + path,
    { headers: { Authorization: 'Bearer ' + state.gToken } });
  if (r.status === 401) {
    state.gToken = null;
    state.gTokenExpiry = 0;
    throw new Error('Token abgelaufen');
  }
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
  return (await r.json()).id;
}

async function ensureRootFolder() {
  if (state.rootFolderId) return state.rootFolderId;
  throw new Error('Bitte Drive-Ordner-ID in den Einstellungen eingeben');
}

export async function getBoxFolder(box) {
  if (box.driveFolderId) return box.driveFolderId;
  const root = await ensureRootFolder();
  const id = await getOrCreateFolder(`${box.name} [${box.id}]`, root);
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
  return (await r.json()).id;
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
