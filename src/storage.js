import { state } from './state.js';
import { toast } from './helpers.js';

export const store = {
  async get(key, shared) {
    if (window.storage) {
      try { return await window.storage.get(key, shared); } catch(e) { return null; }
    } else {
      try {
        const val = localStorage.getItem(key);
        return val ? { value: val } : null;
      } catch(e) { return null; }
    }
  },
  async set(key, value, shared) {
    if (window.storage) {
      try { return await window.storage.set(key, value, shared); } catch(e) {}
    } else {
      try { localStorage.setItem(key, value); } catch(e) {}
    }
  },
  async delete(key, shared) {
    if (window.storage) {
      try { return await window.storage.delete(key, shared); } catch(e) {}
    } else {
      try { localStorage.removeItem(key); } catch(e) {}
    }
  },
};

export async function loadData() {
  try {
    const r = await store.get('ub_boxes', true);
    if (r) state.boxes = JSON.parse(r.value);
  } catch(e) { state.boxes = []; }
  try {
    const r = await store.get('ub_deleted', true);
    if (r) state.deletedBoxIds = JSON.parse(r.value);
  } catch(e) { state.deletedBoxIds = {}; }
  try {
    const r = await store.get('ub_settings', false);
    if (r) {
      const s = JSON.parse(r.value);
      state.currentUser = s.user || 'Nutzer 1';
      state.scriptUrl = s.scriptUrl || '';
      state.lastSync = s.lastSync || null;
      state.gClientId = s.gClientId || '';
      state.rootFolderId = s.rootFolderId || null;
      state.customRooms = Array.isArray(s.customRooms) ? s.customRooms : null;
      state.disabledColorIds = Array.isArray(s.disabledColorIds) ? s.disabledColorIds : [];
      state.nextBoxNumber = s.nextBoxNumber > 0 ? s.nextBoxNumber : 1;
    }
  } catch(e) {}
}

export async function saveBoxes(skipSync = false) {
  try {
    await store.set('ub_boxes', JSON.stringify(state.boxes), true);
    await store.set('ub_deleted', JSON.stringify(state.deletedBoxIds), true);
  } catch(e) {
    toast('❌ Speicherfehler');
  }
  if (!skipSync) window.scheduleSync?.();
}

export async function saveSettings() {
  try {
    await store.set('ub_settings', JSON.stringify({
      user: state.currentUser,
      scriptUrl: state.scriptUrl,
      lastSync: state.lastSync,
      gClientId: state.gClientId,
      rootFolderId: state.rootFolderId,
      customRooms: state.customRooms,
      disabledColorIds: state.disabledColorIds,
      nextBoxNumber: state.nextBoxNumber,
    }), false);
  } catch(e) {}
}
