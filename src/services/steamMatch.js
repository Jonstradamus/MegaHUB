// Resuelve el appid de Steam de un juego comprado en OTRO launcher (Epic, GOG,
// Battle.net, etc.) buscando por título — así el análisis "¿lo mueve tu PC?"
// (que necesita los requisitos mínimos/recomendados, solo publicados por
// Steam) puede reusarse para cualquier plataforma: el hardware que hace
// falta para correr un juego es el mismo sin importar dónde lo compraste.
// Sin key: storesearch es el mismo endpoint público que usa el buscador de la
// tienda. Resultado cacheado permanentemente (por título normalizado).
const store = require('../util/store');

function normalize(s) {
  return String(s).toLowerCase().replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCache() {
  return store.load('steam-title-match', {});
}

async function searchSteamAppId(title) {
  const cache = getCache();
  const key = normalize(title);
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];

  let result = null;
  try {
    const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=us&l=english`);
    if (res.ok) {
      const json = await res.json();
      const items = (json.items || []).filter(i => i.type === 'app');
      const exact = items.find(i => normalize(i.name) === key);
      const best = exact || items[0];
      result = best ? { appid: best.id, title: best.name, exact: !!exact } : null;
    }
  } catch {
    result = null;
  }
  // Solo se cachea un resultado POSITIVO — un fallo de red no debe congelar
  // "sin coincidencia" para siempre.
  if (result) {
    cache[key] = result;
    store.save('steam-title-match', cache);
  }
  return result;
}

module.exports = { searchSteamAppId };
