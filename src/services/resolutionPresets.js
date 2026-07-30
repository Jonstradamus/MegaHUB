// Presets de resolución/rendimiento para los emuladores standalone que
// MegaHUB gestiona (PS2, PS3, Xbox, Xbox 360; GameCube/Wii comparten Dolphin).
// Escribe directamente en el archivo de configuración real de cada emulador
// las claves que su propia comunidad recomienda para acercarse a 1080p/1440p
// ("2K")/4K con el mejor rendimiento posible en cada nivel — verificado contra
// el config.yml de RPCS3 y el .toml de Xenia ya instalados en este equipo, y
// contra el código fuente oficial de PCSX2/Dolphin/Xemu para sus claves.
//
// No son mapeos exactos de píxeles: cada consola tiene su propia resolución
// nativa (que casi nunca es 16:9 limpio), así que esto reproduce el "factor
// de escala interna" (supersampling) que cada comunidad usa como aproximación
// estándar a esos objetivos — no todos los juegos caerán en el pixel exacto.
const fs = require('fs');
const os = require('os');
const path = require('path');
const emulatorDownload = require('./emulatorDownload');
const retroFolders = require('./retroFolders');
const retroCoreInstall = require('./retroCoreInstall');
const scanRetroArch = require('../scanners/retroarch');

const TIERS = ['default', '1080p', '2k', '4k'];
const TIER_LABEL = {
  default: 'nativo (mejor rendimiento)',
  '1080p': '1080p',
  '2k': '1440p / 2K',
  '4k': '4K',
};

// [multiplicador de resolución interna, resolución de ventana/salida o null]
const PRESET_VALUES = {
  ps2: { default: 1, '1080p': 3, '2k': 4, '4k': 6 }, // PCSX2 upscale_multiplier (nativo ~512x448)
  ps3: { default: 100, '1080p': 150, '2k': 200, '4k': 300 }, // RPCS3 Resolution Scale (%)
  xbox: { // Xemu surface_scale (nativo ~640x480) + tamaño de ventana
    default: [1, null], '1080p': [2, '1920x1080'], '2k': [4, '2560x1440'], '4k': [6, '3840x2160'],
  },
  xbox360: { // Xenia draw_resolution_scale (nativo ~1280x720) + tamaño de ventana
    default: [1, null], '1080p': [1, '1920x1080'], '2k': [2, '2560x1440'], '4k': [3, '3840x2160'],
  },
  gamecube: { default: 1, '1080p': 2, '2k': 3, '4k': 6 }, // Dolphin InternalResolution (nativo ~640x528)
  wii: { default: 1, '1080p': 2, '2k': 3, '4k': 6 },
};

// De los cores de RetroArch que MegaHUB instala, solo estos 6 tienen un
// ajuste real de "resolución interna" (renderizan en 3D o con un renderer
// escalable) — verificado contra el código fuente de cada core, no de
// memoria. El resto (NES/SNES/Genesis/GB/Arcade/etc.) son sistemas 2D
// pixel-exactos sin nada que escalar: RetroArch ya los estira a tu
// resolución de pantalla sin ganar detalle real subiendo un número.
//
// nombre de carpeta real que usa RetroArch para guardar el override de
// opciones/shader del core — es el campo "corename" de su .info, NO el
// nombre del .dll (verificado contra los .info reales instalados en este
// equipo, para TODOS los cores de retroCoreInstall.CORE_MAP).
const CORE_FOLDER = {
  nes: 'Mesen', sms: 'Genesis Plus GX', genesis: 'Genesis Plus GX', gamegear: 'Genesis Plus GX', segacd: 'Genesis Plus GX',
  gb: 'SameBoy', gbc: 'SameBoy', snes: 'Snes9x', psx: 'SwanStation', saturn: 'Beetle Saturn', gba: 'mGBA',
  nds: 'melonDS', psp: 'PPSSPP', arcade: 'FinalBurn Neo', neogeo: 'FinalBurn Neo', pcengine: 'Beetle PCE Fast',
  atari2600: 'Stella', n64: 'Mupen64Plus-Next', n3ds: 'Azahar', intellivision: 'FreeIntv', atari5200: 'a5200',
  colecovision: 'Gearcoleco', vectrex: 'vecx', msx: 'blueMSX', atari7800: 'ProSystem', atarilynx: 'Handy',
  threedo: 'Opera', atarijaguar: 'Virtual Jaguar', virtualboy: 'Beetle VB', ngp: 'Beetle NeoPop', wonderswan: 'Beetle WonderSwan',
  dreamcast: 'Flycast', naomi: 'Flycast', // NAOMI/Atomiswave corren en el mismo core/carpeta que Dreamcast
};
// Subconjunto de CORE_FOLDER con ajuste real de "resolución interna" (3D o
// renderer escalable) — el resto son sistemas 2D pixel-exactos que en vez de
// esto reciben un shader de reconstrucción de bordes (ver applyPixelShaderPreset).
const RETROARCH_CORE_FOLDER = { n64: CORE_FOLDER.n64, psx: CORE_FOLDER.psx, dreamcast: CORE_FOLDER.dreamcast, naomi: CORE_FOLDER.naomi, psp: CORE_FOLDER.psp, nds: CORE_FOLDER.nds, n3ds: CORE_FOLDER.n3ds };

// Para PS1 y consolas anteriores (2D pixel-exactas, sin resolución interna
// real que escalar): la mejora de calidad de imagen real es un shader de
// reconstrucción de bordes tipo xBRZ (reduce el dentado sin volverse borroso
// como un bilineal normal) — RetroArch ya lo trae incluido en su carpeta
// shaders/. A más resolución objetivo, más factor de xBRZ (más presupuesto
// de píxeles para aprovechar el detalle reconstruido).
const PIXEL_SHADER_TIER = { default: null, '1080p': '2xbrz-linear', '2k': '4xbrz-linear', '4k': '6xbrz-linear' };

// clave(s) de core option -> valor (ya entre comillas, como los guarda
// RetroArch en el .opt) por tier.
const RETROARCH_PRESET_VALUES = {
  n64: { // Mupen64Plus-Next (GLideN64): "16:9 Resolution" solo aplica si Aspect Ratio no es 4:3
    default: { 'mupen64plus-aspect': '"4:3"' },
    '1080p': { 'mupen64plus-aspect': '"16:9 adjusted"', 'mupen64plus-169screensize': '"1920x1080"' },
    '2k': { 'mupen64plus-aspect': '"16:9 adjusted"', 'mupen64plus-169screensize': '"2560x1440"' },
    '4k': { 'mupen64plus-aspect': '"16:9 adjusted"', 'mupen64plus-169screensize': '"3840x2160"' },
  },
  psx: { // SwanStation: valores tal cual los etiqueta el propio core ("5x (for 1080p)", etc.)
    default: { swanstation_GPU_ResolutionScale: '"1"' },
    '1080p': { swanstation_GPU_ResolutionScale: '"5"' },
    '2k': { swanstation_GPU_ResolutionScale: '"6"' },
    '4k': { swanstation_GPU_ResolutionScale: '"9"' },
  },
  dreamcast: { // Flycast (reicast_internal_resolution): opciones fijas en 4:3, se eligió la de altura exacta
    default: { reicast_internal_resolution: '"640x480"' },
    '1080p': { reicast_internal_resolution: '"1440x1080"' },
    '2k': { reicast_internal_resolution: '"1920x1440"' },
    '4k': { reicast_internal_resolution: '"2880x2160"' },
  },
  naomi: { // mismo core y misma clave que Dreamcast (Flycast no distingue el preset por sistema)
    default: { reicast_internal_resolution: '"640x480"' },
    '1080p': { reicast_internal_resolution: '"1440x1080"' },
    '2k': { reicast_internal_resolution: '"1920x1440"' },
    '4k': { reicast_internal_resolution: '"2880x2160"' },
  },
  psp: { // PPSSPP (nativo 480x272 ya en ~16:9): múltiplos exactos del nativo
    default: { ppsspp_internal_resolution: '"480x272"' },
    '1080p': { ppsspp_internal_resolution: '"1920x1088"' },
    '2k': { ppsspp_internal_resolution: '"2400x1360"' },
    '4k': { ppsspp_internal_resolution: '"3840x2176"' },
  },
  nds: { // melonDS: la resolución solo escala con el renderer OpenGL activado (por defecto usa software)
    default: { melonds_opengl_renderer: '"disabled"', melonds_opengl_resolution: '"1x native (256x192)"' },
    '1080p': { melonds_opengl_renderer: '"enabled"', melonds_opengl_resolution: '"4x native (1024x768)"' },
    '2k': { melonds_opengl_renderer: '"enabled"', melonds_opengl_resolution: '"6x native (1536x1152)"' },
    '4k': { melonds_opengl_renderer: '"enabled"', melonds_opengl_resolution: '"8x native (2048x1536)"' },
  },
  n3ds: { // Azahar (citra_resolution_factor): 1-10, nativo 400x240
    default: { citra_resolution_factor: '"1"' },
    '1080p': { citra_resolution_factor: '"5"' },
    '2k': { citra_resolution_factor: '"6"' },
    '4k': { citra_resolution_factor: '"10"' },
  },
};

function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Parcheo genérico de archivos "[Sección]\nclave = valor" — sirve tanto para
// el .ini de PCSX2/Dolphin como para el .toml de Xenia/Xemu (misma sintaxis
// de sección+clave en una sola línea). Solo toca la clave dentro de SU
// sección, para no chocar con una clave del mismo nombre en otra sección.
function patchKeyValue(text, section, key, value) {
  const sectionRe = new RegExp(`^\\[${escapeReg(section)}\\]\\s*$`, 'm');
  if (!sectionRe.test(text)) {
    return text.replace(/\s*$/, '') + `\n\n[${section}]\n${key} = ${value}\n`;
  }
  const startIdx = text.search(sectionRe);
  const afterStart = text.indexOf('\n', startIdx) + 1;
  const rest = text.slice(afterStart);
  const nextSectionOffset = rest.search(/^\[/m);
  const blockEnd = nextSectionOffset === -1 ? text.length : afterStart + nextSectionOffset;
  const block = text.slice(afterStart, blockEnd);
  // Reemplaza solo el valor (grupo 2), conservando cualquier comentario en
  // línea que venga después (ej. los .toml de Xenia/Xemu están ampliamente
  // documentados con un "# comentario" tras cada valor — perderlo sería una
  // regresión real para quien luego mire el archivo a mano).
  const keyRe = new RegExp(`^(${escapeReg(key)}\\s*=\\s*)(\\S+)`, 'm');
  const newBlock = keyRe.test(block)
    ? block.replace(keyRe, (_m, prefix) => `${prefix}${value}`)
    : block.replace(/\s*$/, '') + `\n${key} = ${value}\n`;
  return text.slice(0, afterStart) + newBlock + text.slice(blockEnd);
}

// Parcheo de YAML anidado a 2 espacios (config.yml de RPCS3): busca
// "Padre:\n  Hijo: valor" y reemplaza solo el valor, o inserta la línea si
// falta. Si ni siquiera existe la sección padre no toca nada — evita
// insertar una estructura YAML a mano que podría quedar mal indentada.
function patchYamlChild(text, parentKey, childKey, value) {
  const lines = text.split(/\r?\n/);
  const parentRe = new RegExp(`^${escapeReg(parentKey)}:\\s*$`);
  const pIdx = lines.findIndex(l => parentRe.test(l));
  if (pIdx === -1) return text;
  let end = lines.length;
  for (let i = pIdx + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) { end = i; break; }
  }
  const childRe = new RegExp(`^(\\s\\s${escapeReg(childKey)}:\\s*).*$`);
  let found = false;
  for (let i = pIdx + 1; i < end; i++) {
    if (childRe.test(lines[i])) {
      lines[i] = lines[i].replace(childRe, (_m, prefix) => `${prefix}${value}`);
      found = true;
      break;
    }
  }
  if (!found) lines.splice(pIdx + 1, 0, `  ${childKey}: ${value}`);
  return lines.join('\n');
}

// Parcheo de los .opt de RetroArch: un archivo plano "clave = "valor"" sin
// secciones ni comentarios en línea, así que aquí sí es seguro reemplazar
// toda la línea entera (a diferencia de patchKeyValue, algunos valores de
// core option traen espacios dentro de las comillas, ej. "4x native (1024x768)").
function patchFlatOption(text, key, quotedValue) {
  const re = new RegExp(`^${escapeReg(key)}\\s*=.*$`, 'm');
  if (re.test(text)) return text.replace(re, `${key} = ${quotedValue}`);
  return text.replace(/\s*$/, '') + (text.trim() ? '\n' : '') + `${key} = ${quotedValue}\n`;
}

function findRetroArchConfigRoot() {
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return null;
  const nearby = path.join(path.dirname(exe), 'config');
  if (fs.existsSync(nearby)) return nearby;
  const appdata = path.join(os.homedir(), 'AppData', 'Roaming', 'RetroArch', 'config');
  return fs.existsSync(appdata) ? appdata : nearby;
}

// Comprueba que RetroArch Y el core de esta consola estén instalados, y
// devuelve la carpeta config/<CoreName>/ ya creada — compartido entre el
// preset de resolución interna y el de shader de píxeles.
function ensureCoreConfigDir(consoleId) {
  const folder = CORE_FOLDER[consoleId];
  if (!folder) return { error: 'Esta consola no tiene ajustes automáticos.' };
  const exe = scanRetroArch.findRetroArch();
  if (!exe) return { error: 'RetroArch no está instalado todavía.' };
  const coreName = retroCoreInstall.CORE_MAP[consoleId];
  const dllPath = retroCoreInstall.coreDllPath(path.dirname(exe), coreName);
  if (!fs.existsSync(dllPath)) return { error: `Falta instalar el core "${coreName}" — usa el botón "Instalar core" primero.` };
  const coreDir = path.join(findRetroArchConfigRoot(), folder);
  fs.mkdirSync(coreDir, { recursive: true });
  return { folder, exe, coreDir };
}

// Preset de resolución interna para un core de RetroArch: escribe en el
// override de opciones DEL CORE (config/<CoreName>/<CoreName>.opt), que
// aplica a cualquier ROM de ese sistema — no es un ajuste por juego.
function applyRetroArchCorePreset(consoleId, tier) {
  const values = RETROARCH_PRESET_VALUES[consoleId] && RETROARCH_PRESET_VALUES[consoleId][tier];
  if (!values) return null;
  const ctx = ensureCoreConfigDir(consoleId);
  if (ctx.error) return ctx;

  const optPath = path.join(ctx.coreDir, `${ctx.folder}.opt`);
  let text = fs.existsSync(optPath) ? fs.readFileSync(optPath, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    text = patchFlatOption(text, key, value);
  }
  fs.writeFileSync(optPath, text);
  return { ok: true, message: `${ctx.folder}: preset ${TIER_LABEL[tier]} aplicado (aplica a todos los juegos de este core). Reinicia el juego/RetroArch si estaba abierto.` };
}

// Búsqueda recursiva de un preset de shader por nombre de archivo exacto
// (ej. "4xbrz-linear.slangp") dentro del árbol shaders/shaders_slang o
// shaders_glsl — la estructura de subcarpetas difiere entre ambos sets, así
// que no se puede asumir una ruta relativa fija.
function findShaderPreset(root, basename) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name === basename) return p;
    }
  }
  return null;
}

// Preset de CALIDAD DE PÍXELES para PS1 y consolas anteriores (2D
// pixel-exactas, sin resolución interna que escalar): guarda un preset de
// shader por-core (config/<CoreName>/<CoreName>.slangp o .glslp) que
// RetroArch auto-carga (auto_shaders_enable) para todos los juegos de ese
// core. En vez de copiar el shader (que rompería sus rutas relativas), usa
// la directiva "#reference" de RetroArch — el mismo mecanismo que usa su
// propio "Guardar preset de core" cuando video_shader_preset_save_reference_enable
// está activo (verificado: lo está por defecto en este RetroArch).
function applyPixelShaderPreset(consoleId, tier) {
  if (RETROARCH_CORE_FOLDER[consoleId]) return null; // esos usan resolución interna real, no shader
  const want = PIXEL_SHADER_TIER[tier];
  const ctx = ensureCoreConfigDir(consoleId);
  if (ctx.error) return ctx;

  const slangOverride = path.join(ctx.coreDir, `${ctx.folder}.slangp`);
  const glslOverride = path.join(ctx.coreDir, `${ctx.folder}.glslp`);
  if (!want) {
    // Por defecto: sin shader — se quita cualquier override para que
    // RetroArch use el filtrado normal (nativo, mejor rendimiento).
    for (const p of [slangOverride, glslOverride]) { if (fs.existsSync(p)) fs.unlinkSync(p); }
    return { ok: true, message: `${ctx.folder}: shader de píxeles desactivado (nativo, mejor rendimiento). Reinicia el juego/RetroArch si estaba abierto.` };
  }

  const shadersRoot = path.join(path.dirname(ctx.exe), 'shaders');
  for (const [subdir, ext, overridePath] of [
    ['shaders_slang', 'slangp', slangOverride],
    ['shaders_glsl', 'glslp', glslOverride],
  ]) {
    const root = path.join(shadersRoot, subdir);
    if (!fs.existsSync(root)) continue;
    const found = findShaderPreset(root, `${want}.${ext}`);
    if (!found) continue;
    fs.writeFileSync(overridePath, `#reference "${found}"\n`);
    return { ok: true, message: `${ctx.folder}: shader ${want} (${TIER_LABEL[tier]}). Reinicia el juego/RetroArch si estaba abierto.` };
  }
  return { error: `No se encontró el shader "${want}" en tu carpeta shaders/ de RetroArch.` };
}

async function getInstalledDir(consoleId) {
  const status = await emulatorDownload.getEmulatorStatus(consoleId, '', '');
  if (!status || !status.installed) return null;
  return path.dirname(status.exePath);
}

function applyPcsx2(tier, emuDir) {
  const inisDir = path.join(emuDir, 'inis');
  fs.mkdirSync(inisDir, { recursive: true });
  // Marcador de modo portable de PCSX2 Qt: si existe (vacío basta), usa
  // inis/bios/etc relativos al propio exe en vez de la carpeta de Documentos.
  const marker = path.join(emuDir, 'portable.ini');
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '');
  const iniPath = path.join(inisDir, 'PCSX2.ini');
  let text = fs.existsSync(iniPath) ? fs.readFileSync(iniPath, 'utf8') : '[EmuCore/GS]\n';
  const mult = PRESET_VALUES.ps2[tier];
  text = patchKeyValue(text, 'EmuCore/GS', 'upscale_multiplier', mult);
  if (tier !== 'default') text = patchKeyValue(text, 'EmuCore/GS', 'MaxAnisotropy', 16);
  fs.writeFileSync(iniPath, text);
  return `PCSX2: resolución interna x${mult} nativo (${TIER_LABEL[tier]}).`;
}

function applyRpcs3(tier, emuDir) {
  const cfgPath = path.join(emuDir, 'config', 'config.yml');
  if (!fs.existsSync(cfgPath)) {
    return null; // ábrelo una vez para que genere su config.yml
  }
  let text = fs.readFileSync(cfgPath, 'utf8');
  const scale = PRESET_VALUES.ps3[tier];
  text = patchYamlChild(text, 'Video', 'Resolution Scale', scale);
  if (tier !== 'default') text = patchYamlChild(text, 'Video', 'Anisotropic Filter Override', 16);
  fs.writeFileSync(cfgPath, text);
  return `RPCS3: Resolution Scale ${scale}% (${TIER_LABEL[tier]}).`;
}

function findXeniaConfig(emuDir) {
  try {
    const f = fs.readdirSync(emuDir).find(n => /\.config\.toml$/i.test(n));
    return f ? path.join(emuDir, f) : null;
  } catch { return null; }
}

function applyXenia(tier, emuDir) {
  const cfgPath = findXeniaConfig(emuDir);
  if (!cfgPath) return null; // ábrelo una vez para que genere su config
  let text = fs.readFileSync(cfgPath, 'utf8');
  const [scale, winRes] = PRESET_VALUES.xbox360[tier];
  text = patchKeyValue(text, 'GPU', 'draw_resolution_scale_x', scale);
  text = patchKeyValue(text, 'GPU', 'draw_resolution_scale_y', scale);
  if (winRes) {
    const [w, h] = winRes.split('x');
    text = patchKeyValue(text, 'UI', 'window_size_x', w);
    text = patchKeyValue(text, 'UI', 'window_size_y', h);
  }
  fs.writeFileSync(cfgPath, text);
  return `Xenia: escala de render x${scale}${winRes ? `, ventana ${winRes}` : ''} (${TIER_LABEL[tier]}).`;
}

function applyXemu(tier, emuDir) {
  // Xemu solo es "portable" (lee/escribe junto al .exe) si YA existe un
  // xemu.toml ahí; si no, usa el AppData del sistema — ver
  // retroFolders.getXemuConfigPath, que revisa cuál de los dos existe de
  // verdad en vez de asumir uno fijo.
  const cfgPath = retroFolders.getXemuConfigPath(emuDir);
  let text = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : '';
  const [scale, winRes] = PRESET_VALUES.xbox[tier];
  text = patchKeyValue(text, 'display.quality', 'surface_scale', scale);
  if (winRes) text = patchKeyValue(text, 'display.window', 'startup_size', `"${winRes}"`);
  fs.writeFileSync(cfgPath, text);
  return `Xemu: escala de render x${scale}${winRes ? `, ventana ${winRes}` : ''} (${TIER_LABEL[tier]}).`;
}

function applyDolphin(consoleId, tier) {
  // GameCube/Wii no se descargan automáticamente (Dolphin bloquea la descarga
  // por su anti-bot) — solo se puede aplicar si el usuario ya lo ubicó.
  const { emuDir, customEmu } = retroFolders.getLocationInfo(consoleId);
  if (!customEmu) return null;
  let exe = null;
  try {
    exe = fs.readdirSync(emuDir).find(n => /^dolphin\.exe$/i.test(n));
  } catch { return null; }
  if (!exe) return null;
  const dolphinRoot = emuDir;
  const marker = path.join(dolphinRoot, 'portable.txt');
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '');
  const cfgDir = path.join(dolphinRoot, 'User', 'Config');
  fs.mkdirSync(cfgDir, { recursive: true });
  const cfgPath = path.join(cfgDir, 'GFX.ini');
  let text = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : '[Settings]\n';
  const scale = PRESET_VALUES[consoleId][tier];
  text = patchKeyValue(text, 'Settings', 'InternalResolution', scale);
  fs.writeFileSync(cfgPath, text);
  return `Dolphin: resolución interna x${scale} nativo (${TIER_LABEL[tier]}).`;
}

const SUPPORTED = ['ps2', 'ps3', 'xbox', 'xbox360', 'gamecube', 'wii'];

async function applyPreset(consoleId, tier) {
  if (!TIERS.includes(tier)) return { error: 'Preset desconocido.' };

  try {
    if (consoleId === 'gamecube' || consoleId === 'wii') {
      const message = applyDolphin(consoleId, tier);
      if (!message) return { error: 'Ubica primero tu carpeta de Dolphin ("Ya lo tengo — ubicar carpeta").' };
      return { ok: true, message: message + ' Reinicia Dolphin si estaba abierto.' };
    }

    if (SUPPORTED.includes(consoleId)) {
      const emuDir = await getInstalledDir(consoleId);
      if (!emuDir) return { error: 'El emulador de esta consola no está instalado todavía.' };

      let message = null;
      if (consoleId === 'ps2') message = applyPcsx2(tier, emuDir);
      else if (consoleId === 'ps3') message = applyRpcs3(tier, emuDir);
      else if (consoleId === 'xbox') message = applyXemu(tier, emuDir);
      else if (consoleId === 'xbox360') message = applyXenia(tier, emuDir);

      if (!message) return { error: 'Abre el emulador una vez (y ciérralo) para que genere su configuración, luego vuelve a intentar.' };
      return { ok: true, message: message + ' Reinicia el emulador si estaba abierto.' };
    }

    if (RETROARCH_CORE_FOLDER[consoleId]) {
      const result = applyRetroArchCorePreset(consoleId, tier);
      if (result) return result;
    }

    if (retroCoreInstall.CORE_MAP[consoleId]) {
      // Core de RetroArch sin resolución interna real (PS1 y anteriores: 2D
      // pixel-exacto, no renderiza en 3D) — la mejora de calidad real aquí es
      // un shader de reconstrucción de bordes (xBRZ), no una "resolución".
      const result = applyPixelShaderPreset(consoleId, tier);
      if (result) return result;
    }

    return { error: 'Esta consola no tiene ajustes de resolución automáticos.' };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

module.exports = { applyPreset, SUPPORTED, CORE_FOLDER, RETROARCH_CORE_FOLDER, TIERS, TIER_LABEL, patchKeyValue };
