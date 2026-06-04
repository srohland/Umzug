import { state } from '../state.js';
import { esc, activeBoxes, getRooms, sanitizeBox, toast } from '../helpers.js';
import { COLORS, ROOMS } from '../constants.js';
import { ensureGToken } from '../drive.js';
import { saveSettings, saveBoxes } from '../storage.js';
import { driveSync } from '../sync.js';
import { ensureGToken } from '../drive.js';

function installSection() {
  const canInstall = !!window.__pwaPrompt;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) return `
    <div class="sec">App</div>
    <div class="card" style="display:flex;align-items:center;gap:12px">
      <span style="font-size:28px">✅</span>
      <span style="font-size:14px;font-weight:600;color:var(--ink2)">UmzugsBox ist als App installiert.</span>
    </div>`;

  if (canInstall) return `
    <div class="sec">App installieren</div>
    <div class="card">
      <p style="font-size:14px;color:var(--ink2);font-weight:500;margin-bottom:14px;line-height:1.5">
        Installiere UmzugsBox direkt auf dem Homescreen – ohne App Store, funktioniert auch offline.
      </p>
      <button class="btn btn-p btn-w" onclick="installPWA()">📲 Jetzt installieren</button>
    </div>`;

  if (isIOS) return `
    <div class="sec">App installieren</div>
    <div class="card">
      <p style="font-size:14px;color:var(--ink2);font-weight:500;line-height:1.6">
        Auf iOS: Teilen-Symbol <strong>□↑</strong> antippen → <strong>„Zum Home-Bildschirm"</strong> wählen.
      </p>
    </div>`;

  return '';
}

export function renderSettings() {
  document.getElementById('hdr-title').textContent = '⚙️ Einstellungen';
  document.getElementById('hdr-actions').innerHTML = '';
  const boxes = activeBoxes();
  const bc = boxes.length;
  const ic = boxes.reduce((s, b) => s + (b.items?.length || 0), 0);
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    ${installSection()}

    <div class="sec">Aktiver Nutzer</div>
    <div class="card">
      <div class="fg" style="margin-bottom:10px">
        <label>Ich bin</label>
        <input type="text" value="${esc(state.currentUser)}" placeholder="Dein Name…"
          onchange="setCurrentUser(this.value)">
      </div>
      <p style="font-size:13px;color:var(--muted);font-weight:500">Wird bei Bearbeitungen vermerkt.</p>
    </div>

    <div class="sec">Statistik</div>
    <div class="card">
      <div class="stat-grid">
        <div><div class="stat-val">${bc}</div><div class="stat-lbl">Kartons</div></div>
        <div><div class="stat-val">${ic}</div><div class="stat-lbl">Gegenstände</div></div>
      </div>
    </div>

    <div class="sec">Daten sichern & teilen</div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-s btn-w" onclick="exportJSON()">⬇️ Als JSON exportieren</button>
      <label class="btn btn-s btn-w" style="cursor:pointer">
        ⬆️ JSON importieren (zusammenführen)
        <input type="file" accept=".json" onchange="importJSON(this)" style="display:none">
      </label>
      <p style="font-size:12px;color:var(--muted);font-weight:500">Exportiere und teile die Datei mit anderen Nutzern, um Daten zu synchronisieren.</p>
    </div>

    <div class="sec">📸 Google Drive (Fotos)</div>
    <div class="card">
      <div class="fg" style="margin-bottom:12px">
        <label>Service Account JSON</label>
        ${state.serviceAccountJson
          ? `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:8px;border:1.5px solid var(--border)">
               <span style="font-size:18px">✅</span>
               <span style="font-size:12px;color:var(--ink2);font-weight:600;word-break:break-all">${esc(state.serviceAccountJson.client_email)}</span>
               <button class="btn btn-d" style="padding:4px 10px;font-size:12px;margin-left:auto;flex-shrink:0" onclick="clearServiceAccount()">✕</button>
             </div>`
          : `<label class="btn btn-s btn-w" style="cursor:pointer;margin-top:4px">
               📂 JSON-Datei laden
               <input type="file" accept=".json,application/json" onchange="loadServiceAccountFile(this)" style="display:none">
             </label>`}
      </div>
      <div class="fg">
        <label>Freigegebene Ordner-ID</label>
        <input type="text" value="${esc(state.rootFolderId || '')}" placeholder="1ABC…xyz"
          style="font-size:13px;font-family:monospace"
          onchange="saveRootFolderId(this.value.trim())">
      </div>
      ${state.serviceAccountJson && state.rootFolderId
        ? `<button class="btn btn-p btn-w" onclick="testDriveConnection()">🔗 Verbindung testen</button>`
        : ''}
      <p style="font-size:12px;color:var(--muted);font-weight:500;line-height:1.6;margin-top:12px">
        Fotos werden automatisch in den freigegebenen Drive-Ordner hochgeladen und sind für alle Nutzer sichtbar.
      </p>
    </div>

    <div class="sec">☁️ Metadaten-Sync (Apps Script)</div>
    <div class="card">
      <div class="fg">
        <label>Apps Script URL</label>
        <input type="url" id="surl" value="${esc(state.scriptUrl)}" placeholder="https://script.google.com/macros/s/…/exec"
          oninput="state_setScriptUrl(this.value)" style="font-size:13px">
      </div>
      ${state.lastSync ? `<div style="font-size:12px;color:var(--muted);font-weight:500;margin-bottom:12px">Letzter Sync: ${new Date(state.lastSync).toLocaleString('de-DE')}</div>` : ''}
      <div style="display:flex;gap:8px">
        <button class="btn btn-s" style="flex:1" onclick="saveScriptUrl()">💾 Speichern</button>
        <button class="btn btn-p" style="flex:1" onclick="driveSync()" ${!state.scriptUrl ? 'disabled' : ''}>🔄 Jetzt sync</button>
      </div>
      <details style="margin-top:14px">
        <summary style="font-size:13px;font-weight:700;cursor:pointer;color:var(--primary)">📋 Einrichtung anzeigen</summary>
        <div style="margin-top:12px;font-size:13px;color:var(--ink2);line-height:1.7">
          <b>Einmalig einrichten (5 Minuten):</b><br>
          1. <a href="https://script.google.com" target="_blank" style="color:var(--primary)">script.google.com</a> öffnen<br>
          2. „Neues Projekt" klicken<br>
          3. Gesamten Code aus der <code style="background:var(--bg);padding:1px 5px;border-radius:4px">umzugsbox-script.gs</code> Datei einfügen<br>
          4. Oben auf „Bereitstellen" → „Neue Bereitstellung"<br>
          5. Typ: <b>Web-App</b> · Ausführen als: <b>Ich</b> · Zugriff: <b>Jeder</b><br>
          6. „Bereitstellen" → URL kopieren → hier einfügen
        </div>
      </details>
    </div>

    <div class="sec">Farbauswahl</div>
    <div class="card">
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;font-weight:500">Welche Farben sollen bei der Karton-Erstellung zur Verfügung stehen?</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${COLORS.map(c => {
          const enabled = !state.disabledColorIds.includes(c.id);
          const tickColor = ['gelb', 'weiss'].includes(c.id) ? '#1e293b' : '#fff';
          return `<div onclick="toggleColor('${c.id}')" style="display:flex;align-items:center;gap:9px;padding:8px;border-radius:9px;cursor:pointer;border:2px solid ${enabled ? c.hex : 'var(--border)'};opacity:${enabled ? '1' : '0.45'}">
            <div style="width:22px;height:22px;border-radius:5px;background:${c.hex};flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,.1)">
              ${enabled ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${tickColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </div>
            <span style="font-size:13px;font-weight:700;line-height:1.2">${c.name}</span>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-s btn-w no-print" onclick="printLegend()">🖨️ Legende drucken</button>
    </div>

    <div class="sec">Zimmer</div>
    <div class="card">
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;font-weight:500">Zimmer für die Herkunfts- und Zielauswahl.</p>
      ${getRooms().map((r, i, arr) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="flex:1;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r)}</span>
        <button class="btn btn-s" style="padding:4px 8px" onclick="moveRoom(${i},-1)"${i === 0 ? ' disabled' : ''}>↑</button>
        <button class="btn btn-s" style="padding:4px 8px" onclick="moveRoom(${i},1)"${i === arr.length - 1 ? ' disabled' : ''}>↓</button>
        <button class="btn btn-d" style="padding:4px 8px" onclick="removeRoom(${i})">✕</button>
      </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input type="text" id="new-room-input" placeholder="Neues Zimmer…" style="flex:1"
          onkeydown="if(event.key==='Enter')addRoom()">
        <button class="btn btn-p" onclick="addRoom()">+ Hinzufügen</button>
      </div>
      ${state.customRooms ? `<button class="btn btn-s btn-w" onclick="resetRooms()" style="margin-top:10px">Zurücksetzen auf Standard</button>` : ''}
    </div>
    <div style="height:20px"></div>
  </div>`;
}

export function setCurrentUser(v) { const t = v.trim(); if (t) { state.currentUser = t; saveSettings(); } }
export function state_setScriptUrl(v) { state.scriptUrl = v; }
export async function saveScriptUrl() { await saveSettings(); toast('✅ URL gespeichert'); window.render?.(); }

export async function loadServiceAccountFile(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!json.client_email || !json.private_key) throw new Error('Ungültige Service Account JSON');
    state.serviceAccountJson = json;
    state.gToken = null;
    state.gTokenExpiry = 0;
    await saveSettings();
    toast('✅ Service Account geladen');
    window.render?.();
  } catch(e) { toast('❌ ' + e.message); }
}

export async function clearServiceAccount() {
  state.serviceAccountJson = null;
  state.gToken = null;
  state.gTokenExpiry = 0;
  await saveSettings();
  window.render?.();
}

export async function saveRootFolderId(v) {
  state.rootFolderId = v || null;
  await saveSettings();
  toast('✅ Ordner-ID gespeichert');
  window.render?.();
}

export async function testDriveConnection() {
  toast('⏳ Verbinde…', 5000);
  const ok = await ensureGToken();
  if (!ok) return;
  try {
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files/${state.rootFolderId}?fields=name`,
      { headers: { Authorization: 'Bearer ' + state.gToken } }
    );
    const d = await r.json();
    if (d.name) toast(`✅ Verbunden mit Ordner „${d.name}"`);
    else throw new Error(d.error?.message || 'Ordner nicht gefunden');
  } catch(e) { toast('❌ ' + e.message); }
}

export function exportJSON() {
  const data = JSON.stringify({ version: 2, exported: new Date().toISOString(), exportedBy: state.currentUser, boxes: activeBoxes() }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = `umzugsbox-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  toast('✅ Export abgeschlossen');
}

export function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = async e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!Array.isArray(d.boxes)) throw new Error('Ungültiges Format');
      let added = 0;
      d.boxes.forEach(b => {
        const safe = sanitizeBox(b);
        if (safe && !safe.deletedAt && !state.boxes.find(x => x.id === safe.id)) { state.boxes.push(safe); added++; }
      });
      await saveBoxes();
      toast(`✅ ${added} neue Karton${added !== 1 ? 's' : ''} importiert`);
      if (state.view === 'settings') window.render?.();
      else window.navigate?.('list');
    } catch(err) { toast('❌ Importfehler: ' + err.message); }
  };
  fr.readAsText(file);
}

export async function toggleColor(id) {
  const isDisabled = state.disabledColorIds.includes(id);
  if (isDisabled) {
    state.disabledColorIds = state.disabledColorIds.filter(x => x !== id);
  } else {
    const wouldRemain = COLORS.filter(c => c.id !== id && !state.disabledColorIds.includes(c.id));
    if (wouldRemain.length === 0) return;
    state.disabledColorIds = [...state.disabledColorIds, id];
  }
  await saveSettings();
  window.render?.();
}

export async function addRoom() {
  const input = document.getElementById('new-room-input');
  const name = input?.value.trim();
  if (!name) return;
  const rooms = [...getRooms()];
  if (!rooms.includes(name)) rooms.push(name);
  state.customRooms = rooms;
  await saveSettings();
  window.render?.();
}

export async function removeRoom(idx) {
  const rooms = [...getRooms()];
  rooms.splice(idx, 1);
  state.customRooms = rooms;
  await saveSettings();
  window.render?.();
}

export async function moveRoom(idx, dir) {
  const rooms = [...getRooms()];
  const target = idx + dir;
  if (target < 0 || target >= rooms.length) return;
  [rooms[idx], rooms[target]] = [rooms[target], rooms[idx]];
  state.customRooms = rooms;
  await saveSettings();
  window.render?.();
}

export async function resetRooms() {
  state.customRooms = null;
  await saveSettings();
  window.render?.();
}

export function printLegend() {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Farbcode-Legende</title>
    <style>body{font-family:sans-serif;padding:30px;max-width:400px}h1{font-size:20px;margin-bottom:20px}
    .item{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #eee;border-radius:8px;margin-bottom:8px}
    .dot{width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,.1);flex-shrink:0}
    .name{font-size:16px;font-weight:700}</style></head><body>
    <h1>📦 UmzugsBox – Farbcode-Legende</h1>
    <p style="margin-bottom:16px;color:#666">Bitte Karton in den Bereich der entsprechenden Farbe stellen:</p>
    ${COLORS.map(c => `<div class="item"><div class="dot" style="background:${c.hex}"></div><div class="name">${state.customColorNames?.[c.id] || c.name}</div></div>`).join('')}
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
