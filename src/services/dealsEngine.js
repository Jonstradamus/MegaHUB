// Ofertas de Steam/GOG/Epic (+ el resto de tiendas que trackea CheapShark, API
// pública sin clave) agrupadas por tienda, más una sección "Recomendado para
// ti" según qué microgénero juega más el usuario (horas reales de Steam, ya
// leídas por steamPlaytime.js para el motor de logros, cruzadas con un mapa
// curado a mano — Steam solo da géneros amplios como "Acción"/"RPG", no
// alcanza para detectar "soulslike" o "roguelike").
//
// Nota sobre Eneba: CheapShark (la fuente que usamos, gratis y sin clave) no
// trackea Eneba — no está en su lista de tiendas. No fabricamos precios para
// ella; si en el futuro se agrega otra fuente (p.ej. IsThereAnyDeal, que sí
// cubre Eneba pero pide una API key propia) se puede sumar acá.
//
// Todos los steamAppID de abajo fueron verificados contra la propia API de
// CheapShark (GET /games?title=...) al escribir este archivo — no son adivinados.
const store = require('../util/store');
const steamPlaytimeSvc = require('./steamPlaytime');
const { getSteamMeta } = require('./metadata');

const CHEAPSHARK = 'https://www.cheapshark.com/api/1.0';
const STORE_NAMES = {
  1: 'Steam', 2: 'GamersGate', 3: 'GreenManGaming', 7: 'GOG', 11: 'Humble Store',
  13: 'Uplay', 15: 'Fanatical', 21: 'WinGameStore', 23: 'GameBillet', 25: 'Epic Games',
  27: 'Gamesplanet', 28: 'Gamesload', 30: 'IndieGala', 35: 'DreamGame',
};
// Las 3 que pidió el usuario tienen su propia sección; el resto de tiendas
// activas de CheapShark cae en "Otras tiendas".
const MAIN_STORE_IDS = { steam: 1, gog: 7, epic: 25 };
const OTHER_STORE_IDS = [11, 15, 3, 21, 23, 27, 28, 30, 35, 2, 13];

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — ofertas no cambian tan seguido

// appid de Steam -> microgénero curado a mano.
const GAME_TAGS = {
  1245620: 'soulslike',  // Elden Ring
  374320: 'soulslike',   // Dark Souls III
  570940: 'soulslike',   // Dark Souls Remastered
  236430: 'soulslike',   // Dark Souls II
  814380: 'soulslike',   // Sekiro: Shadows Die Twice
  1627720: 'soulslike',  // Lies of P
  1325200: 'soulslike',  // Nioh 2
  1282100: 'soulslike',  // Remnant II
  1501750: 'soulslike',  // Lords of the Fallen (2023)

  1145360: 'roguelike',  // Hades
  1145350: 'roguelike',  // Hades II
  646570: 'roguelike',   // Slay the Spire
  588650: 'roguelike',   // Dead Cells
  262060: 'roguelike',   // Darkest Dungeon
  1794680: 'roguelike',  // Vampire Survivors

  367520: 'metroidvania',  // Hollow Knight
  1030300: 'metroidvania', // Hollow Knight: Silksong
  1057090: 'metroidvania', // Ori and the Will of the Wisps
  387290: 'metroidvania',  // Ori and the Blind Forest: DE

  1086940: 'openworld-rpg', // Baldur's Gate 3
  1091500: 'openworld-rpg', // Cyberpunk 2077
  292030: 'openworld-rpg',  // The Witcher 3: Wild Hunt

  1196590: 'survival-horror', // Resident Evil Village
  739630: 'survival-horror',  // Phasmophobia

  949230: 'citybuilder-strategy',  // Cities: Skylines II
  1601580: 'citybuilder-strategy', // Frostpunk 2
  289070: 'citybuilder-strategy',  // Sid Meier's Civilization VI

  1551360: 'racing', // Forza Horizon 5

  1364780: 'fighting', // Street Fighter 6

  782330: 'shooter-looter', // DOOM Eternal
  548430: 'shooter-looter', // Deep Rock Galactic

  1687950: 'jrpg', // Persona 5 Royal

  413150: 'cozy-survival', // Stardew Valley
  892970: 'cozy-survival', // Valheim
};

const TAG_LABELS = {
  'soulslike': 'soulslikes',
  'roguelike': 'roguelikes',
  'metroidvania': 'metroidvanias',
  'openworld-rpg': 'RPG de mundo abierto',
  'survival-horror': 'terror y supervivencia',
  'citybuilder-strategy': 'gestión y estrategia',
  'racing': 'carreras',
  'fighting': 'juegos de lucha',
  'shooter-looter': 'shooters',
  'jrpg': 'JRPG',
  'cozy-survival': 'supervivencia/vida tranquila',
};

// Candidatos recomendados por microgénero — {appid, title}. Se filtran en
// runtime los que el usuario ya tiene (vía playtime de Steam).
const RECOMMENDATIONS = {
  'soulslike': [
    { appid: 2358720, title: 'Black Myth: Wukong' },
    { appid: 1627720, title: 'Lies of P' },
    { appid: 1501750, title: 'Lords of the Fallen' },
    { appid: 1282100, title: 'Remnant II' },
  ],
  'roguelike': [
    { appid: 1145350, title: 'Hades II' },
    { appid: 588650, title: 'Dead Cells' },
    { appid: 646570, title: 'Slay the Spire' },
    { appid: 1794680, title: 'Vampire Survivors' },
  ],
  'metroidvania': [
    { appid: 1030300, title: 'Hollow Knight: Silksong' },
    { appid: 1057090, title: 'Ori and the Will of the Wisps' },
    { appid: 367520, title: 'Hollow Knight' },
  ],
  'openworld-rpg': [
    { appid: 1086940, title: "Baldur's Gate 3" },
    { appid: 1091500, title: 'Cyberpunk 2077' },
    { appid: 292030, title: 'The Witcher 3: Wild Hunt' },
  ],
  'survival-horror': [
    { appid: 1196590, title: 'Resident Evil Village' },
    { appid: 739630, title: 'Phasmophobia' },
  ],
  'citybuilder-strategy': [
    { appid: 949230, title: 'Cities: Skylines II' },
    { appid: 1601580, title: 'Frostpunk 2' },
    { appid: 289070, title: "Sid Meier's Civilization VI" },
  ],
  'racing': [
    { appid: 1551360, title: 'Forza Horizon 5' },
  ],
  'fighting': [
    { appid: 1364780, title: 'Street Fighter 6' },
  ],
  'shooter-looter': [
    { appid: 782330, title: 'DOOM Eternal' },
    { appid: 548430, title: 'Deep Rock Galactic' },
  ],
  'jrpg': [
    { appid: 1687950, title: 'Persona 5 Royal' },
  ],
  'cozy-survival': [
    { appid: 413150, title: 'Stardew Valley' },
    { appid: 892970, title: 'Valheim' },
  ],
};

// Respaldo cuando ningún juego jugado está en GAME_TAGS: usa el género amplio
// de Steam (en español, igual que el filtro "Género" del sidebar) más frecuente.
const GENRE_FALLBACK = {
  'RPG': 'openworld-rpg',
  'Aventura': 'openworld-rpg',
  'Estrategia': 'citybuilder-strategy',
  'Simulación': 'citybuilder-strategy',
  'Carreras': 'racing',
  'Deportes': 'fighting',
  'Indie': 'roguelike',
  'Casual': 'cozy-survival',
  'Acción': 'shooter-looter',
};

function getDealsCache() {
  return store.load('deals-cache', {});
}
function saveDealsCache(data) {
  store.save('deals-cache', data);
}

// CheapShark rechaza con 400 cualquier request sin un User-Agent descriptivo
// (el fetch de Node/Electron manda uno genérico) — sin este header, TODAS las
// llamadas de abajo fallaban en silencio y el panel solo mostraba el respaldo
// de la recomendación (sin precio real), nunca las listas por tienda.
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MegaHUB/1.0 (https://github.com/deriva-app/megahub)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function mapDeal(d) {
  const releaseDate = Number(d.releaseDate);
  return {
    dealID: d.dealID,
    title: d.title,
    storeID: Number(d.storeID),
    storeName: STORE_NAMES[d.storeID] || `Tienda ${d.storeID}`,
    salePrice: Number(d.salePrice),
    normalPrice: Number(d.normalPrice),
    savings: Math.round(Number(d.savings)),
    thumb: d.thumb || null,
    steamAppID: d.steamAppID || null,
    dealLink: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
    // Viene gratis en la misma respuesta de /deals — sin llamadas extra.
    // "0" de CheapShark significa "sin dato", no una nota real de 0.
    releaseYear: releaseDate > 0 ? new Date(releaseDate * 1000).getFullYear() : null,
    metacriticScore: Number(d.metacriticScore) > 0 ? Number(d.metacriticScore) : null,
    steamRatingPercent: Number(d.steamRatingCount) > 0 ? Number(d.steamRatingPercent) : null,
    // Puntaje propio de CheapShark (0-10): combina % de descuento CON qué tan
    // bueno es el juego (reseñas) — ordenar por esto en vez de por "Savings" a
    // secas es lo que evita que la lista se llene de asset-flips sin una sola
    // reseña con un "-95%" inflado (precio de lista falso desde el día 1).
    dealRating: Number(d.dealRating) || 0,
  };
}

function dedupeByTitle(deals) {
  const byTitle = new Map();
  for (const d of deals) {
    const key = d.title.toLowerCase();
    const existing = byTitle.get(key);
    if (!existing || d.salePrice < existing.salePrice) byTitle.set(key, d);
  }
  return [...byTitle.values()].sort((a, b) => b.dealRating - a.dealRating);
}

async function fetchStoreDeals(storeID, pageSize = 30) {
  const raw = await fetchJson(`${CHEAPSHARK}/deals?storeID=${storeID}&onSale=1&sortBy=${encodeURIComponent('Deal Rating')}&pageSize=${pageSize}`);
  return raw.map(mapDeal).filter(d => d.salePrice > 0 && d.savings >= 5);
}

// Mejores ofertas actuales, agrupadas por tienda: { steam, gog, epic, other, errors }.
// force=true (botón "Actualizar" de la UI) ignora la caché de 6h en disco.
async function getTopDeals({ force = false } = {}) {
  const cache = getDealsCache();
  if (!force && cache.top && Date.now() - cache.top.at < CACHE_TTL) return cache.top.value;

  const errors = [];
  async function safeFetch(label, storeIDs) {
    try {
      const perStore = await Promise.all(storeIDs.map(id => fetchStoreDeals(id)));
      return dedupeByTitle(perStore.flat());
    } catch (e) {
      errors.push(label);
      return null;
    }
  }

  const [steam, gog, epic, other] = await Promise.all([
    safeFetch('Steam', [MAIN_STORE_IDS.steam]),
    safeFetch('GOG', [MAIN_STORE_IDS.gog]),
    safeFetch('Epic Games', [MAIN_STORE_IDS.epic]),
    safeFetch('Otras tiendas', OTHER_STORE_IDS),
  ]);

  const value = {
    steam: steam || (cache.top && cache.top.value.steam) || [],
    gog: gog || (cache.top && cache.top.value.gog) || [],
    epic: epic || (cache.top && cache.top.value.epic) || [],
    other: other || (cache.top && cache.top.value.other) || [],
    errors,
  };
  cache.top = { at: Date.now(), value };
  saveDealsCache(cache);
  return value;
}

// Precio/estado actual (oferta o no) de un juego puntual de Steam, vía su appid.
// OJO: /games?steamAppID=X devuelve un ARRAY tipo búsqueda (solo el precio más
// barato, sin desglose por tienda) — para el detalle con precio por tienda hay
// que resolver primero su gameID y volver a pedir /games?id=<gameID>.
async function getDealForSteamApp(appid) {
  try {
    const matches = await fetchJson(`${CHEAPSHARK}/games?steamAppID=${appid}`);
    const match = Array.isArray(matches) && matches.find(m => String(m.steamAppID) === String(appid));
    if (!match) return null;
    const json = await fetchJson(`${CHEAPSHARK}/games?id=${match.gameID}`);
    const info = json && json.info;
    if (!info) return null;
    const allowed = new Set([...Object.values(MAIN_STORE_IDS), ...OTHER_STORE_IDS]);
    const candidates = (json.deals || []).filter(d => allowed.has(Number(d.storeID)));
    if (!candidates.length) return null;
    const best = candidates.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
    const normalPrice = Number(best.retailPrice);
    const salePrice = Number(best.price);
    return {
      title: info.title,
      thumb: info.thumb || null,
      storeID: Number(best.storeID),
      storeName: STORE_NAMES[best.storeID] || `Tienda ${best.storeID}`,
      salePrice,
      normalPrice,
      savings: normalPrice > 0 ? Math.round((1 - salePrice / normalPrice) * 100) : 0,
      steamAppID: String(appid),
      dealLink: best.dealID ? `https://www.cheapshark.com/redirect?dealID=${best.dealID}` : `https://store.steampowered.com/app/${appid}`,
    };
  } catch {
    return null;
  }
}

function fallbackGame(c) {
  return {
    title: c.title,
    steamAppID: String(c.appid),
    thumb: `https://cdn.akamai.steamstatic.com/steam/apps/${c.appid}/header.jpg`,
    storeName: 'Steam',
    salePrice: null, normalPrice: null, savings: 0,
    dealLink: `https://store.steampowered.com/app/${c.appid}`,
  };
}

// Recomendación personalizada: microgénero dominante según horas jugadas reales
// de Steam + hasta 4 candidatos de ese microgénero que el usuario aún no tenga
// (con precio actual — en oferta o no).
async function getRecommendations({ force = false } = {}) {
  const cache = getDealsCache();
  if (!force && cache.reco && Date.now() - cache.reco.at < CACHE_TTL) return cache.reco.value;

  const playtimes = await steamPlaytimeSvc.getAllPlaytimes();
  const ownedAppids = new Set(Object.keys(playtimes).map(String));
  const metaCache = store.load('steam-meta', {});

  const tagScores = {};
  const genreCounts = {};
  for (const [appid, pt] of Object.entries(playtimes)) {
    const weight = Math.log2(1 + (pt.playtimeMinutes || 0));
    const tag = GAME_TAGS[Number(appid)];
    if (tag) tagScores[tag] = (tagScores[tag] || 0) + Math.max(weight, 0.5);
    const meta = metaCache[appid] && metaCache[appid].meta;
    for (const g of (meta && meta.genres) || []) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }

  let topTag = Object.entries(tagScores).sort((a, b) => b[1] - a[1])[0]?.[0];
  let reasonKind = 'played';
  if (!topTag) {
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    topTag = topGenre && GENRE_FALLBACK[topGenre];
    reasonKind = 'genre';
  }
  if (!topTag) {
    const value = null;
    cache.reco = { at: Date.now(), value };
    saveDealsCache(cache);
    return value;
  }

  const candidates = (RECOMMENDATIONS[topTag] || []).filter(c => !ownedAppids.has(String(c.appid))).slice(0, 4);
  const resolved = await Promise.all(candidates.map(async c => {
    const deal = await getDealForSteamApp(c.appid);
    const game = deal ? { ...deal, title: deal.title || c.title } : fallbackGame(c);
    // El endpoint de detalle de CheapShark no trae año ni puntuación (a
    // diferencia de /deals?storeID=, ver mapDeal) — para estos candidatos
    // (siempre Steam) se completa con la propia ficha de Steam, que MegaHUB
    // ya pide igual para la biblioteca y cachea en disco.
    const meta = await getSteamMeta(c.appid).catch(() => null);
    game.releaseYear = meta && meta.releaseTs ? new Date(meta.releaseTs).getFullYear() : null;
    game.metacriticScore = (meta && meta.metacriticScore) || null;
    game.steamRatingPercent = null;
    return game;
  }));
  const value = resolved.length ? { tag: topTag, tagLabel: TAG_LABELS[topTag] || topTag, reasonKind, games: resolved } : null;
  cache.reco = { at: Date.now(), value };
  saveDealsCache(cache);
  return value;
}

module.exports = { getTopDeals, getRecommendations };
