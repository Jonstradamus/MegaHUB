const store = require('../util/store');

// Caché en disco de appdetails de Steam: { [appid]: { at, v, meta } }
// CACHE_VERSION fuerza un refetch cuando cambiamos qué campos guardamos (p.ej. al
// añadir headerImage), para que las entradas viejas no se queden sin el dato nuevo.
const CACHE_VERSION = 2;
let cache = null;
function getCache() {
  if (!cache) cache = store.load('steam-meta', {});
  return cache;
}

let lastFetch = 0;
async function throttled(url) {
  const wait = Math.max(0, lastFetch + 1200 - Date.now());
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastFetch = Date.now();
  return fetch(url);
}

// Devuelve { genres:[], releaseDate, releaseTs, requirements:{minimum,recommended}, shortDesc }
async function getSteamMeta(appid, { force = false } = {}) {
  const c = getCache();
  if (!force && c[appid] && c[appid].v === CACHE_VERSION) return c[appid].meta;
  try {
    const res = await throttled(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=spanish`);
    const json = await res.json();
    const d = json && json[appid] && json[appid].success ? json[appid].data : null;
    let meta = null;
    if (d) {
      let releaseTs = null;
      if (d.release_date && d.release_date.date) {
        const t = Date.parse(d.release_date.date);
        releaseTs = Number.isNaN(t) ? null : t;
      }
      const movie = d.movies && d.movies[0];
      const trailerUrl = movie && movie.mp4 ? (movie.mp4.max || movie.mp4['480']) : null;
      meta = {
        name: d.name || null,
        type: d.type || null,
        genres: (d.genres || []).map(g => g.description),
        releaseDate: d.release_date ? d.release_date.date : null,
        releaseTs,
        requirements: {
          minimum: (d.pc_requirements && d.pc_requirements.minimum) || null,
          recommended: (d.pc_requirements && d.pc_requirements.recommended) || null,
        },
        shortDesc: d.short_description || null,
        trailerUrl: trailerUrl || null,
        trailerPoster: (movie && movie.thumbnail) || null,
        // header_image SIEMPRE existe para cualquier app con ficha en Steam (a
        // diferencia de la portada vertical "library_600x900", que en juegos muy
        // nuevos aún no está publicada bajo la ruta predecible que usamos).
        headerImage: d.header_image || null,
      };
    }
    c[appid] = { at: Date.now(), v: CACHE_VERSION, meta };
    store.save('steam-meta', c);
    return meta;
  } catch {
    return null;
  }
}

module.exports = { getSteamMeta };
