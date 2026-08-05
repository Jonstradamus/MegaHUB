// Respaldo de portadas totalmente sin key para juegos que no tienen carátula
// propia (Battle.net, Riot, Rockstar, Ubisoft, EA...) ni SteamGridDB configurado.
// Usa la API pública de Wikipedia (pageimages), la misma que ya usamos para
// las fotos de consolas retro. A diferencia de Wikimedia Commons (que exige
// licencia libre), los artículos de Wikipedia SÍ pueden alojar la carátula
// oficial bajo uso legítimo/fair use, así que suele encontrarla para juegos
// conocidos. No hay fallback de Commons aquí porque Commons casi nunca tiene
// carátulas de videojuegos (con copyright) por esa misma razón de licencia.
const store = require('../util/store');

const UA = 'MegaHUB-Prototype/0.2 (aplicación de escritorio local, sin despliegue público)';

// Sube esto cada vez que cambie la lógica de MATCHING de arriba (por ejemplo
// el fix de fetchInfoboxImage() que prioriza el nombre de archivo sobre "la
// primera imagen de la página"). Solo se cachean resultados positivos, así
// que un match MALO de antes del fix (visto en vivo: "Dante's Inferno" tenía
// cacheada la foto del actor de doblaje en vez de la carátula) se queda
// pegado para siempre — nunca se vuelve a intentar porque ya "tiene" un
// resultado. Bumpear la versión invalida ese caché viejo una sola vez y deja
// que todo se resuelva de nuevo con la lógica actual.
const CACHE_VERSION = 2;

function getCache() {
  const raw = store.load('wikipedia-cover-cache', { v: CACHE_VERSION, entries: {} });
  // Compat: el caché viejo (pre-versión) era un objeto plano {titulo: url}.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.entries) {
    return { v: CACHE_VERSION, entries: {} };
  }
  if (raw.v !== CACHE_VERSION) return { v: CACHE_VERSION, entries: {} };
  return raw;
}

// Nombres de archivo que casi nunca son la carátula (candados de protección,
// insignias de "artículo destacado", logos de Wikipedia/Commons, iconos de
// categoría...). Filtrarlos evita que el primer .png/.jpg "de decoración" de
// la página gane por delante de la carátula real.
const JUNK_IMAGE_RE = /^(semi-protection|protection|padlock|cscr-|commons-logo|wiki|ooj|symbol_category|folder|ambox|edit-icon|wpvg_icon)/i;

async function fetchPageImage(pageId) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&pageids=' + pageId +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const page = json.query && json.query.pages && json.query.pages[pageId];
  return (page && page.thumbnail && page.thumbnail.source) || null;
}

function titleWords(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length >= 4);
}

// Respaldo para artículos donde la extensión PageImages no detecta una imagen
// (visto en varios juegos con infobox "normal"): se lee la lista cruda de
// imágenes de la página vía action=parse. Verificado en vivo el bug real que
// esto corrige: en "Dante's Inferno (video game)" la PRIMERA imagen no-basura
// de la lista es la foto del actor de doblaje (Graham_McTavish_by_...jpg, de
// la sección "Cast"), y la carátula real (Dante's_Inferno.jpg) queda 3ª —
// tomar "la primera" a ciegas daba justo esa foto de actor en vez de la
// carátula. Ahora se prioriza cualquier imagen cuyo nombre de archivo
// comparta una palabra significativa con el título buscado (la carátula casi
// siempre se llama como el juego; una foto de reparto casi nunca).
async function fetchInfoboxImage(pageId, searchTitle) {
  const listUrl = 'https://en.wikipedia.org/w/api.php?action=parse&pageid=' + pageId +
    '&prop=images&format=json';
  const res = await fetch(listUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = await res.json();
  const images = (json.parse && json.parse.images) || [];
  const candidates = images.filter(name => !/\.svg$/i.test(name) && !JUNK_IMAGE_RE.test(name));
  if (!candidates.length) return null;
  const words = titleWords(searchTitle || '');
  const titled = words.length
    ? candidates.filter(name => {
        const nameWords = titleWords(name);
        return words.some(w => nameWords.includes(w));
      })
    : [];
  const candidate = titled[0] || candidates[0];

  const infoUrl = 'https://en.wikipedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + candidate) + '&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json';
  const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': UA } });
  if (!infoRes.ok) return null;
  const infoJson = await infoRes.json();
  const page = infoJson.query && Object.values(infoJson.query.pages)[0];
  const ii = page && page.imageinfo && page.imageinfo[0];
  return (ii && (ii.thumburl || ii.url)) || null;
}

async function getGameCover(title) {
  if (!title) return null;
  const norm = title.toLowerCase().trim();
  const cache = getCache();
  if (Object.prototype.hasOwnProperty.call(cache.entries, norm)) return cache.entries[norm];

  let url = null;
  try {
    // generator=search con "<título> video game" prioriza el artículo del
    // juego sobre el del estudio/franquicia/película homónima.
    const searchUrl = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      encodeURIComponent(title + ' video game') + '&gsrlimit=1&format=json';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(searchUrl, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json();
      const pages = json.query && json.query.pages;
      const page = pages && Object.values(pages)[0];
      const pageId = page && page.pageid;
      if (pageId) {
        url = await fetchPageImage(pageId);
        if (!url) url = await fetchInfoboxImage(pageId, title);
      }
    }
  } catch {
    url = null;
  }
  // Solo se cachean resultados positivos — un fallo transitorio (sin red, rate
  // limit) no debe congelar "sin portada" para siempre.
  if (url) {
    cache.entries[norm] = url;
    store.save('wikipedia-cover-cache', cache);
  }
  return url;
}

module.exports = { getGameCover };
