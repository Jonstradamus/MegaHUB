const fs = require('fs');
const path = require('path');
const { regQuery } = require('../util/regQuery');

const UNINSTALL_KEYS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

async function regQueryAll(keys) {
  let out = '';
  for (const key of keys) out += await regQuery(key);
  return out;
}

// ubisoft.js, ea.js y rockstar.js llaman a scanByPublisher() cada uno por su
// cuenta — sin este caché, cada scan-games disparaba el mismo dump completo
// de las 3 claves de Uninstall TRES veces seguidas (uno por publisher), el
// triple del trabajo necesario. TTL corto: solo cubre un mismo ciclo de
// escaneo, nunca sirve datos viejos entre escaneos reales.
let cachedDump = null;
let cachedAt = 0;
const CACHE_MS = 5000;
async function getUninstallDump() {
  if (cachedDump !== null && Date.now() - cachedAt < CACHE_MS) return cachedDump;
  cachedDump = await regQueryAll(UNINSTALL_KEYS);
  cachedAt = Date.now();
  return cachedDump;
}

function parseUninstallBlocks(out) {
  return out.split(/(?=HKEY_(?:LOCAL_MACHINE|CURRENT_USER)\\)/).filter(b => b.trim());
}

function field(block, name) {
  const m = block.match(new RegExp(name + '\\s+REG_(?:SZ|EXPAND_SZ)\\s+(.+)'));
  return m ? m[1].trim() : null;
}

// EstimatedSize viene en KB (REG_DWORD, casi todo desinstalador de Windows lo
// declara) — mucho más barato que recorrer la carpeta de instalación a mano.
function estimatedSizeBytes(block) {
  const m = block.match(/EstimatedSize\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
  return m ? parseInt(m[1], 16) * 1024 : null;
}

function resolveExe(block) {
  const icon = field(block, 'DisplayIcon');
  const loc = field(block, 'InstallLocation');
  if (icon) {
    const exe = icon.split(',')[0].trim().replace(/^"|"$/g, '');
    if (exe.toLowerCase().endsWith('.exe') && fs.existsSync(exe)) return exe;
  }
  if (loc && fs.existsSync(loc)) {
    try {
      const exes = fs.readdirSync(loc).filter(f => f.toLowerCase().endsWith('.exe'));
      if (exes.length === 1) return path.join(loc, exes[0]);
    } catch {}
  }
  return null;
}

// Escanea el registro de programas instalados y filtra por publisher/nombre.
// No invasivo: solo lectura del registro estándar de Windows.
async function scanByPublisher(publisherRe, excludeNameRe) {
  const out = await getUninstallDump();
  const games = [];
  const seen = new Set();
  for (const block of parseUninstallBlocks(out)) {
    const publisher = field(block, 'Publisher') || '';
    const name = field(block, 'DisplayName');
    if (!name || !publisherRe.test(publisher)) continue;
    if (excludeNameRe && excludeNameRe.test(name)) continue;
    if (seen.has(name)) continue;
    const exePath = resolveExe(block);
    if (!exePath) continue;
    seen.add(name);
    games.push({ title: name, exePath, workDir: path.dirname(exePath), installSizeBytes: estimatedSizeBytes(block) });
  }
  return games;
}

module.exports = { scanByPublisher };
