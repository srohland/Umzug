import { state } from './state.js';
import { COLORS } from './constants.js';

export const getBox = id => state.boxes.find(b => b.id === id);
export const getColor = id => COLORS.find(c => c.id === id) || COLORS[4];
export const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const escAttr = s => esc(s).replace(/'/g,'&#39;');

function sanitizeItem(it) {
  if (!it || typeof it !== 'object') return null;
  const id = String(it.id || '');
  if (!/^[a-z0-9]+$/.test(id)) return null;
  const thumb = String(it.thumbnail || '');
  const drivePhotoId = String(it.drivePhotoId || '');
  return {
    id,
    name: String(it.name || ''),
    notes: String(it.notes || ''),
    quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    thumbnail: thumb.startsWith('data:image/') ? thumb : '',
    drivePhotoId: /^[A-Za-z0-9_-]*$/.test(drivePhotoId) ? drivePhotoId : '',
  };
}

export function sanitizeBox(b) {
  if (!b || typeof b !== 'object') return null;
  const id = String(b.id || '');
  if (!/^[a-z0-9]+$/.test(id)) return null;
  const thumb = String(b.thumbnail || '');
  const driveFolderId = String(b.driveFolderId || '');
  const drivePhotoId = String(b.drivePhotoId || '');
  return {
    id,
    name: String(b.name || ''),
    sourceRoom: String(b.sourceRoom || ''),
    destination: String(b.destination || ''),
    color: String(b.color || ''),
    lastEditor: String(b.lastEditor || ''),
    updatedAt: String(b.updatedAt || ''),
    driveFolderId: /^[A-Za-z0-9_-]*$/.test(driveFolderId) ? driveFolderId : '',
    drivePhotoId: /^[A-Za-z0-9_-]*$/.test(drivePhotoId) ? drivePhotoId : '',
    thumbnail: thumb.startsWith('data:image/') ? thumb : '',
    items: Array.isArray(b.items) ? b.items.map(sanitizeItem).filter(Boolean) : [],
  };
}

export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export async function showQR(containerId, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  try {
    const QRCode = (await import('qrcode')).default;
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    await QRCode.toCanvas(canvas, text, {
      width: 200,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
    canvas.style.borderRadius = '10px';
    canvas.style.display = 'block';
  } catch(e) {
    el.innerHTML = '<p style="color:var(--danger);font-size:13px">QR-Fehler</p>';
  }
}

export function highlight(text, term) {
  const safe = esc(text);
  const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return safe.replace(re, '<mark style="background:#fef08a;border-radius:3px;padding:0 1px">$1</mark>');
}
