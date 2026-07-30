// Portadas y catálogo de juegos retro: libretro-thumbnails
// (github.com/libretro-thumbnails), el mismo repositorio público que usa el
// propio RetroArch para sus miniaturas. Sin key — verificado en vivo que
// raw.githubusercontent.com sirve las imágenes sin autenticación.
const store = require('../util/store');

// El nombre de sistema que usa RetroArch en sus playlists (ej. "Nintendo -
// Nintendo Entertainment System") coincide con el nombre del repo cambiando
// espacios por guiones bajos — no hace falta un mapeo manual por consola.
function repoFromSystem(systemName) {
  return systemName.replace(/ /g, '_');
}

function cleanTitle(filename) {
  const base = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  const cut = base.search(/[([]/);
  return (cut === -1 ? base : base.slice(0, cut)).trim();
}

function isBadVariant(filename) {
  return /\[(b|h|t|p|o)\b/i.test(filename) || /\((demo|proto|beta|sample)/i.test(filename);
}

// Relanzamientos digitales de juegos de OTRA consola (ej. clásicos de NES/SNES/
// Genesis vendidos en la Wii Shop Channel como "Virtual Console", o clásicos de
// PS1/PS2 revendidos en PSP/PS3). Se quedan en el catálogo (suelen traer mejoras
// gráficas/de definición) pero marcados como "rerelease" para distinguirlos de
// un juego nativo de la consola.
function isCrossConsoleRerelease(filename) {
  return /\((virtual console|wii virtual console|psone classic|ps1 classic|ps2 classic|xbox originals?)\)/i.test(filename);
}

function regionScore(filename) {
  if (/\(usa,\s*europe\)|\(world\)/i.test(filename)) return 3;
  if (/\(usa\)/i.test(filename)) return 2;
  if (/\(europe\)/i.test(filename)) return 1;
  return 0;
}

// La mayoría de estos repos usan "master" como rama por defecto, pero no
// todos — repos más nuevos (ej. Sega_-_Naomi) ya migraron a "main". Sin este
// fallback, ese repo devolvía 404 en silencio y el catálogo quedaba vacío
// para siempre (el error se traga más arriba y no se cachea, pero tampoco
// avisa que la rama estaba mal).
async function fetchTree(repo) {
  for (const branch of ['master', 'main']) {
    const res = await fetch(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/${branch}?recursive=1`);
    if (res.ok) {
      const json = await res.json();
      const entries = (json.tree || []).filter(t => /^Named_Boxarts\//.test(t.path) && /\.(png|jpg|jpeg)$/i.test(t.path));
      return { branch, entries };
    }
    if (res.status !== 404) throw new Error(`GitHub tree HTTP ${res.status}`);
  }
  throw new Error('GitHub tree HTTP 404 (ni master ni main)');
}

// De miles de archivos (variantes regionales, hacks, dumps malos...) se queda
// con UNA entrada limpia por título, priorizando regiones USA/World y
// descartando hacks/pruebas cuando hay alternativa.
//
// La clave de agrupación usa normalize() (quita puntuación/mayúsculas) en vez
// de un simple toLowerCase(): sin esto, "Rat Attack" y "Rat Attack!", o
// "All Star Tennis '99" y "All Star Tennis 99", sobrevivían como DOS entradas
// separadas — inflando el conteo del catálogo con el mismo juego repetido.
function buildCatalog(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const filename = entry.path.replace(/^Named_Boxarts\//, '');
    const title = cleanTitle(filename);
    if (!title) continue;
    const rerelease = isCrossConsoleRerelease(filename);
    const key = normalize(title);
    // Preferir una versión nativa sobre un relanzamiento si ambas existieran
    // bajo el mismo título exacto (raro, pero posible).
    const score = (isBadVariant(filename) ? -10 : 0) + regionScore(filename) + (rerelease ? -1 : 0);
    const existing = groups.get(key);
    if (!existing || score > existing.score) {
      groups.set(key, { title, filename, score, rerelease });
    }
  }
  return [...groups.values()]
    .map(g => ({ title: g.title, filename: g.filename, rerelease: g.rerelease }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function coverUrl(repo, branch, filename) {
  return `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/${branch}/Named_Boxarts/${encodeURIComponent(filename)}`;
}

// Cacheado permanente en disco: el listado de un sistema puede pesar varios MB
// en crudo y GitHub limita a 60 peticiones/hora sin autenticar, así que solo se
// pide una vez por sistema (salvo refresco manual futuro).
async function listCatalog(repo) {
  const cacheKey = 'retro-catalog-' + repo;
  const cached = store.load(cacheKey, null);
  if (cached) return cached;
  const { branch, entries } = await fetchTree(repo);
  const catalog = buildCatalog(entries).map(g => ({ title: g.title, coverUrl: coverUrl(repo, branch, g.filename), rerelease: g.rerelease }));
  store.save(cacheKey, catalog);
  return catalog;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function wordsOf(s) {
  return normalize(s).split(' ').filter(Boolean);
}

// Coincidencia "parcial" por PALABRAS COMPLETAS, no por substring crudo.
// Bug real que esto corrige: con substring, un ROM llamado "Dragon Ball
// Budokai Tenkaichi 3" (sin el "Z -") no encontraba coincidencia exacta y
// caía al fallback parcial — que emparejaba con el catálogo de PS2 "Ka" (un
// juego real, una demo japonesa) porque "ka" aparece dentro de "budoKAi" y
// "tenKAichi" como substring. Comparando por palabras completas, "ka" ya no
// es una de las palabras de "dragon ball budokai tenkaichi 3", así que no
// coincide — y de paso si reconoce bien el título correcto (todas las
// palabras del nombre del archivo están contenidas en las del catálogo).
function wordsMatch(aWords, bWords) {
  if (!aWords.length || !bWords.length) return false;
  const [shortW, longW] = aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords];
  // Evita que una palabra corta suelta (ej. "Ka", "Air", "Oz") empareje por
  // casualidad solo por ser corta — exige más contexto en ese caso.
  if (shortW.length === 1 && shortW[0].length < 4) return false;
  const longSet = new Set(longW);
  return shortW.every(w => longSet.has(w));
}

function matchCoverInCatalog(catalog, roughTitle) {
  if (!catalog || !catalog.length || !roughTitle) return null;
  const target = normalize(roughTitle);
  const exact = catalog.find(g => normalize(g.title) === target);
  if (exact) return exact.coverUrl;
  const targetWords = wordsOf(roughTitle);
  const partial = catalog.find(g => wordsMatch(targetWords, wordsOf(g.title)));
  return partial ? partial.coverUrl : null;
}

// Para archivos de ROM que el usuario colocó a mano en roms/<consola>/: intenta
// reconocer el título a partir del nombre de archivo (sin extensión).
async function matchLocalRoms(repo, filenames) {
  const catalog = await listCatalog(repo);
  return filenames.map(filename => {
    const base = filename.replace(/\.[^.]+$/, '');
    const target = normalize(base);
    const targetWords = wordsOf(base);
    const exact = catalog.find(g => normalize(g.title) === target);
    const partial = !exact && catalog.find(g => wordsMatch(targetWords, wordsOf(g.title)));
    const match = exact || partial || null;
    return {
      filename,
      recognized: !!match,
      title: match ? match.title : base,
      coverUrl: match ? match.coverUrl : null,
    };
  });
}

module.exports = { repoFromSystem, listCatalog, matchCoverInCatalog, matchLocalRoms };
