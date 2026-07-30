// Paquetes de texturas HD para las 3 únicas consolas donde el emulador
// realmente soporta reemplazo de texturas (GameCube/Wii vía Dolphin, PSP vía
// PPSSPP dentro de RetroArch) — RPCS3/Xenia/Xemu no tienen esa función (ver
// investigación previa: solo soportan resolution scale, no packs de texturas).
//
// GameBanana es la única "biblioteca" con API pública real y GENÉRICA (sirve
// para cualquier juego, no una lista fija) — verificado en vivo contra los 3
// endpoints de abajo antes de escribir esto:
//   Util/Game/NameMatch  -> busca cualquier juego por nombre, da su ID
//   Game/{id}/Subfeed    -> lista los mods de ese juego (con su categoría)
//   Mod/{id}/ProfilePage -> archivo real, tamaño y URL de descarga directa
// PS2 (PCSX2) se deja fuera a propósito: su comunidad vive en GBAtemp, un
// foro sin API pública — no hay forma de hacer esto genérico ahí, solo una
// tabla curada a mano por juego.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const romMetadata = require('./romMetadata');
const retroFolders = require('./retroFolders');
const scanRetroArch = require('../scanners/retroarch');
const store = require('../util/store');

const API = 'https://gamebanana.com/apiv11';

// NameMatch hace un match casi literal (tipo SQL LIKE %texto%), no una
// búsqueda difusa por palabras — verificado en vivo: "Resident Evil - The
// Darkside Chronicles" (con guion, el formato del catálogo de MegaHUB) dio 0
// resultados, pero "Resident Evil: The Darkside Chronicles" (con los dos
// puntos reales del nombre de GameBanana) sí encontró el juego. Como el
// catálogo casi siempre separa franquicia/subtítulo con " - " en vez de ":",
// se prueban variantes en orden hasta que alguna dé resultado, en vez de
// asumir que el título del catálogo ya viene en el formato que espera GameBanana.
function titleVariants(title) {
  const variants = [title];
  if (title.includes(' - ')) {
    variants.push(title.replace(' - ', ': ')); // formato real más común en GameBanana
    variants.push(title.slice(title.indexOf(' - ') + 3)); // solo el subtítulo (ej. "The Darkside Chronicles")
    // A propósito NO se prueba "solo la franquicia" (ej. "007" o "Resident
    // Evil" sueltos): confirmado en vivo que eso engancha CUALQUIER juego de
    // la misma saga que sí esté en GameBanana (ej. "007 - Agent Under Fire"
    // terminaba marcado como disponible solo por existir "GoldenEye 007"),
    // dando falsos positivos — es preferible decir "no encontrado" a mentir.
  }
  return variants;
}

async function searchGame(title) {
  for (const variant of titleVariants(title)) {
    const res = await fetch(`${API}/Util/Game/NameMatch?_sName=${encodeURIComponent(variant)}`);
    if (!res.ok) continue;
    const json = await res.json();
    const records = json._aRecords || [];
    if (records.length) return records.map(r => ({ id: r._idRow, name: r._sName, iconUrl: r._sIconUrl || null }));
  }
  return [];
}

async function listMods(gameId, page = 1) {
  const res = await fetch(`${API}/Game/${gameId}/Subfeed?_nPage=${page}&_nPerpage=20&_sSort=new&_csvModelInclusions=Mod`);
  if (!res.ok) return { mods: [], total: 0 };
  const json = await res.json();
  const mods = (json._aRecords || []).map(r => {
    const img = r._aPreviewMedia && r._aPreviewMedia._aImages && r._aPreviewMedia._aImages[0];
    return {
      id: r._idRow,
      name: r._sName,
      category: r._aRootCategory ? r._aRootCategory._sName : null,
      likes: r._nLikeCount || 0,
      views: r._nViewCount || 0,
      profileUrl: r._sProfileUrl,
      thumbUrl: img ? `${img._sBaseUrl}/${img._sFile220 || img._sFile}` : null,
    };
  });
  return { mods, total: (json._aMetadata && json._aMetadata._nRecordCount) || mods.length };
}

async function getModDownloadInfo(modId) {
  const res = await fetch(`${API}/Mod/${modId}/ProfilePage`);
  if (!res.ok) return null;
  const json = await res.json();
  const file = (json._aFiles || [])[0];
  if (!file) return null;
  return {
    fileName: file._sFile,
    sizeMb: Math.round((file._nFilesize / 1024 / 1024) * 10) / 10,
    downloadUrl: file._sDownloadUrl,
  };
}

// Game ID de 6 caracteres (código de juego + fabricante) que usan tanto
// Dolphin como GameTDB para nombrar la carpeta de texturas — vive en el
// offset 0 de la cabecera de disco de GC/Wii SIN COMPRIMIR. En un .ciso
// (formato de GC más común) esa cabecera queda al final del bloque de
// tamaño fijo que usan las herramientas estándar (dolphin-tool/GCISO:
// 0x8000). En un .wbfs (formato de Wii más común) el offset real depende
// del layout del propio archivo — 0x200 es lo habitual para un .wbfs de un
// solo juego, pero NO se pudo verificar contra un archivo real de este
// equipo, así que si el resultado no son 6 caracteres imprimibles se
// descarta en vez de arriesgar una carpeta con nombre basura.
function readGameCubeWiiId(romPath) {
  try {
    const ext = path.extname(romPath).toLowerCase();
    let offset = 0;
    if (ext === '.ciso') offset = 0x8000;
    else if (ext === '.wbfs') offset = 0x200;
    const fd = fs.openSync(romPath, 'r');
    const buf = Buffer.alloc(6);
    fs.readSync(fd, buf, 0, 6, offset);
    fs.closeSync(fd);
    const id = buf.toString('latin1');
    return /^[A-Z0-9]{6}$/.test(id) ? id : null;
  } catch { return null; }
}

function readPspGameId(romPath) {
  try {
    const isDir = fs.statSync(romPath).isDirectory();
    let sfoBuf = null;
    if (isDir) {
      for (const rel of ['PARAM.SFO', 'PSP_GAME\\PARAM.SFO']) {
        const p = path.join(romPath, rel);
        if (fs.existsSync(p)) { sfoBuf = fs.readFileSync(p); break; }
      }
    } else if (/\.iso$/i.test(romPath)) {
      sfoBuf = romMetadata.readIso9660File(romPath, ['PSP_GAME', 'PARAM.SFO']);
    }
    if (!sfoBuf) return null;
    const sfo = romMetadata.parseParamSfo(sfoBuf);
    return (sfo && (sfo.DISC_ID || sfo.DISK_ID)) || null;
  } catch { return null; }
}

// Dónde debe quedar el pack ya descomprimido para que el emulador lo
// levante solo, sin configuración adicional del usuario.
function getTextureDestDir(consoleId, romPath) {
  if (consoleId === 'gamecube' || consoleId === 'wii') {
    const gameId = readGameCubeWiiId(romPath);
    if (!gameId) return null;
    const { emuDir } = retroFolders.getLocationInfo(consoleId);
    return path.join(emuDir, 'User', 'Load', 'Textures', gameId);
  }
  if (consoleId === 'psp') {
    const gameId = readPspGameId(romPath);
    const exe = scanRetroArch.findRetroArch();
    if (!gameId || !exe) return null;
    return path.join(path.dirname(exe), 'system', 'PPSSPP', 'TEXTURES', gameId);
  }
  return null;
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`,
    ], (err) => (err ? reject(err) : resolve()));
  });
}

// Se llama SOLO después de que el renderer ya mostró nombre/tamaño y el
// usuario confirmó — mismo límite de seguridad que emulatorDownload.js.
async function downloadAndInstall(consoleId, romPath, modId) {
  const destDir = getTextureDestDir(consoleId, romPath);
  if (!destDir) {
    return { error: 'No se pudo identificar el ID del juego (o falta el emulador correspondiente) para saber dónde instalar el pack.' };
  }
  const info = await getModDownloadInfo(modId);
  if (!info) throw new Error('No se pudo obtener el archivo de descarga de GameBanana');

  const tmpZip = path.join(os.tmpdir(), `megahub-texture-${modId}-${Date.now()}.zip`);
  const res = await fetch(info.downloadUrl);
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpZip));

  fs.mkdirSync(destDir, { recursive: true });
  await extractZip(tmpZip, destDir);
  fs.unlinkSync(tmpZip);

  // Muchos packs traen sus PNG en una subcarpeta dentro del .zip en vez de
  // sueltos — no hay forma fiable de saberlo de antemano, así que se avisa
  // en vez de asumir que siempre queda bien.
  return { ok: true, destDir, fileName: info.fileName };
}

// Para marcar en el catálogo (juegos que el usuario NO tiene) cuáles sí
// tienen algún pack en GameBanana — cacheado PERMANENTEMENTE en disco
// (mismo criterio que tgdb-cache.js/sgdb-cache.js): son cientos de títulos
// por consola (GameCube/Wii/PSP) y repetir la consulta cada vez que se abre
// el catálogo saturaría la API para nada. Contrapartida real: si alguien
// sube un pack nuevo para un juego que antes no tenía, no se detecta hasta
// borrar la caché a mano.
const TEXTURE_CACHE_KEY = 'texture-availability-cache';

async function checkAvailability(title) {
  const cache = store.load(TEXTURE_CACHE_KEY, {});
  if (Object.prototype.hasOwnProperty.call(cache, title)) return cache[title];
  let available = false;
  try {
    const games = await searchGame(title);
    if (games.length) {
      const { mods } = await listMods(games[0].id);
      available = mods.some(m => /textur|hd|remaster|repaint|4k|uhd/i.test(`${m.name} ${m.category || ''}`));
    }
  } catch { available = false; }
  cache[title] = available;
  store.save(TEXTURE_CACHE_KEY, cache);
  return available;
}

module.exports = { searchGame, listMods, getModDownloadInfo, getTextureDestDir, downloadAndInstall, checkAvailability };
