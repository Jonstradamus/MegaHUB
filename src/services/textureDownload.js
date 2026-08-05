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
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const romMetadata = require('./romMetadata');
const retroFolders = require('./retroFolders');
const scanRetroArch = require('../scanners/retroarch');
const store = require('../util/store');
const archiveExtract = require('./archiveExtract');

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

// Categorías cuyo contenido son PNG/DDS de reemplazo que Dolphin (Load/Textures)
// o PPSSPP (TEXTURES) cargan solos con solo dejarlos en la carpeta correcta —
// verificado que en GameBanana, para GC/Wii/PSP, "Skins" y "Retextures" son el
// mismo mecanismo técnico que "Textures" (así etiquetan mods de piel de
// personaje/reemplazo visual que en el fondo son solo texturas), así que se
// tratan igual a la hora de decidir si el instalado automático es seguro.
// Todo lo demás (traducciones, saves, trainers, herramientas, sonidos, mapas,
// GUIs...) NO usa ese mecanismo — cada una necesita su propio proceso (parchar
// la ISO, copiar a otra carpeta del sistema, etc.) que MegaHUB no puede
// adivinar de forma genérica, así que esos se dejan solo para descargar y el
// usuario los coloca a mano siguiendo las instrucciones del propio mod.
const AUTO_INSTALL_CATEGORY_RE = /textur|skin|retextur|hd\b|remaster|repaint|4k|uhd|material|effect/i;

function isAutoInstallable(mod) {
  return AUTO_INSTALL_CATEGORY_RE.test(`${mod.name} ${mod.category || ''}`);
}

async function listMods(gameId, page = 1, sort = 'new', perPage = 20) {
  const res = await fetch(`${API}/Game/${gameId}/Subfeed?_nPage=${page}&_nPerpage=${perPage}&_sSort=${sort}&_csvModelInclusions=Mod`);
  if (!res.ok) return { mods: [], total: 0 };
  const json = await res.json();
  const mods = (json._aRecords || []).map(r => {
    const img = r._aPreviewMedia && r._aPreviewMedia._aImages && r._aPreviewMedia._aImages[0];
    const mod = {
      id: r._idRow,
      name: r._sName,
      category: r._aRootCategory ? r._aRootCategory._sName : null,
      likes: r._nLikeCount || 0,
      views: r._nViewCount || 0,
      profileUrl: r._sProfileUrl,
      thumbUrl: img ? `${img._sBaseUrl}/${img._sFile220 || img._sFile}` : null,
    };
    mod.autoInstallable = isAutoInstallable(mod);
    return mod;
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
// levante solo, sin configuración adicional del usuario. SOLO aplica a mods
// clasificados como auto-instalables (ver isAutoInstallable) — es la única
// ubicación que Dolphin/PPSSPP escanean solos.
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

function sanitizeFolderName(name) {
  return (name || 'mod').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || 'mod';
}

// Para mods que NO son textura/skin (idiomas, modelos, cheats, herramientas,
// etc.): no hay una carpeta "mágica" donde el emulador los recoja solo, así
// que se dejan en una carpeta propia de MegaHUB, bien identificada por juego
// y por mod, para que el usuario los mueva a mano según las instrucciones que
// traiga cada uno — mejor eso que adivinar mal y que el mod no funcione o
// pise archivos que no debía.
function getManualModDestDir(consoleId, romPath, modId, modName) {
  const folderName = `${modId}-${sanitizeFolderName(modName)}`;
  if (consoleId === 'gamecube' || consoleId === 'wii') {
    const gameId = readGameCubeWiiId(romPath) || 'juego-desconocido';
    const { emuDir } = retroFolders.getLocationInfo(consoleId);
    return path.join(emuDir, 'MegaHUB-Mods', gameId, folderName);
  }
  if (consoleId === 'psp') {
    const gameId = readPspGameId(romPath) || 'juego-desconocido';
    const exe = scanRetroArch.findRetroArch();
    if (!exe) return null;
    return path.join(path.dirname(exe), 'system', 'MegaHUB-Mods', gameId, folderName);
  }
  return null;
}

// Se llama SOLO después de que el renderer ya mostró nombre/tamaño y el
// usuario confirmó — mismo límite de seguridad que emulatorDownload.js.
// `mod` trae { id, name, autoInstallable } — el renderer ya tiene ese dato de
// listMods, así que no hace falta volver a pedirlo aquí.
async function downloadAndInstall(consoleId, romPath, mod) {
  const modId = mod.id;
  const destDir = mod.autoInstallable
    ? getTextureDestDir(consoleId, romPath)
    : getManualModDestDir(consoleId, romPath, modId, mod.name);
  if (!destDir) {
    return { error: 'No se pudo identificar el ID del juego (o falta el emulador correspondiente) para saber dónde instalar el pack.' };
  }
  const info = await getModDownloadInfo(modId);
  if (!info) throw new Error('No se pudo obtener el archivo de descarga de GameBanana');
  // GameBanana acepta subir .zip, .7z o .rar indistintamente — el nombre del
  // archivo temporal tiene que usar la extensión REAL para que archiveExtract
  // sepa con qué descompresor abrirlo (antes se forzaba ".zip" fijo y los
  // packs subidos en .rar/.7z fallaban al intentar leerlos como zip).
  if (!archiveExtract.isSupportedArchive(info.fileName)) {
    return { error: `"${info.fileName}" no es un formato que MegaHUB pueda descomprimir (solo .zip, .7z y .rar).` };
  }

  const tmpArchive = path.join(os.tmpdir(), `megahub-mod-${modId}-${Date.now()}${path.extname(info.fileName)}`);
  const res = await fetch(info.downloadUrl);
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpArchive));

  fs.mkdirSync(destDir, { recursive: true });
  await archiveExtract.extractArchive(tmpArchive, destDir);
  fs.unlinkSync(tmpArchive);

  // Muchos packs traen sus PNG en una subcarpeta dentro del archivo en vez de
  // sueltos — no hay forma fiable de saberlo de antemano, así que se avisa
  // en vez de asumir que siempre queda bien.
  return { ok: true, destDir, fileName: info.fileName, manual: !mod.autoInstallable };
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
