const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { NON_GAME_APPIDS } = require('../services/steamKnownApps');

function getSteamPath() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8' });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) return m[1].trim().replace(/\//g, '\\');
  } catch {}
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
  const steamPath = getSteamPath();
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
        });
      } catch {}
    }
  }
  return games;
};

module.exports.getSteamPath = getSteamPath;
