// Organización local de emuladores/ROMs, dentro de la propia carpeta de MegaHUB
// (no en el AppData del sistema) para que el usuario la vea y la gestione como
// cualquier otra carpeta del proyecto. MegaHUB NUNCA descarga ni distribuye BIOS
// (son firmware con copyright, ilegal redistribuir) ni ROMs — solo crea la
// estructura vacía con instrucciones.
//
// "Ubicador de instalación": si el usuario ya tiene el emulador y/o sus ROMs
// en otro sitio del disco, puede señalar esa carpeta en vez de que MegaHUB
// cree una nueva — se guarda como override por consola y todo lo demás
// (detección de instalado, escaneo de ROMs, "abrir carpeta"...) lo usa de
// forma transparente en su lugar.
const fs = require('fs');
const path = require('path');
const { app, shell } = require('electron');
const store = require('../util/store');

// BUG CRÍTICO corregido: en desarrollo __dirname (src/services) cuelga del
// propio proyecto, así que dos niveles arriba daba la raíz real de MegaHUB —
// pero empaquetado, ese mismo __dirname vive DENTRO de resources/app.asar,
// un archivo de solo lectura. fs.mkdirSync ahí fallaba en silencio (o con un
// error que nadie veía) y por eso, ya instalado, "Crear carpetas del
// emulador/ROMs" nunca creaba nada — ni tampoco el core install / los
// presets de resolución, que dependen de estas mismas carpetas por debajo.
// Empaquetado, se usa la carpeta REAL donde vive MegaHUB.exe (junto al
// app.asar, no dentro) — sigue siendo "una carpeta más al lado de la app",
// la misma idea original, solo que resuelta bien para los dos casos.
const ROOT = app.isPackaged
  ? path.dirname(app.getPath('exe'))
  : path.join(__dirname, '..', '..');
const EMULATORS_DIR = path.join(ROOT, 'emulators');
const ROMS_DIR = path.join(ROOT, 'roms');

// Formatos que de verdad lee cada core/emulador (verificado contra la
// documentación de libretro y de cada emulador standalone) — no todos son
// .zip. Los sistemas de cartucho generalmente sí aceptan el juego comprimido
// en .zip/.7z (RetroArch descomprime al vuelo); los de disco casi siempre
// necesitan la imagen tal cual, sin comprimir (excepción: Flycast sí acepta
// .zip/.7z incluso siendo Dreamcast).
const ROM_FORMATS = {
  nes: { formats: '.nes, .fds, .unif', zip: true },
  sms: { formats: '.sms', zip: true },
  genesis: { formats: '.md, .gen, .smd, .bin', zip: true },
  gamegear: { formats: '.gg', zip: true },
  gb: { formats: '.gb', zip: true },
  gbc: { formats: '.gbc', zip: true },
  snes: { formats: '.sfc, .smc', zip: true },
  segacd: { formats: '.cue+.bin, .iso, .chd', zip: false },
  psx: { formats: '.cue+.bin, .iso, .chd, .pbp, .exe/.psexe, .m3u (multidisco)', zip: false },
  saturn: { formats: '.cue+.bin, .ccd, .chd, .m3u (multidisco)', zip: false },
  dreamcast: { formats: '.cdi, .gdi, .chd, .cue+.bin', zip: true },
  naomi: {
    formats: '.zip',
    note: 'Igual que en Arcade, el .zip es el romset nativo (formato MAME) — no un juego cualquiera comprimido. ' +
      'Naomi necesita "naomi.zip" (BIOS) y Atomiswave "awbios.zip" en la misma carpeta para que sus juegos arranquen.',
  },
  gba: { formats: '.gba', zip: true },
  nds: { formats: '.nds', zip: false },
  psp: { formats: '.iso, .cso, .pbp', zip: false },
  xbox: { formats: '.iso — ojo: tiene que ser formato "xiso" (convertido con xdvdfs/Qwix), no un ISO normal de disco', zip: false },
  ps2: { formats: '.iso, .chd, .mdf (evita .bin/.cue: PCSX2 no los lee directo, conviértelos primero)', zip: false },
  xbox360: { formats: '.iso, .xex, .zar', zip: false },
  ps3: {
    formats: '.iso, o la carpeta del disco tal cual (PS3_GAME/...), o .pkg para copias digitales',
    note: 'RPCS3 también necesita el firmware oficial de PS3 (PS3UPDAT.PUP) instalado dentro del propio ' +
      'emulador — se configura ahí, no poniendo un archivo en esta carpeta.',
  },
  atari2600: { formats: '.a26, .bin', zip: true },
  pcengine: { formats: '.pce, .sgx', zip: true },
  arcade: {
    formats: '.zip',
    note: 'A diferencia del resto, aquí el .zip NO es opcional: es el formato nativo del romset ' +
      '(el mismo que usan MAME/FBNeo), con los archivos internos exactos que pide cada juego — no es solo "un juego comprimido".',
  },
  neogeo: {
    formats: '.zip',
    note: 'Igual que en Arcade, el .zip es el romset nativo (formato MAME/FBNeo). Muchos juegos de ' +
      'Neo Geo además necesitan el romset "neogeo.zip" (BIOS compartida del sistema) en la misma carpeta.',
  },
  n64: { formats: '.n64, .z64, .v64', zip: false },
  n3ds: { formats: '.3ds, .cci, .cxi', zip: false },
  intellivision: { formats: '.int, .bin', zip: true },
  atari5200: { formats: '.a52, .bin', zip: true },
  colecovision: { formats: '.col, .rom', zip: true },
  vectrex: { formats: '.vec', zip: true },
  msx: { formats: '.rom, .dsk, .cas', zip: true },
  atari7800: { formats: '.a78, .bin', zip: true },
  atarilynx: { formats: '.lnx', zip: true },
  threedo: { formats: '.cue+.bin, .iso, .chd', zip: false },
  atarijaguar: { formats: '.j64, .jag', zip: true },
  virtualboy: { formats: '.vb', zip: true },
  ngp: { formats: '.ngp, .ngc', zip: true },
  wonderswan: { formats: '.ws, .wsc', zip: true },
};

function romFormatNote(consoleId, emulatorName) {
  const info = ROM_FORMATS[consoleId];
  if (!info) return `Usa el formato de ROM que lea ${emulatorName || 'el emulador'} (revisa su documentación).`;
  if (info.note) return `Formatos que lee ${emulatorName || 'el emulador'}: ${info.formats}.\n${info.note}`;
  return `Formatos que lee ${emulatorName || 'el emulador'}: ${info.formats}.\n` +
    (info.zip
      ? 'También puedes dejar el juego comprimido en .zip o .7z — lo lee igual, sin necesidad de descomprimirlo tú.'
      : 'Este sistema NO acepta .zip/.rar aquí: tiene que ser el archivo de disco/ROM tal cual, sin comprimir.');
}

function getOverrides() {
  return store.load('custom-locations', {});
}
function saveOverrides(data) {
  store.save('custom-locations', data);
}

function getEmuDir(consoleId) {
  const ov = getOverrides();
  return (ov[consoleId] && ov[consoleId].emuDir) || path.join(EMULATORS_DIR, consoleId);
}
function getRomDir(consoleId) {
  const ov = getOverrides();
  return (ov[consoleId] && ov[consoleId].romDir) || path.join(ROMS_DIR, consoleId);
}
function isCustomEmuDir(consoleId) {
  const ov = getOverrides();
  return !!(ov[consoleId] && ov[consoleId].emuDir);
}
function isCustomRomDir(consoleId) {
  const ov = getOverrides();
  return !!(ov[consoleId] && ov[consoleId].romDir);
}

function setCustomEmuDir(consoleId, dir) {
  const ov = getOverrides();
  ov[consoleId] = ov[consoleId] || {};
  ov[consoleId].emuDir = dir;
  saveOverrides(ov);
}
function setCustomRomDir(consoleId, dir) {
  const ov = getOverrides();
  ov[consoleId] = ov[consoleId] || {};
  ov[consoleId].romDir = dir;
  saveOverrides(ov);
}
function clearCustomEmuDir(consoleId) {
  const ov = getOverrides();
  if (ov[consoleId]) { delete ov[consoleId].emuDir; saveOverrides(ov); }
}
function clearCustomRomDir(consoleId) {
  const ov = getOverrides();
  if (ov[consoleId]) { delete ov[consoleId].romDir; saveOverrides(ov); }
}

function getLocationInfo(consoleId) {
  return {
    emuDir: getEmuDir(consoleId),
    romDir: getRomDir(consoleId),
    customEmu: isCustomEmuDir(consoleId),
    customRom: isCustomRomDir(consoleId),
  };
}

function ensureConsoleFolders(consoleId, consoleName, emulatorName) {
  const emuDir = getEmuDir(consoleId);
  const romDir = getRomDir(consoleId);
  fs.mkdirSync(emuDir, { recursive: true });
  fs.mkdirSync(romDir, { recursive: true });

  // Solo se escriben los LEEME dentro de las carpetas por defecto de MegaHUB —
  // si el usuario señaló una carpeta propia ya existente, no le dejamos
  // archivos nuestros ahí.
  if (!isCustomEmuDir(consoleId)) {
    const emuReadme = path.join(emuDir, 'LEEME.txt');
    if (!fs.existsSync(emuReadme)) {
      fs.writeFileSync(emuReadme,
        `Carpeta para ${emulatorName || 'el emulador'} (${consoleName}).\n\n` +
        `MegaHUB NO incluye ni descarga BIOS: son archivos con copyright, ilegales de\n` +
        `redistribuir. Si esta consola necesita BIOS, consíguelo tú mismo y colócalo\n` +
        `aquí según lo pida el emulador una vez instalado.\n\n` +
        `Usa el enlace "Descargar emulador" en MegaHUB para bajar el instalador oficial\n` +
        `y descomprímelo/instálalo en esta carpeta si el emulador es portable.\n`
      );
    }
  }
  if (!isCustomRomDir(consoleId)) {
    // Se regenera siempre (no solo si falta) para que consolas ya escaneadas
    // antes de este cambio también reciban el formato correcto en vez de
    // quedarse con el LEEME viejo y desactualizado.
    const romReadme = path.join(romDir, 'LEEME.txt');
    fs.writeFileSync(romReadme,
      `Coloca aquí tus propias copias de seguridad de juegos de ${consoleName}.\n\n` +
      `${romFormatNote(consoleId, emulatorName)}\n\n` +
      `Para que MegaHUB reconozca la carátula correcta, nombra el archivo IGUAL al\n` +
      `título del catálogo — la extensión no importa, solo el nombre antes de ella\n` +
      `(mayúsculas/minúsculas tampoco importan). Ejemplos:\n` +
      `  "Super Mario Bros."  ✔ se reconoce (con cualquiera de los formatos de arriba)\n` +
      `  "copia de seguridad" ✘ no se puede identificar\n`
    );
  }
  return { emuDir, romDir };
}

function openFolder(folderPath) {
  if (fs.existsSync(folderPath)) shell.openPath(folderPath);
}

// Nombres que pueden aparecer dentro de roms/<consola>/ pero que NUNCA son
// un juego en sí:
//  - xbox: carpetas de soporte de Xemu que el propio usuario crea siguiendo
//    su guía de configuración (BIOS, MCPX boot ROM, disco duro virtual) —
//    verificado: no las crea MegaHUB, pero listRomFiles las mostraba como si
//    fueran ROMs porque ahora también acepta carpetas.
//  - ps3: PS3_DISC.SFB es solo el descriptor del sistema de archivos del
//    disco (acompaña SIEMPRE a la carpeta PS3_GAME/ del mismo juego) — nunca
//    es un juego aparte, así que listarlo junto a PS3_GAME/ duplicaba la
//    misma copia como si fueran dos.
const NON_GAME_ENTRIES = {
  xbox: ['bios', 'hdd', 'mcpx'],
  ps3: ['ps3_disc.sfb'],
};

function listRomFiles(consoleId) {
  const romDir = getRomDir(consoleId);
  if (!fs.existsSync(romDir)) return [];
  const excluded = NON_GAME_ENTRIES[consoleId] || [];
  return fs.readdirSync(romDir).filter(f => {
    if (excluded.includes(f.toLowerCase())) return false;
    try {
      const stat = fs.statSync(path.join(romDir, f));
      // Incluye también carpetas: los dumps de disco de Xbox, Xbox 360 y PS3
      // suelen venir como carpeta (ej. PS3_GAME/...) en vez de un único
      // archivo — si solo se aceptaran archivos, esas ROMs nunca aparecerían
      // en el escaneo aunque estén en el sitio correcto.
      return (stat.isFile() || stat.isDirectory()) && !/^leeme\.txt$/i.test(f);
    } catch { return false; }
  });
}

module.exports = {
  ensureConsoleFolders, openFolder, listRomFiles, EMULATORS_DIR, ROMS_DIR,
  getEmuDir, getRomDir, getLocationInfo,
  setCustomEmuDir, setCustomRomDir, clearCustomEmuDir, clearCustomRomDir,
};
