// ─── i18n — agrega inglés manteniendo español por defecto ─────────────────────
// Mismo mecanismo que companion-desktop/lib/i18n.js (DERIVA): sin librería,
// el renderer es vanilla (scripts clásicos, sin bundler) y el volumen de
// claves arranca chico — un lookup por ruta de puntos alcanza.
const es = require('../locales/es.json');
const en = require('../locales/en.json');

const LOCALES = { es, en };

function resolve(locale, key) {
  const dict = LOCALES[locale];
  if (!dict) return undefined;
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
}

/**
 * t(lang, key, params) — 'es'/'en' con fallback a 'es' y, si tampoco existe,
 * devuelve la propia key (nunca undefined — mejor una clave visible que un
 * "undefined" en la UI). params interpola ${nombre} en el string encontrado.
 */
function t(lang, key, params) {
  const raw = resolve(lang, key) ?? resolve('es', key) ?? key;
  if (!params) return raw;
  return Object.keys(params).reduce(
    (str, name) => str.replaceAll(`\${${name}}`, String(params[name])),
    raw,
  );
}

module.exports = { t, LOCALES };
