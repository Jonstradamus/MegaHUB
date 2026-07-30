// Ficha completa (género, desarrollador, descripción, fecha) para el catálogo
// retro. Opcional: requiere una API key gratuita propia de thegamesdb.net (a
// diferencia de las portadas, que vienen sin key de libretro-thumbnails).
// NOTA: implementado contra la documentación pública de TheGamesDB v1 pero sin
// una clave real para probarlo en vivo — es "best effort" y falla en silencio
// (no rompe el catálogo) si la forma de la respuesta difiere.
const store = require('../util/store');

function getKey() {
  const cfg = store.load('tgdb-key');
  return cfg && cfg.key ? cfg.key : null;
}
function setKey(key) { store.save('tgdb-key', { key: key || null }); }
function hasKey() { return !!getKey(); }

async function getLookup(kind, key) {
  const cacheKey = 'tgdb-lookup-' + kind;
  const cached = store.load(cacheKey, null);
  if (cached) return cached;
  const res = await fetch(`https://api.thegamesdb.net/v1/${kind}?apikey=${key}`);
  if (!res.ok) return {};
  const json = await res.json();
  const list = (json.data && json.data[kind.toLowerCase()]) || {};
  const map = {};
  for (const [id, item] of Object.entries(list)) map[id] = item.name;
  store.save(cacheKey, map);
  return map;
}

function getCache() {
  return store.load('tgdb-cache', {});
}

async function getGameInfo(title) {
  const key = getKey();
  if (!key || !title) return null;
  const norm = title.toLowerCase().trim();
  const cache = getCache();
  if (Object.prototype.hasOwnProperty.call(cache, norm)) return cache[norm];

  let result = null;
  try {
    const [searchRes, genres, developers] = await Promise.all([
      fetch(`https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${key}&name=${encodeURIComponent(title)}&fields=genres,overview,release_date,developers`),
      getLookup('Genres', key).catch(() => ({})),
      getLookup('Developers', key).catch(() => ({})),
    ]);
    if (searchRes.ok) {
      const data = await searchRes.json();
      const game = data.data && data.data.games && data.data.games[0];
      if (game) {
        result = {
          overview: game.overview || null,
          releaseDate: game.release_date || null,
          genres: (game.genres || []).map(id => genres[id]).filter(Boolean),
          developers: (game.developers || []).map(id => developers[id]).filter(Boolean),
        };
      }
    }
  } catch {
    result = null;
  }
  cache[norm] = result;
  store.save('tgdb-cache', cache);
  return result;
}

module.exports = { getKey, setKey, hasKey, getGameInfo };
