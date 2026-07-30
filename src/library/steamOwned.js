const fs = require('fs');
const path = require('path');
const store = require('../util/store');
const { NON_GAME_APPIDS } = require('../services/steamKnownApps');

// Extrae el bloque "apps" { ... } de localconfig.vdf contando llaves
function extractAppsBlock(vdf) {
  const idx = vdf.search(/"apps"\s*\{/i);
  if (idx === -1) return null;
  let depth = 0;
  const start = vdf.indexOf('{', idx);
  for (let i = start; i < vdf.length; i++) {
    if (vdf[i] === '{') depth++;
    else if (vdf[i] === '}' && --depth === 0) return vdf.slice(start, i + 1);
  }
  return null;
}

module.exports = async function steamOwned(steamPath, installedIds) {
  if (!steamPath) return [];
  const userdata = path.join(steamPath, 'userdata');
  if (!fs.existsSync(userdata)) return [];
  const appids = new Set();
  for (const acc of fs.readdirSync(userdata)) {
    const cfg = path.join(userdata, acc, 'config', 'localconfig.vdf');
    try {
      const block = extractAppsBlock(fs.readFileSync(cfg, 'utf8'));
      if (!block) continue;
      for (const m of block.matchAll(/"(\d+)"\s*\{/g)) appids.add(m[1]);
    } catch {}
  }
  if (!appids.size) return [];

  // Nombres desde el caché de metadata (se van resolviendo con appdetails)
  const metaCache = store.load('steam-meta', {});
  const games = [];
  for (const appid of appids) {
    if (NON_GAME_APPIDS.has(appid) || installedIds.has(`steam-${appid}`)) continue;
    const cached = metaCache[appid];
    // Si ya sabemos que no existe en la tienda (DLC retirado, herramienta interna), lo saltamos
    if (cached && cached.meta === null) continue;
    if (cached && cached.meta && cached.meta.type && cached.meta.type !== 'game') continue;
    const name = cached && cached.meta && cached.meta.name;
    games.push({
      id: `steam-${appid}`,
      title: name || `Steam App ${appid}`,
      needsName: !name,
      platform: 'steam', installed: false,
      installUri: `steam://install/${appid}`,
      coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_600x900.jpg`,
      heroUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_hero.jpg`,
    });
  }
  return games;
};
