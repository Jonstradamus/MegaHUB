const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getRiotGameData } = require('../services/riotRequirements');

const INSTALLS_JSON = 'C:\\ProgramData\\Riot Games\\RiotClientInstalls.json';
const METADATA_DIR = 'C:\\ProgramData\\Riot Games\\Metadata';

const PRODUCT_NAMES = {
  league_of_legends: 'League of Legends',
  valorant: 'VALORANT',
  bacon: 'Legends of Runeterra',
  lor: 'Legends of Runeterra',
  teamfighttactics: 'Teamfight Tactics',
  lion: '2XKO',
  '2xko': '2XKO',
};

function getRiotClient() {
  try {
    const data = JSON.parse(fs.readFileSync(INSTALLS_JSON, 'utf8'));
    const p = data.rc_default || data.rc_live;
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return null;
}

module.exports = async function scanRiot() {
  const client = getRiotClient();
  if (!client || !fs.existsSync(METADATA_DIR)) return [];
  const games = [];
  for (const dir of fs.readdirSync(METADATA_DIR)) {
    const m = dir.match(/^(.+)\.(live|pbe)$/);
    if (!m) continue;
    const [, product, patchline] = m;
    // Verificar que el producto realmente tiene archivos de instalación
    try {
      if (!fs.readdirSync(path.join(METADATA_DIR, dir)).length) continue;
    } catch { continue; }
    if (patchline !== 'live') continue;
    const title = PRODUCT_NAMES[product] || product.replace(/_/g, ' ');
    const data = getRiotGameData(product);
    games.push({
      id: `riot-${product}`,
      title, platform: 'riot', installed: true,
      riotClient: client, riotProduct: product,
      coverUrl: null,
      // Riot no publica un tamaño exacto por API — se usa una cifra oficial
      // curada a mano (ver riotRequirements.js), no un valor inventado.
      installSizeBytes: data ? data.installSizeBytes : null,
    });
  }
  return games;
};

module.exports.launch = function launchRiot(game) {
  spawn(game.riotClient, [`--launch-product=${game.riotProduct}`, '--launch-patchline=live'],
    { detached: true, stdio: 'ignore' }).unref();
};
