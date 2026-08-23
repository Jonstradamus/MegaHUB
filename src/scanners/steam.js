const fs = require('fs');
const path = require('path');
const { regQuery } = require('../util/regQuery');
const { NON_GAME_APPIDS } = require('../services/steamKnownApps');

async function getSteamPath() {
  const out = await regQuery('HKCU\\Software\\Valve\\Steam', ['/v', 'SteamPath']);
  const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
  if (m) return m[1].trim().replace(/\//g, '\\');
  const fallback = 'C:\\Program Files (x86)\\Steam';
  return fs.existsSync(fallback) ? fallback : null;
}

function getLibraryFolders(steamPath) {
  const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
  const libs = [path.join(steamPath, 'steamapps')];
  if (!fs.existsSync(vdfPath)) return libs;
  const vdf = fs.readFileSync(vdfPath, 'utf8');
  for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
    const p = path.join(m[1].replace(/\\\\/g, '\\'), 'steamapps');
    if (fs.existsSync(p) && !libs.includes(p)) libs.push(p);
  }
  return libs;
}

module.exports = async function scanSteam() {
  const steamPath = await getSteamPath();
  if (!steamPath) return [];
  const games = [];
  const seen = new Set();
  for (const lib of getLibraryFolders(steamPath)) {
    let files = [];
    try { files = fs.readdirSync(lib).filter(f => /^appmanifest_\d+\.acf$/.test(f)); } catch { continue; }
    for (const file of files) {
      try {
        const acf = fs.readFileSync(path.join(lib, file), 'utf8');
        const appid = (acf.match(/"appid"\s+"(\d+)"/) || [])[1];
        const name = (acf.match(/"name"\s+"([^"]+)"/) || [])[1];
        const sizeOnDisk = (acf.match(/"SizeOnDisk"\s+"(\d+)"/) || [])[1];
        const installdir = (acf.match(/"installdir"\s+"([^"]+)"/) || [])[1];
        if (!appid || !name || NON_GAME_APPIDS.has(appid) || seen.has(appid)) continue;
        seen.add(appid);
        games.push({
          id: `steam-${appid}`,
          title: name,
          platform: 'steam',
          launchUri: `steam://rungameid/${appid}`,
          coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_600x900.jpg`,
          heroUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_hero.jpg`,
          // Exacto — Steam ya lo trackea en el manifiesto, sin necesidad de recorrer la carpeta.
          installSizeBytes: sizeOnDisk ? parseInt(sizeOnDisk, 10) : null,
          // Para el monitor de procesos (processWatcher.js): Steam no escribe el
          // acumulado de horas jugadas en localconfig.vdf hasta que CIERRAS el
          // juego (visto real: 0 minutos nuevos con una sesión de Albion Online
          // corriendo hace rato), así que una sesión en curso no se refleja en
          // "esta semana" hasta que termine. Con installDir, el watcher puede
          // detectar el .exe corriendo AHORA, igual que ya hace con Xbox.
          installDir: installdir ? path.join(lib, 'common', installdir) : null,
        });
      } catch {}
    }
  }
  return games;
};

module.exports.getSteamPath = getSteamPath;
