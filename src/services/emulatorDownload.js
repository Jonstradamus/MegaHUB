// Descarga automática de emulador — SOLO para las consolas donde existe una
// fuente programable y verificada (GitHub Releases con un asset portable real
// para Windows, sin instalador). El resto usa únicamente el enlace a la
// página oficial.
//
// Al ser todas builds "portable" (zip/7z/rar sin instalador), MegaHUB puede
// descargar + descomprimir + dejar listo el ejecutable dentro de su propia
// carpeta emulators/<consola>/, y detectar si ya está ahí — el usuario no
// tiene que ir emulador por emulador. Sigue habiendo un límite de seguridad
// deliberado: la descarga SIEMPRE requiere confirmación explícita en el
// renderer (nombre/origen/tamaño antes de bajar nada), y MegaHUB NUNCA
// ejecuta el archivo descargado más allá de descomprimirlo — nada de
// instaladores .exe silenciosos.
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const retroFolders = require('./retroFolders');
const archiveExtract = require('./archiveExtract');

const DOWNLOAD_SOURCES = {
  xbox: {
    repo: 'xemu-project/xemu',
    pick: (assets) => assets.find(a => /^xemu-win-x86_64-release\.zip$/i.test(a.name)),
    exeMatch: (name) => /^xemu\.exe$/i.test(name),
  },
  ps2: {
    // Build "Qt" portable sin instalador (no la del .exe con instalador) —
    // así se puede descomprimir y dejar lista sin ejecutar nada.
    repo: 'PCSX2/pcsx2',
    pick: (assets) => assets.find(a => /^pcsx2-.*-windows-x64-Qt\.7z$/i.test(a.name)),
    exeMatch: (name) => /^pcsx2(-qt)?\.exe$/i.test(name),
  },
  xbox360: {
    repo: 'xenia-canary/xenia-canary',
    pick: (assets) => assets.find(a => /windows\.7z$/i.test(a.name)),
    exeMatch: (name) => /^xenia.*\.exe$/i.test(name),
  },
  ps3: {
    // RPCS3 no publica sus builds en RPCS3/rpcs3 sino en un repo satélite
    // solo de binarios — verificado en vivo (rpcs3.net/latest-windows
    // redirige justo ahí). Build portable .7z, sin instalador.
    repo: 'RPCS3/rpcs3-binaries-win',
    pick: (assets) => assets.find(a => /^rpcs3-.*_win64_msvc\.7z$/i.test(a.name)),
    exeMatch: (name) => /^rpcs3\.exe$/i.test(name),
  },
  // Dolphin (GameCube/Wii) SÍ es portable, pero su web oficial está detrás de
  // un challenge anti-bot que bloquea la descarga automática (ver LEEME) — así
  // que estas dos entradas solo sirven para DETECTAR una instalación existente
  // (vía el "ubicador"), sin repo/pick no hay descarga automática posible.
  gamecube: { exeMatch: (name) => /^dolphin\.exe$/i.test(name) },
  wii: { exeMatch: (name) => /^dolphin\.exe$/i.test(name) },
};

async function getDownloadInfo(consoleId) {
  const src = DOWNLOAD_SOURCES[consoleId];
  if (!src || !src.repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${src.repo}/releases/latest`);
    if (!res.ok) return null;
    const json = await res.json();
    const asset = src.pick(json.assets || []);
    if (!asset) return null;
    return {
      name: asset.name,
      url: asset.browser_download_url,
      sizeMb: Math.round((asset.size / 1024 / 1024) * 10) / 10,
      version: json.tag_name,
      repo: src.repo,
    };
  } catch {
    return null;
  }
}

// Busca el ejecutable ya instalado dentro de emulators/<consola>/ (raíz y un
// nivel de subcarpeta, por si el .zip/.7z trae todo dentro de una carpeta).
function findInstalledExe(consoleId, emuDir) {
  const src = DOWNLOAD_SOURCES[consoleId];
  if (!src || !fs.existsSync(emuDir)) return null;
  const search = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      if (e.isFile() && src.exeMatch(e.name)) return path.join(dir, e.name);
    }
    if (depth > 0) {
      for (const e of entries) {
        if (e.isDirectory()) {
          const found = search(path.join(dir, e.name), depth - 1);
          if (found) return found;
        }
      }
    }
    return null;
  };
  return search(emuDir, 1);
}

async function getEmulatorStatus(consoleId, consoleName, emulatorName) {
  const src = DOWNLOAD_SOURCES[consoleId];
  if (!src) return null;
  const { emuDir } = retroFolders.ensureConsoleFolders(consoleId, consoleName, emulatorName);
  const exePath = findInstalledExe(consoleId, emuDir);
  return { installed: !!exePath, exePath, emuDir };
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
}

// Se llama SOLO después de que el renderer ya mostró la confirmación al usuario.
async function downloadEmulator(consoleId, consoleName, emulatorName) {
  const info = await getDownloadInfo(consoleId);
  if (!info) throw new Error('Sin fuente de descarga automática para esta consola');
  const { emuDir } = retroFolders.ensureConsoleFolders(consoleId, consoleName, emulatorName);
  const destPath = path.join(emuDir, info.name);
  await downloadFile(info.url, destPath);

  if (archiveExtract.isSupportedArchive(info.name)) await archiveExtract.extractArchive(destPath, emuDir);
  fs.unlinkSync(destPath);

  const exePath = findInstalledExe(consoleId, emuDir);
  return { fileName: info.name, installed: !!exePath, exePath, emuDir };
}

module.exports = { getDownloadInfo, downloadEmulator, getEmulatorStatus, DOWNLOAD_SOURCES };
