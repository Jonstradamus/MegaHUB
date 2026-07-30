// Lector del espejo de estado que escribe DERIVA Companion (dirección
// inversa de derivaBridge.js) — ver companion-desktop/lib/megahubStatusWriter.js.
// Archivo aparte de status.json a propósito (evita que dos procesos escriban
// el mismo archivo sin lock). Si Companion no está instalado o no corre,
// este archivo simplemente no existe o queda viejo — MegaHUB sigue
// funcionando exactamente igual, la pill solo se oculta/marca desconectada.
const fs = require('fs');
const path = require('path');
const os = require('os');

const BRIDGE_DIR   = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'DerivaMegaHUB');
const STATUS_FILE  = path.join(BRIDGE_DIR, 'companion-status.json');
const COMMAND_FILE = path.join(BRIDGE_DIR, 'companion-cmd.json');

// Companion escribe en cada poll (ver POLL_INTERVAL_MS en su config, ~30-60s)
// — más de 2 minutos sin actualizar significa que el proceso ya no corre
// (cerrado, no solo "pausado"), no que la radio dejó de sonar.
const STALE_MS = 2 * 60 * 1000;

function getCompanionStatus() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    if (!raw?.updatedAt || Date.now() - new Date(raw.updatedAt).getTime() > STALE_MS) {
      return { connected: false, radio: null };
    }
    return { connected: true, radio: raw.radio || null };
  } catch {
    return { connected: false, radio: null };
  }
}

// cmd: 'toggle'|'next'|'prev'|'volume'|'mute'|'genre'|'random'|'save'|'like'
// (mismo vocabulario que ya acepta sendRadioCommand en la web, ver
// src/services/radioController.js) — Companion lo consume y lo borra en su
// siguiente poll (ver consumeCommand() del lado de Companion). value: opcional
// (0-100 para volumen, id de género para 'genre').
function sendCommand(cmd, value) {
  try {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
    fs.writeFileSync(COMMAND_FILE, JSON.stringify({ cmd, value, requestedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { getCompanionStatus, sendCommand };
