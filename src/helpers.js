import { state } from './state.js';
import { COLORS } from './constants.js';

export const getBox = id => state.boxes.find(b => b.id === id);
export const getColor = id => COLORS.find(c => c.id === id) || COLORS[4];
export const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

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
