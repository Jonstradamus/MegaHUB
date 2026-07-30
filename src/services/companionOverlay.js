// ─── Fullscreen sin exclusividad, para que el gato del DERIVA Companion
// pueda seguir mostrándose encima del emulador ───────────────────────────────
// El overlay del Companion es una ventana "siempre encima" normal — el modo
// fullscreen EXCLUSIVO de un juego/emulador tapa TODO, overlays incluidos
// (el mismo motivo por el que el overlay de Discord/Steam tampoco aparece
// sobre fullscreen exclusivo: es una limitación de Windows, no del gato). El
// fullscreen "sin bordes" (windowed/borderless) en cambio sigue viviendo
// dentro del compositor de escritorio, así que un overlay normal SÍ puede
// dibujar encima.
//
// Esto fuerza esa opción solo donde se confirmó la clave real de config:
// - RetroArch: video_windowed_fullscreen (retroarch.cfg, global — cubre
//   NES/SNES/Genesis/PS1/N64/Dreamcast/PSP/NDS/3DS/etc., todos los cores).
// - Dolphin (GameCube/Wii): BorderlessFullscreen (GFX.ini, [Settings]).
// El resto (PCSX2/RPCS3/Xenia/Xemu) se deja intacto a propósito: PCSX2 Qt no
// tiene un modo exclusivo separado (su "Fullscreen" ya es borderless), y para
// RPCS3/Xenia/Xemu no se pudo confirmar la clave exacta sin arriesgarse a
// escribir mal su configuración — mejor no tocarlas que adivinar.
const fs = require('fs');
const path = require('path');
const scanRetroArch = require('../scanners/retroarch');
const { patchKeyValue } = require('./resolutionPresets');

function patchFlatLine(text, key, value) {
  const re = new RegExp(`^${key}\\s*=.*$`, 'm');
  return re.test(text)
    ? text.replace(re, `${key} = ${value}`)
    : text.replace(/\s*$/, '') + (text.trim() ? '\n' : '') + `${key} = ${value}\n`;
}

// Se llama antes de cada lanzamiento retro (ver retro-launch-rom en main.js)
// — idempotente y silenciosa: si RetroArch no está instalado o aún no generó
// su retroarch.cfg (nunca se abrió una vez), no hace nada, no rompe el
// lanzamiento del juego.
function ensureRetroArchBorderless() {
  try {
    const exe = scanRetroArch.findRetroArch();
    if (!exe) return;
    const cfgPath = path.join(path.dirname(exe), 'retroarch.cfg');
    if (!fs.existsSync(cfgPath)) return;
    let text = fs.readFileSync(cfgPath, 'utf8');
    text = patchFlatLine(text, 'video_windowed_fullscreen', '"true"');
    fs.writeFileSync(cfgPath, text);
  } catch { /* nunca debe romper el lanzamiento del juego por esto */ }
}

// dolphinRoot: carpeta donde vive Dolphin.exe (GameCube/Wii no se auto-descargan,
// el usuario ya la ubicó a mano — ver retroFolders.getLocationInfo).
function ensureDolphinBorderless(dolphinRoot) {
  try {
    const cfgPath = path.join(dolphinRoot, 'User', 'Config', 'GFX.ini');
    if (!fs.existsSync(cfgPath)) return;
    let text = fs.readFileSync(cfgPath, 'utf8');
    text = patchKeyValue(text, 'Settings', 'BorderlessFullscreen', 'True');
    fs.writeFileSync(cfgPath, text);
  } catch { /* nunca debe romper el lanzamiento del juego por esto */ }
}

module.exports = { ensureRetroArchBorderless, ensureDolphinBorderless };
