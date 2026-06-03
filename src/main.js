import './style.css';
import { loadData } from './storage.js';
import { driveSync, scheduleSync } from './sync.js';
import { navigate, goBack, render } from './navigation.js';
import { state } from './state.js';

// Photo actions
import {
  handlePhotoInput, openPhotoModal, closePhotoModal,
  deleteModalPhoto, loadModalFromDrive,
} from './photo.js';

// Box form actions
import {
  startEditBox, pickColor, removeBoxPhoto,
  tempBoxSetName, tempBoxSetSource, tempBoxSetDest,
  saveBox, delBox, quickItemPhoto,
} from './views/boxForm.js';

// Item form actions
import {
  adjQty, saveItem, delItem,
  tempItemRemovePhoto, tempItemSetName, tempItemSetQty, tempItemSetNotes,
} from './views/itemForm.js';

// Search
import { runItemSearch } from './views/search.js';

// Scanner
import { doSearch } from './views/scanner.js';

// Settings
import {
  exportJSON, importJSON, saveScriptUrl, printLegend,
  setCurrentUser, state_setGClientId, state_setScriptUrl,
  saveGClientId, connectGDrive,
  toggleColor,
  addRoom, removeRoom, moveRoom, resetRooms,
} from './views/settings.js';

import { ensureGToken } from './drive.js';
import { saveSettings } from './storage.js';
import { toast } from './helpers.js';

// Expose all functions called from inline onclick handlers
Object.assign(window, {
  // Navigation
  navigate, goBack,

  // Photo modal
  openPhotoModal, closePhotoModal, deleteModalPhoto, loadModalFromDrive,
  handlePhotoInput,

  // Box form
  startEditBox, pickColor, removeBoxPhoto,
  tempBoxSetName, tempBoxSetSource, tempBoxSetDest,
  saveBox, delBox, quickItemPhoto,

  // Item form
  adjQty, saveItem, delItem,
  tempItemRemovePhoto, tempItemSetName, tempItemSetQty, tempItemSetNotes,

  // Search
  runItemSearch,

  // Scanner
  doSearch,

  // Settings
  exportJSON, importJSON, saveScriptUrl, printLegend,
  setCurrentUser, state_setGClientId, state_setScriptUrl,
  saveGClientId, connectGDrive,
  toggleColor,
  addRoom, removeRoom, moveRoom, resetRooms,
  driveSync,
  saveSettings,
  ensureGToken,
});

// Cross-module bridges (used via window.* inside modules to avoid circular imports)
window.render = render;
window.navigate = navigate;
window.scheduleSync = scheduleSync;

// ── PWA Install Prompt ──────────────────────────────────────────────────────
window.__pwaPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.__pwaPrompt = e;
  if (state.view === 'settings') render();
});

window.addEventListener('appinstalled', () => {
  window.__pwaPrompt = null;
  toast('✅ UmzugsBox wurde installiert!');
  if (state.view === 'settings') render();
});

window.installPWA = async () => {
  if (!window.__pwaPrompt) return;
  window.__pwaPrompt.prompt();
  const { outcome } = await window.__pwaPrompt.userChoice;
  if (outcome === 'accepted') window.__pwaPrompt = null;
  render();
};

// Boot
loadData().then(() => {
  render();
  if (state.scriptUrl) driveSync(true).catch(() => {});
  setInterval(() => {
    if (state.scriptUrl && !state.isSyncing) driveSync(true).catch(() => {});
  }, 5 * 60 * 1000);
});
