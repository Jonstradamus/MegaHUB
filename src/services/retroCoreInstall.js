// Instalación de cores de RetroArch — fuente verificada en vivo:
// buildbot.libretro.com aloja el mismo build nightly que usa el "Actualizador
// en línea" de RetroArch, con una URL estable y predecible por core. Sin key.
//
// Mismo límite de seguridad que la descarga de emuladores standalone: SIEMPRE
// requiere confirmación explícita del usuario antes de descargar, y lo único
// que se "ejecuta" es Expand-Archive de PowerShell (descompresión, no código).
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

// id de consola (CONSOLE_REGISTRY) -> nombre del core en libretro.
const CORE_MAP = {
  nes: 'mesen',
  sms: 'genesis_plus_gx',
  genesis: 'genesis_plus_gx',
  gb: 'sameboy',
  snes: 'snes9x',
  gamegear: 'genesis_plus_gx',
  segacd: 'genesis_plus_gx',
  psx: 'swanstation',
  saturn: 'mednafen_saturn',
  gbc: 'sameboy',
  dreamcast: 'flycast',
  naomi: 'flycast', // mismo core que Dreamcast — Flycast también emula NAOMI/Atomiswave
  gba: 'mgba',
  nds: 'melonds',
  psp: 'ppsspp',
  arcade: 'fbneo',
  neogeo: 'fbneo',
  pcengine: 'mednafen_pce_fast',
  atari2600: 'stella',
  n64: 'mupen64plus_next',
  n3ds: 'azahar',
  intellivision: 'freeintv',
  atari5200: 'a5200',
  colecovision: 'gearcoleco',
  vectrex: 'vecx',
  msx: 'bluemsx',
  atari7800: 'prosystem',
  atarilynx: 'handy',
  threedo: 'opera',
  atarijaguar: 'virtualjaguar',
  virtualboy: 'mednafen_vb',
  ngp: 'mednafen_ngp',
  wonderswan: 'mednafen_wswan',
};

function coreDownloadUrl(coreName) {
  return `https://buildbot.libretro.com/nightly/windows/x86_64/latest/${coreName}_libretro.dll.zip`;
}

function coreDllPath(retroarchDir, coreName) {
  return path.join(retroarchDir, 'cores', `${coreName}_libretro.dll`);
}

async function getCoreInfo(consoleId, retroarchDir) {
  const coreName = CORE_MAP[consoleId];
  if (!coreName) return null;
  const url = coreDownloadUrl(coreName);
  let sizeMb = null;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return null;
    const size = Number(res.headers.get('content-length') || 0);
    sizeMb = Math.round((size / 1024 / 1024) * 10) / 10;
  } catch {
    return null;
  }
  const installed = retroarchDir ? fs.existsSync(coreDllPath(retroarchDir, coreName)) : false;
  return { coreName, url, sizeMb, installed };
}

async function installCore(consoleId, retroarchDir) {
  const coreName = CORE_MAP[consoleId];
  if (!coreName) throw new Error('Esta consola no usa un core de RetroArch');
  const url = coreDownloadUrl(coreName);
  const coresDir = path.join(retroarchDir, 'cores');
  fs.mkdirSync(coresDir, { recursive: true });
  const zipPath = path.join(coresDir, `${coreName}_libretro.dll.zip`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(zipPath));

  await new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${coresDir}" -Force`,
    ], (err) => (err ? reject(err) : resolve()));
  });
  fs.unlinkSync(zipPath);

  const dllPath = coreDllPath(retroarchDir, coreName);
  return { coreName, installed: fs.existsSync(dllPath), coresDir };
}

// "Archivos de sistema" del core (distinto de una BIOS con copyright): assets
// propios y libres que el core necesita para funcionar del todo (fuentes de
// reemplazo, shaders, hiscore.dat...). Es EXACTAMENTE lo mismo que descarga el
// "Actualizador en línea > Descargador de archivos de sistema" de RetroArch —
// mismo origen oficial (buildbot.libretro.com/assets/system/), solo que aquí
// se dispara con un botón en vez de tener que ir al menú de RetroArch.
const CORE_SYSTEM_FILES = {
  psp: { zipName: 'PPSSPP.zip', markerFile: path.join('PPSSPP', 'flash0', 'font', 'ltn0.pgf') },
  arcade: { zipName: 'FinalBurn Neo (hiscore).zip', markerFile: path.join('fbneo', 'hiscore.dat') },
  neogeo: { zipName: 'FinalBurn Neo (hiscore).zip', markerFile: path.join('fbneo', 'hiscore.dat') },
};

function systemFilesUrl(zipName) {
  return `https://buildbot.libretro.com/assets/system/${encodeURIComponent(zipName)}`;
}

async function getCoreSystemFilesInfo(consoleId, retroarchDir) {
  const entry = CORE_SYSTEM_FILES[consoleId];
  if (!entry) return null;
  const url = systemFilesUrl(entry.zipName);
  let sizeMb = null;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return null;
    const size = Number(res.headers.get('content-length') || 0);
    sizeMb = Math.round((size / 1024 / 1024) * 10) / 10;
  } catch {
    return null;
  }
  const installed = retroarchDir ? fs.existsSync(path.join(retroarchDir, 'system', entry.markerFile)) : false;
  return { zipName: entry.zipName, url, sizeMb, installed };
}

async function installCoreSystemFiles(consoleId, retroarchDir) {
  const entry = CORE_SYSTEM_FILES[consoleId];
  if (!entry) throw new Error('Esta consola no tiene archivos de sistema descargables');
  const url = systemFilesUrl(entry.zipName);
  const systemDir = path.join(retroarchDir, 'system');
  fs.mkdirSync(systemDir, { recursive: true });
  const zipPath = path.join(systemDir, entry.zipName);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(zipPath));

  await new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${systemDir}" -Force`,
    ], (err) => (err ? reject(err) : resolve()));
  });
  fs.unlinkSync(zipPath);

  return { zipName: entry.zipName, installed: fs.existsSync(path.join(systemDir, entry.markerFile)), systemDir };
}

module.exports = {
  CORE_MAP, getCoreInfo, installCore, coreDllPath,
  CORE_SYSTEM_FILES, getCoreSystemFilesInfo, installCoreSystemFiles,
};
