import { state } from './state.js';
import { toast, sanitizeBox } from './helpers.js';
import { saveBoxes, saveSettings } from './storage.js';

function setSyncIndicator(active) {
  const el = document.getElementById('sync-dot');
  if (el) el.style.opacity = active ? '1' : '0';
}

export async function driveSync(silent = false) {
  if (!state.scriptUrl.trim()) { if (!silent) toast('❌ Bitte Script-URL eingeben'); return; }
  if (state.isSyncing) return;
  state.isSyncing = true;
  setSyncIndicator(true);
  if (!silent) toast('⏳ Synchronisiere…', 8000);
  try {
    const resp = await fetch(state.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ boxes: state.boxes, user: state.currentUser, deletedIds: state.deletedBoxIds }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Unbekannter Fehler');

    const prevCount = state.boxes.length;
    const merged = data.boxes.map(serverBox => {
      const safe = sanitizeBox(serverBox);
      if (!safe) return null;
      const deletedAt = state.deletedBoxIds[safe.id];
      if (deletedAt && deletedAt >= (safe.updatedAt || '')) return null;
      const local = state.boxes.find(b => b.id === safe.id);
      if (!local) return safe;
      const localDate = new Date(local.updatedAt || 0);
      const serverDate = new Date(safe.updatedAt || 0);
      return localDate > serverDate ? local : safe;
    }).filter(Boolean);
    state.boxes.forEach(lb => { if (!merged.find(b => b.id === lb.id)) merged.push(lb); });
    merged.filter(b => b.deletedAt).forEach(b => {
      if (!state.deletedBoxIds[b.id]) state.deletedBoxIds[b.id] = b.deletedAt;
    });
    state.boxes = merged;
    state.lastSync = new Date().toISOString();
    await saveBoxes(true);
    await saveSettings();
    const newBoxes = state.boxes.length - prevCount;
    if (!silent) toast(`✅ Sync – ${state.boxes.length} Kartons`);
    else if (newBoxes > 0) toast(`🔄 ${newBoxes} neue Karton${newBoxes !== 1 ? 's' : ''} synchronisiert`);
    window.render?.();
  } catch(e) {
    if (!silent) toast('❌ Sync fehlgeschlagen: ' + e.message);
  } finally {
    state.isSyncing = false;
    setSyncIndicator(false);
  }
}

export function scheduleSync() {
  if (!state.scriptUrl) return;
  clearTimeout(state.syncDebounceTimer);
  state.syncDebounceTimer = setTimeout(() => driveSync(true), 2000);
}
