const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');
const { pathSize } = require('../services/installSize');

const CANDIDATE_EXES = [
  'C:\\RetroArch-Win64\\retroarch.exe',
  'C:\\RetroArch\\retroarch.exe',
  'C:\\Program Files\\RetroArch-Win64\\retroarch.exe',
  'C:\\Program Files\\RetroArch\\retroarch.exe',
  'C:\\Program Files (x86)\\RetroArch\\retroarch.exe',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RetroArch\\retroarch.exe',
  path.join(os.homedir(), 'AppData\\Local\\Programs\\RetroArch\\retroarch.exe'),
  path.join(os.homedir(), 'AppData\\Roaming\\RetroArch\\retroarch.exe'),
];

// Además de las rutas típicas, RetroArch registra un acceso directo del menú
// inicio con el instalador oficial — lo resolvemos por si el usuario lo puso
// en una carpeta personalizada.
function findViaStartMenuShortcut() {
  const dirs = [
    'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\RetroArch\\RetroArch.lnk',
    path.join(os.homedir(), 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\RetroArch\\RetroArch.lnk'),
  ];
  for (const lnkPath of dirs) {
    if (!fs.existsSync(lnkPath)) continue;
    try {
      const out = execFileSync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(New-Object -ComObject WScript.Shell).CreateShortcut('${lnkPath}').TargetPath`,
      ], { encoding: 'utf8' }).trim();
      if (out && fs.existsSync(out)) return out;
    } catch {}
  }
  return null;
}

function findRetroArch() {
  for (const p of CANDIDATE_EXES) if (fs.existsSync(p)) return p;
  return findViaStartMenuShortcut();
}

function findPlaylistsDir(exePath) {
  const nearby = path.join(path.dirname(exePath), 'playlists');
  if (fs.existsSync(nearby)) return nearby;
  const appdata = path.join(os.homedir(), 'AppData\\Roaming\\RetroArch\\playlists');
  if (fs.existsSync(appdata)) return appdata;
  return null;
}

// Lee las playlists (.lpl) de RetroArch: cada una es un sistema/consola,
// cada item es una ROM ya indexada por el propio RetroArch.
module.exports = async function scanRetroArch() {
  const exe = findRetroArch();
  if (!exe) return [];
  const dir = findPlaylistsDir(exe);
  if (!dir) return [];
  const games = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.lpl'))) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }
    const system = file.replace(/\.lpl$/, '');
    for (const item of data.items || []) {
      if (!item.path || !item.label) continue;
      // Casi siempre un archivo suelto (stat es instantáneo); en las pocas
      // consolas con ROM-como-carpeta (PS3/PSP), pathSize suma el contenido.
      const sizeBytes = await pathSize(item.path);
      games.push({
        id: `retro-${system}-${item.label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: item.label,
        platform: 'retroarch', installed: true,
        genre: system,
        system, romPath: item.path, corePath: item.core_path || null,
        retroarchExe: exe,
        coverUrl: null,
        sizeBytes,
      });
    }
  }
  return games;
};

module.exports.findRetroArch = findRetroArch;

module.exports.launch = function launchRetro(game) {
  const args = [];
  if (game.corePath && game.corePath !== 'DETECT') args.push('-L', game.corePath);
  args.push(game.romPath);
  spawn(game.retroarchExe, args, { detached: true, stdio: 'ignore' }).unref();
};
