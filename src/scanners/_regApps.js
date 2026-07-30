const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UNINSTALL_KEYS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

function regQueryAll(keys) {
  let out = '';
  for (const key of keys) {
    try {
      out += execFileSync('reg', ['query', key, '/s'], {
        encoding: 'utf8', maxBuffer: 30 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {}
  }
  return out;
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
function scanByPublisher(publisherRe, excludeNameRe) {
  const out = regQueryAll(UNINSTALL_KEYS);
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
