const { execFileSync } = require('child_process');
const path = require('path');
const store = require('../util/store');

function regQuery(key) {
  try {
    return execFileSync('reg', ['query', key, '/s'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function getCoverCache() {
  return store.load('gog-cover-cache', {});
}

// catalog.gog.com es el mismo backend público (sin key) que usa la tienda de
// GOG para renderizar sus grids — trae "coverVertical", una portada tipo
// carátula mucho mejor que el "logo2x" horizontal de la vieja api.gog.com.
// No admite búsqueda por ID directamente, así que buscamos por título y
// preferimos el resultado cuyo ID coincide exactamente con el instalado.
async function fetchGogCover(productId, title) {
  const cache = getCoverCache();
  if (Object.prototype.hasOwnProperty.call(cache, productId)) return cache[productId];

  let url = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      `https://catalog.gog.com/v1/catalog?query=like:${encodeURIComponent(title)}&order=desc:trending&limit=10`,
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const products = data.products || [];
      const exact = products.find(p => String(p.id) === String(productId));
      const best = exact || products[0];
      url = (best && best.coverVertical) || null;
    }
  } catch {
    url = null;
  }
  // Solo se cachea un resultado positivo — un fallo de red no debe congelar
  // "sin portada" para siempre.
  if (url) {
    cache[productId] = url;
    store.save('gog-cover-cache', cache);
  }
  return url;
}

module.exports = async function scanGog() {
  const out = regQuery('HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games') || regQuery('HKLM\\SOFTWARE\\GOG.com\\Games');
  if (!out) return [];
  const games = [];
  // Bloques por subclave: HKEY...\Games\<productId> seguido de sus valores
  const blocks = out.split(/(?=HKEY_LOCAL_MACHINE\\[^\r\n]*\\Games\\\d+)/);
  for (const block of blocks) {
    const idMatch = block.match(/\\Games\\(\d+)/);
    if (!idMatch) continue;
    const val = (name) => {
      const m = block.match(new RegExp(name + '\\s+REG_SZ\\s+(.+)'));
      return m ? m[1].trim() : null;
    };
    const title = val('gameName');
    const exe = val('exe');
    if (!title || !exe) continue;
    games.push({
      id: `gog-${idMatch[1]}`,
      title,
      platform: 'gog',
      exePath: exe,
      workDir: val('workingDir') || path.dirname(exe),
      coverUrl: await fetchGogCover(idMatch[1], title),
    });
  }
  return games;
};
