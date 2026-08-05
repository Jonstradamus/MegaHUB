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

// BUG CRÍTICO corregido: antes la raíz por defecto era la carpeta donde vive
// MegaHUB.exe. En desarrollo eso resolvía bien, pero empaquetado esa carpeta
// puede ser de solo lectura (dentro de resources/app.asar) o, si el usuario
// instaló en "C:\Program Files\MegaHUB" (el instalador per-máquina instala
// ahí por defecto, como cualquier app de Windows), requiere permisos de
// administrador que MegaHUB no tiene en ejecución normal — fs.mkdirSync ahí
// fallaba con EPERM ("Error creando carpetas: EPERM...").
//
// Ahora la raíz por defecto es SIEMPRE Documentos\MegaHUB, sin importar dónde
// se instaló la app — igual que Documentos\Mis Juegos o Documentos\<Juego> de
// cualquier otro programa de Windows, siempre escribible por el usuario
// actual sin depender de permisos de instalación. El usuario puede cambiar
// esta raíz desde Ajustes generales (ver setDefaultRoot) si prefiere otro
// disco/carpeta.
function isWritableDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.megahub-write-test');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch { return false; }
}

const DOCUMENTS_ROOT = path.join(app.getPath('documents'), 'MegaHUB');

// store guarda la raíz elegida a mano por el usuario en Ajustes (o, como red
// de seguridad, la que quedó fijada automáticamente si Documentos mismo
// llegara a fallar) — si no hay nada guardado, se usa Documentos\MegaHUB.
let ROOT = store.load('root-override', null) || DOCUMENTS_ROOT;
let EMULATORS_DIR = path.join(ROOT, 'emulators');
let ROMS_DIR = path.join(ROOT, 'roms');

function applyRoot(newRoot, persist) {
  ROOT = newRoot;
  EMULATORS_DIR = path.join(ROOT, 'emulators');
  ROMS_DIR = path.join(ROOT, 'roms');
  if (persist) store.save('root-override', ROOT);
}

// Elegido a mano desde Ajustes generales: se valida que sea escribible antes
// de aceptarlo, para no dejar al usuario con una raíz rota.
function setDefaultRoot(newRoot) {
  if (!isWritableDir(newRoot)) return { error: 'Esa carpeta no se puede escribir (permisos insuficientes).' };
  applyRoot(newRoot, true);
  return { ok: true, root: ROOT };
}

function resetDefaultRoot() {
  store.save('root-override', null);
  applyRoot(DOCUMENTS_ROOT, false);
  return { ok: true, root: ROOT };
}

function switchToFallbackRoot() {
  if (ROOT === DOCUMENTS_ROOT) return; // ya estamos en el fallback, nada más que probar
  applyRoot(DOCUMENTS_ROOT, true);
}

// mkdirSync que, si falla por permisos, cambia toda la raíz a Documentos y
// reintenta ahí — red de seguridad para el caso remoto de que la raíz activa
// (Documentos por defecto, u otra que el usuario haya elegido a mano) deje de
// ser escribible, en vez de dejar reventar la creación de carpetas del
// emulador/ROMs con un EPERM que el usuario no puede resolver sin admin.
function mkdirWithFallback(dirUnderRoot) {
  try {
    fs.mkdirSync(dirUnderRoot, { recursive: true });
    return dirUnderRoot;
  } catch (e) {
    if (e.code !== 'EPERM' && e.code !== 'EACCES') throw e;
    const rel = path.relative(ROOT, dirUnderRoot);
    switchToFallbackRoot();
    const retried = path.isAbsolute(rel) || rel.startsWith('..') ? dirUnderRoot : path.join(ROOT, rel);
    fs.mkdirSync(retried, { recursive: true });
    return retried;
  }
}

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
  // Carpetas propias que el usuario señaló a mano (ubicador) NO pasan por el
  // fallback automático: si esa carpeta específica no es escribible, es un
  // problema de la carpeta que el usuario eligió, no de dónde vive MegaHUB.
  let emuDir = getEmuDir(consoleId);
  if (isCustomEmuDir(consoleId)) fs.mkdirSync(emuDir, { recursive: true });
  else emuDir = mkdirWithFallback(emuDir);

  let romDir = getRomDir(consoleId);
  if (isCustomRomDir(consoleId)) fs.mkdirSync(romDir, { recursive: true });
  else romDir = mkdirWithFallback(romDir);

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

// Xemu es "portable" SOLO si ya existe un xemu.toml junto al .exe: en ese
// caso lee/escribe ahí; si no existe, usa el AppData del SISTEMA
// (Roaming\xemu\xemu\xemu.toml) — verificado en vivo creando una copia del
// .exe en una carpeta limpia (usa Roaming) y luego con un xemu.toml vacío al
// lado (pasa a usar ese archivo local). La instalación real de MegaHUB YA
// tiene un xemu.toml en emulators/xbox/ (el usuario configuró BIOS/HDD desde
// el propio menú de Xemu antes), así que para ese caso el archivo real es el
// local, NO el de Roaming — de ahí que haya que revisar ambos según cuál
// exista ya, en vez de asumir uno fijo.
function getXemuConfigPath(emuDir) {
  const local = path.join(emuDir, 'xemu.toml');
  if (fs.existsSync(local)) return local;
  return path.join(app.getPath('appData'), 'xemu', 'xemu', 'xemu.toml');
}

// Xemu es en realidad QEMU: pasarle la ROM como argumento suelto en la línea
// de comandos (como se hace con el resto de emuladores standalone) NO carga
// el disco — QEMU lo interpreta como el disco IDE índice 0, que choca con el
// disco duro de Xbox que Xemu ya arma internamente desde su config
// ("drive with bus=0, unit=0 (index=0) exists"), y el proceso muere al
// instante con código 1. Verificado en vivo con el .exe real instalado y con
// una ROM real del usuario (mismo error visto en su xemu.log ya existente).
// La única forma soportada de indicarle el disco es su propia clave
// [sys.files] dvd_path en xemu.toml (la que usa su menú System > Disc), así
// que se escribe ahí antes de lanzarlo sin argumentos.
function setXemuDvdPath(emuDir, romPath) {
  const cfgPath = getXemuConfigPath(emuDir);
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  let text = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : '';
  const value = `'${romPath.replace(/'/g, "\\'")}'`;
  const sectionRe = /^\[sys\.files\]\s*$/m;
  if (!sectionRe.test(text)) {
    text = text.replace(/\s*$/, '') + `\n\n[sys.files]\ndvd_path = ${value}\n`;
  } else {
    const startIdx = text.search(sectionRe);
    const afterStart = text.indexOf('\n', startIdx) + 1;
    const rest = text.slice(afterStart);
    const nextSectionOffset = rest.search(/^\[/m);
    const blockEnd = nextSectionOffset === -1 ? text.length : afterStart + nextSectionOffset;
    const block = text.slice(afterStart, blockEnd);
    const keyRe = /^(dvd_path\s*=\s*)('(?:[^'\\]|\\.)*'|\S+)/m;
    const newBlock = keyRe.test(block)
      ? block.replace(keyRe, (_m, prefix) => `${prefix}${value}`)
      : block.replace(/\s*$/, '') + `\ndvd_path = ${value}\n`;
    text = text.slice(0, afterStart) + newBlock + text.slice(blockEnd);
  }
  fs.writeFileSync(cfgPath, text);
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
  ensureConsoleFolders, openFolder, listRomFiles,
  // ROOT/EMULATORS_DIR/ROMS_DIR se exponen como getters (no como el valor ya
  // resuelto) porque pueden cambiar en caliente si mkdirWithFallback tiene
  // que saltar a Documentos\MegaHUB después de que este módulo ya se cargó.
  get ROOT() { return ROOT; },
  get EMULATORS_DIR() { return EMULATORS_DIR; },
  get ROMS_DIR() { return ROMS_DIR; },
  getEmuDir, getRomDir, getLocationInfo, getXemuConfigPath, setXemuDvdPath,
  setCustomEmuDir, setCustomRomDir, clearCustomEmuDir, clearCustomRomDir,
  setDefaultRoot, resetDefaultRoot, DOCUMENTS_ROOT,
};
