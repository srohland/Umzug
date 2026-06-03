import { state } from '../state.js';
import { esc, sanitizeBox, toast } from '../helpers.js';
import { COLORS, USERS } from '../constants.js';
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
  const bc = state.boxes.length;
  const ic = state.boxes.reduce((s, b) => s + (b.items?.length || 0), 0);
  const uOpts = USERS.map(u => `<option${state.currentUser === u ? ' selected' : ''}>${u}</option>`).join('');
  document.getElementById('content').innerHTML = `<div class="scroll-area">
    ${installSection()}

    <div class="sec">Aktiver Nutzer</div>
    <div class="card">
      <div class="fg" style="margin-bottom:10px">
        <label>Ich bin</label>
        <select onchange="setCurrentUser(this.value)">${uOpts}</select>
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
      <div class="fg">
        <label>Google OAuth Client-ID</label>
        <input type="text" id="gcid" value="${esc(state.gClientId)}" placeholder="….apps.googleusercontent.com"
          oninput="state_setGClientId(this.value)" style="font-size:13px">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-s" style="flex:1" onclick="saveGClientId()">💾 Speichern</button>
        <button class="btn btn-p" style="flex:1" onclick="connectGDrive()">${state.gToken ? '✅ Verbunden' : '🔑 Anmelden'}</button>
      </div>
      <p style="font-size:12px;color:var(--muted);font-weight:500;line-height:1.6">
        Fotos werden automatisch nach <code style="background:var(--bg);padding:1px 5px;border-radius:4px">UmzugsBox/{Karton}/{item}.jpg</code> hochgeladen.<br>
        Andere Nutzer sehen das Thumbnail sofort nach dem Sync. Vollbild wird bei Bedarf aus Drive geladen und lokal gecacht.<br><br>
        Setup: <a href="https://console.cloud.google.com" target="_blank" style="color:var(--primary)">Google Cloud Console</a> → Projekt → Drive API aktivieren → OAuth Client-ID erstellen (Webanwendung) → Herkunft <code style="background:var(--bg);padding:1px 5px;border-radius:4px">${location.origin}</code> hinzufügen.
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

    <div class="sec">Farbcode-Legende</div>
    <div class="card">
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px;font-weight:500">Jede Farbe entspricht einem Abstellbereich im Zielort. Drucke diese Legende für Umzugshelfer aus.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${COLORS.map(c => `<div class="legend-item">
          <div class="legend-dot" style="background:${c.hex}"></div>
          <span style="font-size:13px;font-weight:700">${c.name}</span>
        </div>`).join('')}
      </div>
      <button class="btn btn-s btn-w no-print" onclick="printLegend()" style="margin-top:12px">🖨️ Legende drucken</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}

export function setCurrentUser(v) { state.currentUser = v; saveSettings(); }
export function state_setGClientId(v) { state.gClientId = v; }
export function state_setScriptUrl(v) { state.scriptUrl = v; }
export async function saveGClientId() { await saveSettings(); toast('✅ Gespeichert'); }
export async function saveScriptUrl() { await saveSettings(); toast('✅ URL gespeichert'); window.render?.(); }
export async function connectGDrive() { if (await ensureGToken()) window.render?.(); }

export function exportJSON() {
  const data = JSON.stringify({ version: 2, exported: new Date().toISOString(), exportedBy: state.currentUser, boxes: state.boxes }, null, 2);
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
        if (safe && !state.boxes.find(x => x.id === safe.id)) { state.boxes.push(safe); added++; }
      });
      await saveBoxes();
      toast(`✅ ${added} neue Karton${added !== 1 ? 's' : ''} importiert`);
      if (state.view === 'settings') window.render?.();
      else window.navigate?.('list');
    } catch(err) { toast('❌ Importfehler: ' + err.message); }
  };
  fr.readAsText(file);
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
    ${COLORS.map(c => `<div class="item"><div class="dot" style="background:${c.hex}"></div><div class="name">${c.name}</div></div>`).join('')}
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
