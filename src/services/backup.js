// Exportar/importar ajustes como un único .json — respaldo manual entre PCs
// sin depender de ninguna nube. Solo incluye AJUSTES reales (rutas elegidas a
// mano, claves propias, progreso de logros), nunca cachés regenerables
// (portadas/metadata de Steam/SGDB/TheGamesDB/Wikipedia se vuelven a pedir
// solas) ni sesiones de login de GOG/Epic (tokens de sesión — no tiene
// sentido copiarlos a otra máquina; ahí solo hace falta reconectar la cuenta).
const store = require('../util/store');

const STORE_KEYS = [
  'custom-locations', // carpetas de emulador/ROMs que el usuario ubicó a mano
  'ra-account',        // usuario + Web API key de RetroAchievements (no es la contraseña)
  'sgdb-key',
  'tgdb-key',
  'ach-unlocked',
  'ach-retro-stats',
  'ach-generic-activity',
];

const FORMAT = 'megahub-backup';
const VERSION = 1;

// localStorageData: snapshot ya armado por el renderer (los prefijos
// megahub-* que vive en localStorage, no en el store de archivos de main).
function buildExport(localStorageData) {
  const storeData = {};
  for (const key of STORE_KEYS) {
    const value = store.load(key, null);
    if (value !== null) storeData[key] = value;
  }
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    store: storeData,
    localStorage: localStorageData || {},
  };
}

function applyImport(parsed) {
  if (!parsed || parsed.format !== FORMAT) {
    throw new Error('El archivo no es un respaldo válido de MegaHUB.');
  }
  const storeData = parsed.store || {};
  for (const key of STORE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(storeData, key)) store.save(key, storeData[key]);
  }
  return parsed.localStorage || {};
}

module.exports = { buildExport, applyImport, STORE_KEYS };
