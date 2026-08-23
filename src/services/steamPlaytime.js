// Horas jugadas REALES de Steam, leídas directo de localconfig.vdf (el mismo
// archivo que ya usa src/library/steamOwned.js para saber qué juegos tienes).
// Es texto plano, con "Playtime" (minutos totales) y "LastPlayed" (timestamp
// Unix) por appid — el mismo dato exacto que muestra tu perfil de Steam. No
// hace falta trackear nada nosotros mismos: Steam ya lo mide con precisión.
const fs = require('fs');
const path = require('path');
const scanSteam = require('../scanners/steam');

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

// Extrae, para cada "<appid> { ... }" del bloque, su propio sub-bloque
// (respetando llaves anidadas como "cloud" o "BadgeData") para poder leer
// Playtime/LastPlayed de CADA juego sin mezclarlos entre sí.
function splitAppBlocks(appsBlock) {
  const out = {};
  const re = /"(\d+)"\s*\{/g;
  let m;
  while ((m = re.exec(appsBlock))) {
    const appid = m[1];
    const start = appsBlock.indexOf('{', m.index);
    let depth = 0, end = start;
    for (let i = start; i < appsBlock.length; i++) {
      if (appsBlock[i] === '{') depth++;
      else if (appsBlock[i] === '}' && --depth === 0) { end = i; break; }
    }
    out[appid] = appsBlock.slice(start, end + 1);
    re.lastIndex = end + 1;
  }
  return out;
}

// { [appid]: { playtimeMinutes, lastPlayed(ms) } } — combinando todas las
// cuentas locales de Steam en este PC, quedándose con el valor más alto por
// juego (si varias han jugado el mismo título).
async function getAllPlaytimes() {
  const steamPath = await scanSteam.getSteamPath();
  if (!steamPath) return {};
  const userdata = path.join(steamPath, 'userdata');
  let accounts;
  try { accounts = fs.readdirSync(userdata); } catch { return {}; }

  const result = {};
  for (const acc of accounts) {
    const cfgPath = path.join(userdata, acc, 'config', 'localconfig.vdf');
    let vdf;
    try { vdf = fs.readFileSync(cfgPath, 'utf8'); } catch { continue; }
    const appsBlock = extractAppsBlock(vdf);
    if (!appsBlock) continue;
    const blocks = splitAppBlocks(appsBlock);
    for (const [appid, block] of Object.entries(blocks)) {
      const playtimeMatch = block.match(/"Playtime"\s*"(\d+)"/);
      const lastPlayedMatch = block.match(/"LastPlayed"\s*"(\d+)"/);
      if (!playtimeMatch) continue;
      const minutes = Number(playtimeMatch[1]);
      const lastPlayed = lastPlayedMatch ? Number(lastPlayedMatch[1]) * 1000 : null;
      const existing = result[appid];
      if (!existing || minutes > existing.playtimeMinutes) {
        result[appid] = { playtimeMinutes: minutes, lastPlayed };
      }
    }
  }
  return result;
}

module.exports = { getAllPlaytimes };
