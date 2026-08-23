const fs = require('fs');
const { spawn } = require('child_process');
const { regQuery } = require('../util/regQuery');

// Mapa nombre de juego → código de producto de Battle.net (para lanzar)
const PRODUCT_CODES = [
  [/world of warcraft classic/i, 'wow_classic'],
  [/world of warcraft/i, 'WoW'],
  [/overwatch/i, 'Pro'],
  [/diablo iv|diablo 4/i, 'Fen'],
  [/diablo iii|diablo 3/i, 'D3'],
  [/diablo ii.*resurrected/i, 'OSI'],
  [/diablo immortal/i, 'ANBS'],
  [/hearthstone/i, 'WTCG'],
  [/starcraft ii|starcraft 2/i, 'S2'],
  [/starcraft.*remastered|^starcraft$/i, 'S1'],
  [/heroes of the storm/i, 'Hero'],
  [/warcraft.*(iii|3).*reforged/i, 'W3'],
  [/warcraft rumble/i, 'GRY'],
  [/crash bandicoot 4/i, 'WLBY'],
];

function findBnetExe() {
  for (const p of [
    'C:\\Program Files (x86)\\Battle.net\\Battle.net Launcher.exe',
    'C:\\Program Files (x86)\\Battle.net\\Battle.net.exe',
    'C:\\Program Files\\Battle.net\\Battle.net.exe',
  ]) if (fs.existsSync(p)) return p;
  return null;
}

module.exports = async function scanBattlenet() {
  const bnetExe = findBnetExe();
  if (!bnetExe) return [];
  const games = [];
  for (const hive of [
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ]) {
    const out = await regQuery(hive);
    if (!out) continue;
    for (const block of out.split(/(?=HKEY_LOCAL_MACHINE\\)/)) {
      if (!/UninstallString\s+REG_SZ\s+.*Battle\.net/i.test(block)) continue;
      const name = (block.match(/DisplayName\s+REG_SZ\s+(.+)/) || [])[1];
      if (!name || /^battle\.net$/i.test(name.trim())) continue;
      const rawTitle = name.trim();
      const code = (PRODUCT_CODES.find(([re]) => re.test(rawTitle)) || [])[1] || null;
      // Battle.net registra builds de PTR/Beta como productos de desinstalación
      // aparte ("World of Warcraft Public Test 3", "... Beta", etc.) — el
      // DisplayName crudo de cada uno es distinto aunque sea el mismo juego,
      // así que sin normalizar aparecían como entradas separadas en DERIVA.
      // Se usa el mismo `code` que ya decide cómo lanzar el juego (distingue
      // retail de Classic) para elegir un título canónico.
      const title = code === 'wow_classic' ? 'World of Warcraft Classic'
        : code === 'WoW'                  ? 'World of Warcraft'
        : rawTitle;
      const id = `bnet-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (games.some(g => g.id === id)) continue;
      const sizeMatch = block.match(/EstimatedSize\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
      games.push({
        id, title, platform: 'battlenet', installed: true,
        bnetCode: code, bnetExe,
        coverUrl: null,
        installSizeBytes: sizeMatch ? parseInt(sizeMatch[1], 16) * 1024 : null,
      });
    }
  }
  return games;
};

module.exports.launch = function launchBnet(game) {
  if (game.bnetCode) {
    spawn(game.bnetExe, [`--exec=launch ${game.bnetCode}`], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn(game.bnetExe, [], { detached: true, stdio: 'ignore' }).unref();
  }
};
