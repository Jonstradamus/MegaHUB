/* exported applyRetroFilters, consoleMonogram, hueFromString, moveRetro, refreshConsoleOwnedCounts, retroPrimaryAction, updateRetroGameCard */
/* global CONSOLE_REGISTRY, TEXTURE_PACK_CONSOLES, allGames, buildDerivaSearchButton, buildTexturePackButton, consoleCardEls, currentConsole:writable, escapeHtml, formatBytes, highlightMatch, icon, launchGame, launchLocalRom, localRomCounts:writable, retroCatalog:writable, retroConsoleGrid, retroConsoleSelectedIndex:writable, retroConsoleSortMode:writable, retroConsoleView, retroCountEl, retroDetailMeta, retroDetailName, retroDetailPhoto, retroDetailView, retroFilteredCatalog:writable, retroGameEls, retroGameGrid, retroGridBuilt:writable, retroOwnedFilterMode:writable, retroSearchTerm:writable, retroSelectedIndex:writable, searchInput, showToast, skeletonCardsHtml, skeletonLinesHtml, syncCoverSlot, updateMultiplayerControls, updateSearchContext, updateSidebarMode, viewMode */
/* ================= Vista Retro (consolas + catálogo) ================= */

function normalizeRetroTitle(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function ownedGamesForConsole(consoleInfo) {
  return allGames.filter(g => g.platform === 'retroarch' && g.system && g.system.replace(/ /g, '_') === consoleInfo.repo);
}

// Playlists de RetroArch (ya cotejadas, con título) + archivos sueltos en
// roms/<consola>/ (sin cotejar todavía, pero cuentan igual como "tienes algo
// ahí") — las dos fuentes reales de "obtenido" a nivel grilla.
function combinedOwnedCount(consoleInfo) {
  return ownedGamesForConsole(consoleInfo).length + (localRomCounts[consoleInfo.id] || 0);
}

async function loadLocalRomCounts() {
  try { localRomCounts = await window.megahub.retroGetLocalRomCounts(CONSOLE_REGISTRY.map(c => c.id)); }
  catch { localRomCounts = {}; }
}

async function initRetroView() {
  // Se recarga cada vez que se entra al modo retro (no solo la primera vez):
  // el usuario pudo haber agregado ROMs a mano mientras la app seguía abierta.
  await loadLocalRomCounts();
  if (!retroGridBuilt) {
    retroGridBuilt = true;
    buildConsoleGrid();
  } else if (retroConsoleSortMode === 'owned') {
    applyConsoleSort();
  } else {
    refreshConsoleOwnedCounts();
  }
}

document.querySelectorAll('#retro-console-sort .chip').forEach(c => c.classList.toggle('active', c.dataset.consort === retroConsoleSortMode));

function buildConsoleGrid() {
  consoleCardEls.clear();
  for (const c of CONSOLE_REGISTRY) {
    const card = document.createElement('div');
    card.className = 'console-card';
    card.dataset.consoleId = c.id;
    card.innerHTML = `
      <div class="console-photo-box loading">
        <span class="console-year-badge">${c.year}</span>
      </div>
      <div class="console-card-body">
        <div class="console-card-name">${escapeHtml(c.name)}</div>
        <div class="console-card-gen">${escapeHtml(c.gen)}</div>
        <div class="console-card-owned">—</div>
      </div>
    `;
    card.addEventListener('click', () => openConsoleDetail(c));
    consoleCardEls.set(c.id, card);
  }
  applyConsoleSort();
  loadConsolePhotos(CONSOLE_REGISTRY);
}

// Orden por generación: agrupa por `gen` ordenando los grupos por el año más
// temprano de cada uno (no por el orden de aparición en el registro, que
// intercala generaciones a propósito para que la grilla por año quede
// cronológica de verdad).
function sortedConsoleList() {
  if (retroConsoleSortMode === 'owned') {
    return [...CONSOLE_REGISTRY].sort((a, b) => {
      const diff = combinedOwnedCount(b) - combinedOwnedCount(a);
      return diff !== 0 ? diff : a.year - b.year;
    });
  }
  if (retroConsoleSortMode === 'gen') {
    const genMinYear = new Map();
    for (const c of CONSOLE_REGISTRY) {
      if (!genMinYear.has(c.gen) || c.year < genMinYear.get(c.gen)) genMinYear.set(c.gen, c.year);
    }
    return [...CONSOLE_REGISTRY].sort((a, b) => {
      const diff = genMinYear.get(a.gen) - genMinYear.get(b.gen);
      return diff !== 0 ? diff : a.year - b.year;
    });
  }
  return [...CONSOLE_REGISTRY].sort((a, b) => a.year - b.year);
}

function applyConsoleSort() {
  const sorted = sortedConsoleList();
  retroConsoleGrid.querySelectorAll('.console-gen-header').forEach(h => h.remove());
  let lastGen = null;
  sorted.forEach(c => {
    if (retroConsoleSortMode === 'gen' && c.gen !== lastGen) {
      lastGen = c.gen;
      const header = document.createElement('div');
      header.className = 'console-gen-header';
      header.textContent = c.gen;
      retroConsoleGrid.appendChild(header);
    }
    const el = consoleCardEls.get(c.id);
    if (el) retroConsoleGrid.appendChild(el);
  });
  refreshConsoleOwnedCounts();
}

document.getElementById('retro-console-sort').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-consort]');
  if (!btn) return;
  retroConsoleSortMode = btn.dataset.consort;
  localStorage.setItem('megahub-retro-console-sort', retroConsoleSortMode);
  document.querySelectorAll('#retro-console-sort .chip').forEach(c => c.classList.toggle('active', c === btn));
  retroConsoleSelectedIndex = -1;
  applyConsoleSort();
});

function refreshConsoleOwnedCounts() {
  for (const card of retroConsoleGrid.querySelectorAll('.console-card')) {
    const c = CONSOLE_REGISTRY.find(x => x.id === card.dataset.consoleId);
    if (!c) continue;
    const retroCount = ownedGamesForConsole(c).length;
    const localCount = localRomCounts[c.id] || 0;
    const el = card.querySelector('.console-card-owned');
    let text;
    if (retroCount && localCount) text = `${retroCount} en tu RetroArch + ${localCount} en tu carpeta`;
    else if (retroCount) text = `${retroCount} en tu RetroArch`;
    else if (localCount) text = `${localCount} archivo${localCount === 1 ? '' : 's'} en tu carpeta`;
    else text = 'Ninguno detectado';
    el.textContent = text;
    el.classList.toggle('none', !retroCount && !localCount);
  }
}

// Navegación con teclado/mando DENTRO del modo retro — antes no existía nada
// de esto, así que el teclado/mando seguía moviendo la biblioteca de PC (oculta
// detrás) en vez del modo retro. Aislado del todo: cada modo solo reacciona a
// su propio input.
function moveRetroConsoleGrid(delta) {
  const cards = [...retroConsoleGrid.querySelectorAll('.console-card')];
  if (!cards.length) return;
  const next = Math.max(0, Math.min(cards.length - 1, retroConsoleSelectedIndex + delta));
  if (next === retroConsoleSelectedIndex) return;
  retroConsoleSelectedIndex = next;
  cards.forEach((c, i) => c.classList.toggle('selected', i === next));
  cards[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}
function moveRetroGameGrid(delta) {
  if (!retroFilteredCatalog.length) return;
  const next = Math.max(0, Math.min(retroFilteredCatalog.length - 1, retroSelectedIndex + delta));
  if (next === retroSelectedIndex) return;
  retroSelectedIndex = next;
  updateRetroSelectionStyles();
  const card = retroGameGrid.children[next];
  if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  renderRetroGameDetails(retroFilteredCatalog[next]);
}
// dx/dy tratados como un único delta lineal, igual que move() en la biblioteca
// de PC — el grid no tiene una cuadrícula de columnas fija que trackear.
function moveRetro(dx, dy) {
  const delta = dx || dy;
  if (!delta) return;
  if (!currentConsole) moveRetroConsoleGrid(delta);
  else moveRetroGameGrid(delta);
}
function retroPrimaryAction() {
  if (!currentConsole) {
    const card = retroConsoleGrid.querySelectorAll('.console-card')[retroConsoleSelectedIndex];
    if (card) openConsoleDetail(CONSOLE_REGISTRY.find(c => c.id === card.dataset.consoleId));
    return;
  }
  const entry = retroFilteredCatalog[retroSelectedIndex];
  if (!entry) return;
  if (entry.owned && entry.ownedGame) launchGame(entry.ownedGame);
  else if (entry.owned && entry.romPath) launchLocalRom(entry);
}

// Hash simple y estable del id de consola -> matiz de color (0-360), para que
// el badge de respaldo (sin logo encontrado) tenga un color consistente y
// distinto por consola en vez de que todas se vean iguales.
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function consoleMonogram(name) {
  const words = name.replace(/[()]/g, '').split(/[\s/]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Oscurece un color bajando su luminosidad PERCIBIDA una cantidad fija, no
// mezclando con negro por porcentaje: verificado con luminancia real (fórmula
// BT.709) que color-mix a un % fijo daba MUCHO menos contraste en azules que
// en verdes (el canal verde pesa 0.7152 en luminancia, el azul solo 0.0722)
// — el aro de las consolas PlayStation (azul) se veía "liso" por esto, no
// por un bug de estructura. Trabajando en HSL con L absoluto en vez de RGB
// mezclado, el contraste queda parejo sin importar el matiz.
function darkenForContrast(hex, lightnessDrop) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const newL = Math.max(0.08, l - lightnessDrop);
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(newL * 100)}%)`;
}

// rgba() fijo (no color-mix()) para el glow animado del ícono: el navegador
// no interpola bien un color-mix() dentro de un @keyframes (compara los dos
// filtros como valores discretos y salta entre ellos en vez de transicionar),
// lo que se sentía como un parpadeo en vez de una respiración suave. Se
// normaliza vía canvas (no un parseo manual de hex) porque getConsoleColor
// también devuelve hsl(...) para el respaldo por hash.
let _colorCanvasCtx = null;
function colorToRgba(color, alpha) {
  if (!_colorCanvasCtx) _colorCanvasCtx = document.createElement('canvas').getContext('2d');
  _colorCanvasCtx.fillStyle = '#000';
  _colorCanvasCtx.fillStyle = color;
  const norm = _colorCanvasCtx.fillStyle;
  let r = 0, g = 0, b = 0;
  if (norm[0] === '#') {
    r = parseInt(norm.slice(1, 3), 16); g = parseInt(norm.slice(3, 5), 16); b = parseInt(norm.slice(5, 7), 16);
  } else {
    const m = norm.match(/rgba?\(([^)]+)\)/);
    if (m) [r, g, b] = m[1].split(',').map((s) => parseFloat(s));
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Botón real (letra + color) del control de cada consola — curado a mano
// por las que recuerdo con confianza razonable a partir de su control real
// (no el logo de la marca: la letra/símbolo de UN botón físico y su color de
// verdad). Las que no aparecen acá caen a la inicial del nombre + color por
// hash en vez de que se invente un dato sin verificar.
const CONSOLE_REAL_BUTTON = {
  atari2600: { letter: '●', color: '#c0392b' },       // único botón de fuego del joystick, sin letra
  arcade: { letter: '1', color: '#d8d8d8' },          // botón de inicio "1P" típico, blanco/plata
  nes: { letter: 'A', color: '#3a3a3a' },
  sms: { letter: '1', color: '#3a3a3a' },             // botones literalmente rotulados "1"/"2"
  pcengine: { letter: 'I', color: '#b0303a' },        // botones rotulados "I"/"II", rojos
  genesis: { letter: 'A', color: '#222222', shape: 'oval' }, // botones ovalados/alargados reales, no redondos
  gb: { letter: 'A', color: '#7a2f3a' },
  snes: { letter: 'A', color: '#8a6fb5' },
  gamegear: { letter: '1', color: '#333333' },
  neogeo: { letter: 'A', color: '#222222' },
  segacd: { letter: 'A', color: '#222222', shape: 'oval' }, // mismo control que Genesis
  psx: { letter: '×', color: '#3b6fd1' },
  saturn: { letter: 'A', color: '#5a5a5a' },
  n64: { letter: 'A', color: '#2f8a4b' },
  gbc: { letter: 'A', color: '#5a4f70' },
  dreamcast: { letter: 'A', color: '#8a8a92' },
  naomi: { letter: '1', color: '#c0392b' },
  ps2: { letter: '×', color: '#3b6fd1' },
  gba: { letter: 'A', color: '#5a4f8a' },
  gamecube: { letter: 'A', color: '#3fae55' },
  xbox: { letter: 'A', color: '#3fae4a' },
  nds: { letter: 'A', color: '#8a8a92' },
  psp: { letter: '×', color: '#3b6fd1' },
  xbox360: { letter: 'A', color: '#3fae4a' },
  ps3: { letter: '×', color: '#3b6fd1' },
  wii: { letter: 'A', color: '#c9cdd6' },
  intellivision: { letter: '●', color: '#c0392b' },   // botones de acción laterales, sin letra
  atari7800: { letter: '●', color: '#c0392b' },
  atarijaguar: { letter: 'A', color: '#c0392b' },
  virtualboy: { letter: 'A', color: '#c0392b' },
  // Investigados y confirmados a pedido explícito (antes caían al color por
  // hash): 3DO tiene botones A/B/C color crema/beige de verdad (confirmado
  // por foto real del control Panasonic), Atari 5200 rojo/naranja,
  // ColecoVision gris, Vectrex negro, Atari Lynx negro (no rojo como el
  // resto de la familia Atari — verificado, es la excepción), Nintendo 3DS
  // gris (sin colorear, a diferencia de otros ABXY de la casa).
  threedo: { color: '#d9c8a3' },
  atari5200: { color: '#c0392b' },
  colecovision: { color: '#5a5a5a' },
  vectrex: { color: '#2a2a2a' },
  atarilynx: { color: '#2a2a2a' },
  n3ds: { color: '#8a8a92' },
};

// Color de identidad de una consola: el real de su botón donde se conoce
// (CONSOLE_REAL_BUTTON), o uno estable por hash del id como respaldo — misma
// fuente de verdad para el botón 3D y para teñir el ícono de silueta.
function getConsoleColor(consoleInfo) {
  const real = CONSOLE_REAL_BUTTON[consoleInfo.id];
  if (real) return { base: real.color, dark: darkenForContrast(real.color, 0.3) };
  const hue = hueFromString(consoleInfo.id);
  return { base: `hsl(${hue} 55% 46%)`, dark: `hsl(${hue} 60% 22%)` };
}

// Botón de consola en 3D con el color real del botón de su propio control —
// reemplaza el logo oficial de cada marca (ver investigación de copyright en
// textureDownload.js/consolePhotos.js, eliminado) por un elemento de UI
// propio: aro biselado + plato cóncavo con brillo real + anillo LED.
function renderConsoleFallbackBadge(box, consoleInfo) {
  const { base, dark } = getConsoleColor(consoleInfo);
  const real = CONSOLE_REAL_BUTTON[consoleInfo.id];
  box.style.background = '';
  // Variación real de forma (óvalo donde de verdad se sabe, ver arriba) y de
  // "época" (más chato/anguloso en la era de joystick, más curvo/glossy en
  // la moderna) — para que no todas las consolas usen el mismo molde, sin
  // inventar una forma específica que no se conoce con certeza.
  const shapeClass = real && real.shape === 'oval' ? ' console-btn--oval' : '';
  const eraClass = /2ª generación|Recreativas|8 bits/.test(consoleInfo.gen) ? ' console-btn--retro'
    : /6ª generación|7ª generación/.test(consoleInfo.gen) ? ' console-btn--modern' : '';
  const wrap = document.createElement('div');
  wrap.className = 'console-btn-wrap';
  wrap.innerHTML = `
    <button class="console-btn${shapeClass}${eraClass}" type="button" tabindex="-1" style="--base:${base};--dark:${dark};--glow:${base}">
      <div class="console-btn-dish"></div>
    </button>`;
  box.prepend(wrap);
}

// Antes esto bajaba/bundleaba el logo OFICIAL de cada marca (Nintendo, Sega,
// Sony, Microsoft...) desde Wikipedia/Commons — esos logos son marcas
// registradas; Wikipedia puede alojarlos bajo su propia excepción de "fair
// use" para el artículo QUE HABLA de la consola, pero esa excepción no cubre
// que MegaHUB los redistribuya como decoración de su propia interfaz.
//
// Reemplazado por los íconos del propio proyecto RetroArch/libretro
// (retroarch-assets, tema "XMB Monochrome" de Kivutar — CC BY 4.0, ver
// ui/console-icons/CREDITS.txt) — diseñados A PROPÓSITO como siluetas
// monocromas genéricas, no logos de marca, exactamente para este mismo uso.
// Solo 38 de las 39 consolas tienen ícono en ese set (falta NAOMI/Atomiswave)
// — esa cae al botón 3D genérico en vez de inventar un ícono que no existe.
function tryLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ids con ícono real ya confirmado (se llena en loadConsolePhotos) — así
// openConsoleDetail/el sidebar pueden reusar el mismo ícono teñido sin
// tener que volver a probar la carga de la imagen.
const consoleIconLoaded = new Set();

function consoleIconHtml(consoleInfo) {
  if (!consoleIconLoaded.has(consoleInfo.id)) return null;
  const { base } = getConsoleColor(consoleInfo);
  // Anillo medio a partir del propio color de la consola (no blanco fijo):
  // en consolas claras (ej. Wii, #c9cdd6) un anillo blanco se perdía contra
  // el propio ícono, casi igual de claro — con un tono más oscuro del mismo
  // color siempre queda un salto de luminosidad hacia el ícono Y hacia el
  // anillo negro exterior, sea cual sea el color base.
  const ring = darkenForContrast(base, 0.18);
  const url = `url('console-icons/${consoleInfo.id}.png')`;
  // Glow bajo/alto precalculados como rgba() fijo (no color-mix() animado en
  // CSS, ver colorToRgba) para que el @keyframes interpole de verdad y se
  // sienta como una respiración continua, no un parpadeo entre dos estados.
  const glowLow = colorToRgba(base, 0.32);
  const glowHigh = colorToRgba(base, 0.62);
  // Contorno tipo sticker (negro afuera + tono propio adentro) hecho con 2
  // capas más escaladas de la misma silueta, NO con drop-shadow apilado — 16
  // drop-shadow por ícono (probado antes) volvía la grilla de 39 consolas
  // extremadamente lenta. 3 divs enmascarados es una composición normal,
  // sin el costo de recalcular un filtro de sombra 16 veces por elemento.
  // El halo de color (glow) va en el wrapper, un solo drop-shadow barato.
  return `<div class="console-icon-stack" style="--icon-color:${base};--glow-low:${glowLow};--glow-high:${glowHigh}">
    <div class="console-icon-outline console-icon-outline--dark" style="--icon-url:${url}"></div>
    <div class="console-icon-outline console-icon-outline--light" style="--icon-url:${url};--ring-color:${ring}"></div>
    <div class="console-icon-mask" style="--icon-url:${url};--icon-color:${base}"></div>
  </div>`;
}

async function loadConsolePhotos(list) {
  for (const c of list) {
    const card = retroConsoleGrid.querySelector(`.console-card[data-console-id="${c.id}"]`);
    if (!card) continue;
    const box = card.querySelector('.console-photo-box');
    box.classList.remove('loading');
    const url = await tryLoadImage(`console-icons/${c.id}.png`);
    if (url) {
      consoleIconLoaded.add(c.id);
      box.insertAdjacentHTML('afterbegin', consoleIconHtml(c));
    } else {
      renderConsoleFallbackBadge(box, c);
    }
  }
}

async function openConsoleDetail(consoleInfo) {
  currentConsole = consoleInfo;
  retroConsoleView.hidden = true;
  retroDetailView.hidden = false;
  retroDetailName.textContent = consoleInfo.name;
  retroDetailMeta.innerHTML = `<span>${consoleInfo.year}</span><span>${escapeHtml(consoleInfo.gen)}</span><span id="retro-detail-owned-badge" class="skeleton skeleton-pill" style="width:150px;height:18px;"></span>`;
  const iconHtml = consoleIconHtml(consoleInfo) || '';
  retroDetailPhoto.innerHTML = iconHtml;

  // Sidebar de modo retro: info de consola + emulador + carpetas.
  document.getElementById('retro-sidebar-console-info').innerHTML = `
    ${iconHtml}
    <div>
      <div class="rsci-name">${escapeHtml(consoleInfo.name)}</div>
      <div class="rsci-meta">${consoleInfo.year} · ${escapeHtml(consoleInfo.gen)}</div>
    </div>
  `;
  document.getElementById('retro-download-link').href = consoleInfo.emulatorUrl;
  document.getElementById('retro-rom-scan-status').textContent = '';

  updateStandaloneEmulatorControls(consoleInfo);
  updateRetroArchControls(consoleInfo);
  updateRomLocationControls(consoleInfo);
  updateResolutionPresetControls(consoleInfo);
  updateMultiplayerControls(consoleInfo);

  searchInput.value = '';
  retroSearchTerm = '';
  retroOwnedFilterMode = 'all';
  document.querySelectorAll('#retro-owned-filter .chip').forEach(c => c.classList.toggle('active', c.dataset.owned === 'all'));
  retroGameEls.clear(); // los títulos solo son únicos dentro del catálogo de esta consola
  retroGameGrid.innerHTML = skeletonCardsHtml(12);
  retroGameGrid.style.removeProperty('--cover-aspect'); // vuelve al 2/3 por defecto hasta medir esta consola
  retroGameGrid.style.setProperty('--ph-hue', hueFromString(consoleInfo.id));
  retroSelectedIndex = -1;
  updateSidebarMode();
  updateSearchContext();

  const result = await window.megahub.getRetroCatalog(consoleInfo.repo);
  if (currentConsole !== consoleInfo) return; // el usuario ya cambió de consola

  if (result.error) {
    // Distinto de un catálogo genuinamente vacío: acá la petición al repo de
    // portadas falló de verdad (repo renombrado, sin conexión, rate-limit) —
    // antes esto quedaba indistinguible de "sin resultados" y encima podía
    // dejar el resto del panel a medio cargar si algo más asumía un array.
    retroCatalog = [];
    showToast(`No se pudo cargar el catálogo de ${consoleInfo.name}: ${result.error}`, 'error');
    retroGameEls.clear();
    retroGameGrid.innerHTML = '<div class="empty">No se pudo cargar el catálogo de portadas — revisa tu conexión e intenta entrar de nuevo a esta consola.</div>';
    refreshRetroOwnedBadge();
    return;
  }

  const catalog = result.catalog;
  const owned = ownedGamesForConsole(consoleInfo);
  const ownedByNorm = new Map(owned.map(g => [normalizeRetroTitle(g.title), g]));
  // placeholderAbbr: cuando el catálogo no trae portada (o falla al cargar),
  // makePlaceholder() cae a PLAT_ABBR[game.platform] — estas entradas no
  // tienen `platform`, así que sin esto mostraban un genérico "??" en vez de
  // algo reconocible de la consola actual.
  const placeholderAbbr = consoleMonogram(consoleInfo.name);
  retroCatalog = catalog.map(entry => {
    const match = ownedByNorm.get(normalizeRetroTitle(entry.title));
    return { ...entry, owned: !!match, ownedGame: match || null, placeholderAbbr };
  });
  refreshRetroOwnedBadge();
  applyRetroFilters();
  scanLocalRoms(consoleInfo);
  detectCoverAspect(consoleInfo, retroCatalog);
}

// Cada consola tiene su propia proporción "típica" de carátula (portada
// vertical tipo caja moderna, cuadrada en algunas retro, panorámica en
// flyers de arcade...). En vez de mantener una tabla manual por sistema
// (36 consolas, se desactualiza fácil), se mide en vivo: se cargan unas
// pocas portadas reales del catálogo y se usa la proporción más común entre
// ellas — así toda la biblioteca de ESA consola queda uniforme entre sí, sin
// asumir nada de antemano.
async function detectCoverAspect(consoleInfo, catalog) {
  const samples = catalog.filter(e => e.coverUrl).slice(0, 8);
  if (samples.length < 3) return; // muy pocas para que la muestra signifique algo
  const ratios = await Promise.all(samples.map(entry => new Promise(resolve => {
    const img = new Image();
    const done = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
    img.onload = done;
    img.onerror = () => resolve(null);
    img.src = entry.coverUrl;
  })));
  if (currentConsole !== consoleInfo) return; // cambió de consola mientras medíamos
  const valid = ratios.filter(Boolean).sort((a, b) => a - b);
  if (valid.length < 3) return;
  const median = valid[Math.floor(valid.length / 2)];
  // Clamp razonable: nunca más angosto que una tapa de cartucho ni más ancho
  // que un flyer de arcade panorámico, para que un outlier no deforme la grilla entera.
  const clamped = Math.min(2.2, Math.max(0.55, median));
  retroGameGrid.style.setProperty('--cover-aspect', clamped.toFixed(3));
}

// Para las 3 consolas con emulador standalone descargable (Xemu/PCSX2/Xenia,
// todas builds portables sin instalador): en vez de solo dejar el enlace a la
// web oficial, MegaHUB puede bajar + descomprimir + dejar el ejecutable listo
// dentro de emulators/<consola>/ él mismo, y detecta si ya está ahí — así el
// usuario no tiene que ir manualmente emulador por emulador (como un gestor
// de mods tipo Vortex, pero para emuladores).
async function updateStandaloneEmulatorControls(consoleInfo) {
  const downloadLink = document.getElementById('retro-download-link');
  const autoBtn = document.getElementById('retro-auto-download-btn');
  const locateBtn = document.getElementById('retro-locate-emulator-btn');
  const openBtn = document.getElementById('retro-open-standalone-btn');
  const statusEl = document.getElementById('retro-auto-download-status');

  // "downloadable" = tiene fuente automática (Xemu/PCSX2/Xenia/RPCS3).
  // "locatable" = no tiene descarga automática (ej. Dolphin, bloqueado por un
  // challenge anti-bot en su web oficial) pero SÍ se puede detectar si el
  // usuario ya lo instaló él mismo y señalar la carpeta con el "ubicador".
  if (!consoleInfo.downloadable && !consoleInfo.locatable) {
    autoBtn.hidden = true;
    locateBtn.hidden = true;
    openBtn.hidden = true;
    statusEl.textContent = '';
    return;
  }

  downloadLink.hidden = false;
  autoBtn.hidden = true;
  locateBtn.hidden = true;
  openBtn.hidden = true;
  autoBtn.disabled = false;
  autoBtn.querySelector('span').textContent = 'Descargar e instalar automáticamente (con tu confirmación)';
  statusEl.textContent = 'Comprobando si ya está instalado…';

  const status = await window.megahub.retroGetEmulatorStatus({ id: consoleInfo.id, name: consoleInfo.name, emulator: consoleInfo.emulator });
  if (currentConsole !== consoleInfo) return;

  if (status && status.installed) {
    // Ya sea porque MegaHUB lo descargó o porque el usuario ubicó su propia
    // carpeta: el enlace/descarga ya son redundantes.
    downloadLink.hidden = true;
    openBtn.hidden = false;
    const locations = await window.megahub.retroGetLocations(consoleInfo.id);
    if (currentConsole !== consoleInfo) return;
    statusEl.innerHTML = `${escapeHtml(consoleInfo.emulator)} ya está instalado en <code>${escapeHtml(status.emuDir)}</code>.` +
      (locations.customEmu ? ` <a href="#" id="retro-clear-emu-loc">Olvidar esta ubicación</a>` : '');
    const clearLink = document.getElementById('retro-clear-emu-loc');
    if (clearLink) {
      clearLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.megahub.retroClearEmulatorLocation(consoleInfo.id);
        updateStandaloneEmulatorControls(consoleInfo);
      });
    }
  } else {
    // Sin fuente de descarga automática (Dolphin), solo se ofrece ubicar.
    autoBtn.hidden = !consoleInfo.downloadable;
    locateBtn.hidden = false;
    statusEl.textContent = '';
  }
}

// Presets de resolución/rendimiento (Por defecto/1080p/2K/4K): para los
// emuladores standalone (ver resolutionPresets.js SUPPORTED) siempre hay un
// ajuste real de resolución interna que tocar. Para los cores de RetroArch se
// muestra en TODOS (para que sea "para todos los emuladores" como pidió el
// usuario), pero el backend responde con result.info=true y una explicación
// en vez de aplicar nada cuando el sistema es 2D pixel-exacto y no tiene
// ninguna "resolución interna" real que escalar (ver RETROARCH_CORE_FOLDER
// en resolutionPresets.js para la lista de los que sí la tienen).
const RESOLUTION_PRESET_STANDALONE = ['ps2', 'ps3', 'xbox', 'xbox360', 'gamecube', 'wii'];

async function updateResolutionPresetControls(consoleInfo) {
  const section = document.getElementById('retro-resolution-section');
  const statusEl = document.getElementById('retro-resolution-status');
  const usesRetroArch = consoleInfo.emulator.includes('core RetroArch');
  if (!RESOLUTION_PRESET_STANDALONE.includes(consoleInfo.id) && !usesRetroArch) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  // "Original" (4:3/CRT o LCD según la consola) solo existe para cores de
  // RetroArch (ver resolutionPresets.js) — los emuladores standalone
  // (PS2/PS3/Xbox/GameCube/etc.) no tienen shaders de RetroArch disponibles.
  const originalChip = document.querySelector('#retro-resolution-presets .chip[data-tier="original"]');
  if (originalChip) originalChip.hidden = !usesRetroArch;
  statusEl.textContent = 'Elige el nivel de calidad/rendimiento para ' + consoleInfo.emulator + '.';
}

document.getElementById('retro-resolution-presets').addEventListener('click', async (e) => {
  const btn = e.target.closest('.chip[data-tier]');
  if (!btn || !currentConsole) return;
  const statusEl = document.getElementById('retro-resolution-status');
  const chips = document.querySelectorAll('#retro-resolution-presets .chip');
  chips.forEach(c => c.disabled = true);
  statusEl.textContent = 'Aplicando…';
  const result = await window.megahub.retroApplyResolutionPreset({ id: currentConsole.id, tier: btn.dataset.tier });
  chips.forEach(c => c.disabled = false);
  chips.forEach(c => c.classList.toggle('active', c === btn));
  statusEl.textContent = result && result.error ? 'Error: ' + result.error : (result && result.message) || '';
  if (result && result.error) showToast('Error aplicando preset: ' + result.error, 'error');
  else if (!(result && result.info)) showToast(`Preset "${btn.textContent}" aplicado a ${currentConsole.emulator}.`, 'success');
});

document.getElementById('retro-locate-emulator-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const locations = await window.megahub.retroPickEmulatorFolder(currentConsole.id);
  if (!locations) return; // el usuario canceló el diálogo
  updateStandaloneEmulatorControls(currentConsole);
});

// Muestra dónde busca las ROMs de la consola actual (por defecto roms/<id>/,
// o la carpeta propia del usuario si la ubicó) y deja cambiarla/quitarla.
async function updateRomLocationControls(consoleInfo) {
  const locateBtn = document.getElementById('retro-locate-roms-btn');
  const statusEl = document.getElementById('retro-rom-location-status');
  const locations = await window.megahub.retroGetLocations(consoleInfo.id);
  if (currentConsole !== consoleInfo) return;

  locateBtn.querySelector('span').textContent = locations.customRom ? 'Cambiar carpeta de ROMs' : '¿Ya tienes ROMs en otra carpeta? Ubicar';
  statusEl.innerHTML = locations.customRom
    ? `Buscando ROMs en: <code>${escapeHtml(locations.romDir)}</code> — <a href="#" id="retro-clear-rom-loc">usar la carpeta de MegaHUB</a>`
    : '';
  const clearLink = document.getElementById('retro-clear-rom-loc');
  if (clearLink) {
    clearLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.megahub.retroClearRomsLocation(consoleInfo.id);
      updateRomLocationControls(consoleInfo);
      scanLocalRoms(consoleInfo);
    });
  }
}

document.getElementById('retro-locate-roms-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const locations = await window.megahub.retroPickRomsFolder(currentConsole.id);
  if (!locations) return;
  updateRomLocationControls(currentConsole);
  scanLocalRoms(currentConsole);
});

// Si la consola usa un core de RetroArch (14 de las 21), en vez de solo dejar
// el enlace estático a retroarch.com detecta si el usuario YA lo tiene instalado
// y, si es así, ofrece instalar el core específico (con confirmación) o abrir
// RetroArch para jugar/configurar — sin que tenga que ir manualmente al
// Actualizador en línea.
async function updateRetroArchControls(consoleInfo) {
  const controls = document.getElementById('retro-core-controls');
  const downloadLink = document.getElementById('retro-download-link');
  const usesRetroArch = consoleInfo.emulator.includes('core RetroArch');
  if (!usesRetroArch) { controls.hidden = true; return; }

  const statusEl = document.getElementById('retro-core-status');
  const installBtn = document.getElementById('retro-install-core-btn');
  const sysFilesBtn = document.getElementById('retro-install-sysfiles-btn');
  const openBtn = document.getElementById('retro-open-retroarch-btn');
  const biosWarning = document.getElementById('retro-bios-warning');
  controls.hidden = false;
  downloadLink.hidden = false; // se oculta más abajo solo si RetroArch ya está instalado
  statusEl.textContent = 'Comprobando tu instalación de RetroArch…';
  installBtn.hidden = true;
  sysFilesBtn.hidden = true;
  openBtn.hidden = true;
  biosWarning.hidden = true;
  document.getElementById('retro-core-install-status').textContent = '';

  const status = await window.megahub.retroGetRetroArchStatus(consoleInfo.id);
  if (currentConsole !== consoleInfo) return;

  if (!status.installed) {
    statusEl.textContent = 'RetroArch no se detectó instalado — usa el enlace de arriba para bajarlo primero.';
    return;
  }
  // RetroArch ya está instalado: el enlace genérico de descarga ya no aplica.
  downloadLink.hidden = true;
  openBtn.hidden = false;
  if (!status.core) {
    statusEl.textContent = 'RetroArch detectado ✓ (sin core automático disponible para este sistema).';
  } else if (status.core.installed) {
    statusEl.textContent = `RetroArch detectado ✓ — core "${status.core.coreName}" ya instalado.`;
  } else {
    statusEl.textContent = `RetroArch detectado ✓ — falta el core "${status.core.coreName}" (${status.core.sizeMb} MB).`;
    installBtn.hidden = false;
    installBtn.querySelector('span').textContent = `Instalar core (${status.core.coreName}, ${status.core.sizeMb} MB)`;
  }

  // Archivos de sistema del core (fuentes/hiscore/etc, oficiales de RetroArch,
  // NO son BIOS con copyright) — ej. PPSSPP/FBNeo los necesitan para funcionar
  // del todo y normalmente se bajan a mano desde el Actualizador en línea.
  if (status.systemFiles && !status.systemFiles.installed) {
    sysFilesBtn.hidden = false;
    sysFilesBtn.querySelector('span').textContent = `Descargar archivos de sistema (${status.systemFiles.zipName}, ${status.systemFiles.sizeMb} MB)`;
  }

  // BIOS con copyright: nunca la proporcionamos, solo avisamos si falta.
  if (status.bios && status.bios.required && !status.bios.satisfied) {
    biosWarning.hidden = false;
    const files = status.bios.expectedFiles || [];
    const fileList = files.length > 1
      ? (status.bios.anyOf === false ? files.join(' y ') : files.join(' o '))
      : (files[0] || 'BIOS oficial');
    document.getElementById('retro-bios-warning-text').textContent =
      `Requiere ${fileList} — extráela vía dumping desde tu consola. No proporcionamos BIOS.`;
  }
}

document.getElementById('retro-open-bios-folder-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const result = await window.megahub.retroOpenBiosFolder(currentConsole.id);
  if (result && result.error) showToast('Error: ' + result.error, 'error');
});

document.getElementById('retro-install-core-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-install-core-btn');
  const installStatus = document.getElementById('retro-core-install-status');
  const label = btn.querySelector('span');

  const status = await window.megahub.retroGetRetroArchStatus(currentConsole.id);
  if (!status.core) return;
  const confirmed = window.confirm(
    `¿Descargar el core "${status.core.coreName}" (${status.core.sizeMb} MB) desde buildbot.libretro.com ` +
    `e instalarlo en la carpeta cores/ de tu RetroArch?\n\nSolo se descomprime ahí — no se ejecuta nada.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  label.textContent = 'Instalando…';
  const result = await window.megahub.retroInstallCore(currentConsole.id);
  btn.disabled = false;
  if (result && result.error) {
    installStatus.textContent = 'Error: ' + result.error;
    showToast('Error instalando el core: ' + result.error, 'error');
    return;
  }
  label.textContent = `Instalar core (${result.coreName})`;
  installStatus.textContent = `Core "${result.coreName}" instalado correctamente.`;
  showToast(`Core "${result.coreName}" instalado.`, 'success');
  updateRetroArchControls(currentConsole);
});

document.getElementById('retro-install-sysfiles-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-install-sysfiles-btn');
  const installStatus = document.getElementById('retro-core-install-status');
  const label = btn.querySelector('span');

  const status = await window.megahub.retroGetRetroArchStatus(currentConsole.id);
  if (!status.systemFiles) return;
  const confirmed = window.confirm(
    `¿Descargar "${status.systemFiles.zipName}" (${status.systemFiles.sizeMb} MB) desde buildbot.libretro.com ` +
    `(el mismo origen oficial que usa el Actualizador en línea de RetroArch) e instalarlo en tu carpeta system/?\n\n` +
    `Esto NO es una BIOS — son assets propios y libres que el core necesita (fuentes, hiscore, etc).`
  );
  if (!confirmed) return;

  const prevLabel = label.textContent;
  btn.disabled = true;
  label.textContent = 'Descargando…';
  const result = await window.megahub.retroInstallCoreSystemFiles(currentConsole.id);
  btn.disabled = false;
  if (result && result.error) {
    installStatus.textContent = 'Error: ' + result.error;
    label.textContent = prevLabel;
    showToast('Error descargando archivos de sistema: ' + result.error, 'error');
    return;
  }
  installStatus.textContent = `"${result.zipName}" instalado correctamente.`;
  showToast(`"${result.zipName}" instalado.`, 'success');
  updateRetroArchControls(currentConsole);
});

document.getElementById('retro-open-retroarch-btn').addEventListener('click', () => {
  window.megahub.retroOpenRetroArch();
});

function refreshRetroOwnedBadge() {
  const badge = document.getElementById('retro-detail-owned-badge');
  if (!badge) return;
  badge.classList.remove('skeleton', 'skeleton-pill');
  badge.style.cssText = '';
  const ownedCount = retroCatalog.filter(e => e.owned).length;
  badge.textContent = `${ownedCount} obtenido${ownedCount === 1 ? '' : 's'} de ${retroCatalog.length} en el catálogo`;
}

// Cruza los archivos que el usuario puso en roms/<consola>/ contra el catálogo,
// para marcarlos como "obtenidos" aunque no vengan de un playlist de RetroArch.
async function scanLocalRoms(consoleInfo) {
  const statusEl = document.getElementById('retro-rom-scan-status');
  const results = await window.megahub.retroScanRoms({ id: consoleInfo.id, repo: consoleInfo.repo });
  if (currentConsole !== consoleInfo) return;
  if (!results.length) {
    statusEl.textContent = 'Sin archivos en tu carpeta roms/' + consoleInfo.id + ' todavía.';
    return;
  }
  const recognized = results.filter(r => r.recognized);
  const unrecognized = results.filter(r => !r.recognized);
  let dirty = false;
  const touchedTitles = new Set();
  for (const r of recognized) {
    const target = retroCatalog.find(e => normalizeRetroTitle(e.title) === normalizeRetroTitle(r.title));
    if (!target) continue;
    if (target.romPath !== r.path) { target.romPath = r.path; touchedTitles.add(target.title); }
    target.sizeBytes = r.sizeBytes ?? target.sizeBytes ?? null;
    if (!target.owned) { target.owned = true; dirty = true; }
  }
  // Lo que no aparece en el catálogo de libretro-thumbnails (muy incompleto
  // para consolas que no son cores de RetroArch — Xbox/Xbox 360/PS3/PS2/
  // GameCube/Wii solo tienen un puñado de portadas ahí) se agrega igual como
  // un juego propio de tu biblioteca: si no, un ROM real que sí tienes se
  // quedaba invisible solo porque ESE catálogo en particular no lo traía.
  const newlyAdded = [];
  for (const r of unrecognized) {
    const already = retroCatalog.find(e => normalizeRetroTitle(e.title) === normalizeRetroTitle(r.title));
    if (already) {
      if (already.romPath !== r.path) { already.romPath = r.path; touchedTitles.add(already.title); }
      already.sizeBytes = r.sizeBytes ?? already.sizeBytes ?? null;
      if (!already.owned) { already.owned = true; dirty = true; }
      continue;
    }
    const entry = { title: r.title, coverUrl: null, rerelease: false, owned: true, ownedGame: null, romPath: r.path, sizeBytes: r.sizeBytes ?? null };
    retroCatalog.push(entry);
    newlyAdded.push(entry);
    dirty = true;
  }
  statusEl.innerHTML = `<b>${results.length}</b> ROM${results.length === 1 ? '' : 's'} detectada${results.length === 1 ? '' : 's'} en tu carpeta` +
    (newlyAdded.length ? `<br>${newlyAdded.length} no estaba${newlyAdded.length === 1 ? '' : 'n'} en el catálogo de portadas — se agregó${newlyAdded.length === 1 ? '' : 'ron'} igual a tu biblioteca.` : '');
  if (dirty) { refreshRetroOwnedBadge(); applyRetroFilters(); }
  // Si el juego seleccionado ahora mismo es uno de los que cambió, refresca el
  // botón "Jugar" del panel de detalles sin esperar a que el usuario reclique.
  const selected = retroFilteredCatalog[retroSelectedIndex];
  if (selected && touchedTitles.has(selected.title)) renderRetroGameDetails(selected);

  // Portada de respaldo (Wikipedia, sin necesidad de clave) para lo que se
  // agregó sin pasar por el catálogo de libretro-thumbnails.
  for (const entry of newlyAdded) {
    try {
      const url = await window.megahub.getWikipediaCover(entry.title);
      if (url && currentConsole === consoleInfo) { entry.coverUrl = url; applyRetroFilters(); }
    } catch {}
  }
}

// Vuelve a escanear roms/<consola>/ al recuperar el foco de la ventana (p.ej.
// al volver de haber abierto RetroArch/el emulador o de haber copiado ROMs a
// mano) — así el estado "obtenido"/"Jugar" no se queda desactualizado por
// caché mientras la app sigue abierta.
window.addEventListener('focus', () => {
  if (viewMode === 'retro' && currentConsole) {
    scanLocalRoms(currentConsole);
    // Vuelve a chequear la BIOS: si el usuario recién la copió en el Explorador
    // (ej. después de tocar "Abrir carpeta de BIOS") y vuelve a MegaHUB, el
    // aviso debe desaparecer solo, sin tener que salir y reentrar a la consola.
    updateRetroArchControls(currentConsole);
  }
});

document.getElementById('retro-back').addEventListener('click', async () => {
  retroDetailView.hidden = true;
  retroConsoleView.hidden = false;
  currentConsole = null;
  retroConsoleSelectedIndex = -1;
  searchInput.value = '';
  updateSidebarMode();
  updateSearchContext();
  // Pudo haber agregado/ubicado ROMs mientras estaba en el detalle de esta consola.
  await loadLocalRomCounts();
  if (retroConsoleSortMode === 'owned') applyConsoleSort();
  else refreshConsoleOwnedCounts();
});

document.getElementById('retro-owned-filter').addEventListener('click', (e) => {
  if (!e.target.dataset.owned) return;
  retroOwnedFilterMode = e.target.dataset.owned;
  document.querySelectorAll('#retro-owned-filter .chip').forEach(c => c.classList.toggle('active', c === e.target));
  applyRetroFilters();
});

document.getElementById('retro-create-folders-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const res = await window.megahub.retroCreateFolders({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  const statusEl = document.getElementById('retro-rom-scan-status');
  if (res && res.error) { statusEl.textContent = 'Error creando carpetas: ' + res.error; showToast('Error creando carpetas: ' + res.error, 'error'); return; }
  statusEl.textContent = 'Carpetas creadas en emulators/' + currentConsole.id + ' y roms/' + currentConsole.id + '.';
  showToast(`Carpetas de ${currentConsole.name} creadas.`, 'success');
  if (res && res.emuDir) window.megahub.retroOpenFolder(res.emuDir);
});
document.getElementById('retro-open-roms-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const res = await window.megahub.retroCreateFolders({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  if (res && res.romDir) window.megahub.retroOpenFolder(res.romDir);
});

// Descarga automática: SIEMPRE con confirmación explícita mostrando nombre,
// origen y tamaño antes de bajar nada. Todas las fuentes de esta lista son
// builds portables (zip/7z), así que se descomprimen solas dentro de
// emulators/<consola>/ — nunca se ejecuta el archivo descargado.
document.getElementById('retro-auto-download-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-auto-download-btn');
  const statusEl = document.getElementById('retro-auto-download-status');
  const label = btn.querySelector('span');
  const defaultLabel = 'Descargar e instalar automáticamente (con tu confirmación)';

  btn.disabled = true;
  label.textContent = 'Consultando última versión…';
  const info = await window.megahub.retroGetDownloadInfo(currentConsole.id);
  if (currentConsole == null) return;
  if (!info) {
    label.textContent = defaultLabel;
    btn.disabled = false;
    statusEl.textContent = 'No se pudo obtener la última versión ahora mismo. Usa el enlace de arriba.';
    return;
  }

  const confirmed = window.confirm(
    `¿Descargar ${info.name} (${info.sizeMb} MB, versión ${info.version}) desde github.com/${info.repo} ` +
    `e instalarlo en emulators/${currentConsole.id}/?\n\nSolo se descomprime ahí — no se ejecuta nada.`
  );
  if (!confirmed) {
    label.textContent = defaultLabel;
    btn.disabled = false;
    return;
  }

  label.textContent = 'Descargando e instalando…';
  statusEl.textContent = '';
  const result = await window.megahub.retroDownloadEmulator({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  btn.disabled = false;
  label.textContent = defaultLabel;
  if (result && result.error) {
    statusEl.textContent = 'Error al descargar: ' + result.error;
    showToast('Error al descargar ' + currentConsole.emulator + ': ' + result.error, 'error');
    return;
  }
  if (!result.installed) {
    statusEl.textContent = `Se descargó y descomprimió en emulators/${currentConsole.id}/, pero no se encontró el ejecutable esperado — revisa la carpeta.`;
    showToast('Descarga completada, pero no se encontró el ejecutable esperado.', 'error');
    return;
  }
  showToast(`${currentConsole.emulator} instalado correctamente.`, 'success');
  updateStandaloneEmulatorControls(currentConsole);
});

document.getElementById('retro-open-standalone-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const status = await window.megahub.retroGetEmulatorStatus({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  if (status && status.exePath) window.megahub.retroOpenEmulator(status.exePath);
});

function applyRetroFilters() {
  let list_ = retroCatalog;
  if (retroOwnedFilterMode === 'owned') list_ = list_.filter(e => e.owned);
  if (retroSearchTerm) list_ = list_.filter(e => e.title.toLowerCase().includes(retroSearchTerm));
  retroFilteredCatalog = list_;
  retroCountEl.textContent = `${list_.length} juegos`;
  renderRetroGameGrid();
}

// Igual que dock/lista: reutiliza los nodos ya creados (con su <img> cargada)
// en vez de reconstruir todo en cada tecla de búsqueda/filtro — evita el
// parpadeo y, sobre todo, usa el mismo pipeline con fallback de syncCoverSlot
// en vez de un <img> crudo sin manejo de error (esa era la causa real de los
// iconos de "imagen rota" en el catálogo).
function buildRetroGameCard(entry) {
  const card = document.createElement('div');
  card.className = 'retro-game-card';
  card.dataset.title = entry.title;

  const cover = document.createElement('div');
  cover.className = 'rg-cover';
  card.appendChild(cover);

  const title = document.createElement('div');
  title.className = 'rg-title';
  card.appendChild(title);

  card.addEventListener('click', () => {
    const idx = retroFilteredCatalog.indexOf(entry);
    if (idx === -1) return;
    retroSelectedIndex = idx;
    updateRetroSelectionStyles();
    renderRetroGameDetails(entry);
  });

  updateRetroGameCard(card, entry);
  return card;
}

function updateRetroGameCard(card, entry) {
  const cover = card.querySelector('.rg-cover');
  // El orden importa: syncCoverSlot puede vaciar y reconstruir cover.innerHTML
  // (renderCoverInto) cuando llega una portada nueva — si las insignias se
  // añaden antes, esa reconstrucción las borra. Por eso van después.
  syncCoverSlot(cover, entry);

  let ownedBadge = cover.querySelector('.rg-owned');
  if (entry.owned && !ownedBadge) {
    ownedBadge = document.createElement('span');
    ownedBadge.className = 'rg-owned';
    ownedBadge.textContent = 'Obtenido';
    cover.appendChild(ownedBadge);
  } else if (!entry.owned && ownedBadge) {
    ownedBadge.remove();
  }
  let rereleaseBadge = cover.querySelector('.rg-rerelease');
  if (entry.rerelease && !rereleaseBadge) {
    rereleaseBadge = document.createElement('span');
    rereleaseBadge.className = 'rg-rerelease';
    rereleaseBadge.textContent = 'Relanzamiento';
    cover.appendChild(rereleaseBadge);
  } else if (!entry.rerelease && rereleaseBadge) {
    rereleaseBadge.remove();
  }
  updateTextureHdBadge(cover, entry);
  card.querySelector('.rg-title').innerHTML = highlightMatch(entry.title, retroSearchTerm);
}

// "Texturas HD disponibles" en la portada de juegos que el usuario NO tiene
// (para eso está el catálogo: que sepa de antemano cuáles ya tienen pack
// esperando en GameBanana). Solo tiene sentido en las 3 consolas donde el
// emulador soporta reemplazo de texturas — ver TEXTURE_PACK_CONSOLES.
// entry._textureHd: undefined = sin consultar todavía, true/false = resuelto
// (una vez resuelto queda pegado al objeto — sobrevive a re-renders del
// mismo filtro sin volver a golpear la API).
const textureHdQueue = [];
let textureHdWorkers = 0;
const TEXTURE_HD_CONCURRENCY = 3;

function runTextureHdQueue() {
  while (textureHdWorkers < TEXTURE_HD_CONCURRENCY && textureHdQueue.length) {
    const { entry, consoleId } = textureHdQueue.shift();
    textureHdWorkers++;
    window.megahub.textureCheckAvailability(entry.title).then((available) => {
      entry._textureHd = available;
      // El usuario pudo cambiar de consola o de filtro mientras esto corría.
      if (currentConsole && currentConsole.id === consoleId) {
        const card = retroGameEls.get(entry.title);
        if (card) updateTextureHdBadge(card.querySelector('.rg-cover'), entry);
      }
    }).catch(() => { entry._textureHd = false; })
      .finally(() => { textureHdWorkers--; runTextureHdQueue(); });
  }
}

function updateTextureHdBadge(cover, entry) {
  let badge = cover.querySelector('.rg-texture-hd');
  const applies = !entry.owned && currentConsole && TEXTURE_PACK_CONSOLES.includes(currentConsole.id);
  // Sin el flag _textureHdQueued, cada tecla escrita en el buscador
  // re-renderiza el resultado (más ancho a mitad de escritura) y volvía a
  // encolar los MISMOS juegos una y otra vez — con catálogos de miles de
  // juegos, la cola crecía a cientos de peticiones duplicadas y el juego que
  // el usuario realmente estaba viendo terminaba esperando su turno detrás
  // de todo ese backlog viejo. unshift (en vez de push) además prioriza lo
  // que se está viendo AHORA sobre encolados previos ya irrelevantes.
  if (applies && entry._textureHd === undefined && !entry._textureHdQueued) {
    entry._textureHdQueued = true;
    textureHdQueue.unshift({ entry, consoleId: currentConsole.id });
    runTextureHdQueue();
  }
  const show = applies && entry._textureHd === true;
  if (show && !badge) {
    badge = document.createElement('span');
    badge.className = 'rg-texture-hd';
    badge.textContent = 'Texturas HD disponibles';
    cover.appendChild(badge);
  } else if (!show && badge) {
    badge.remove();
  }
}

function updateRetroSelectionStyles() {
  [...retroGameGrid.children].forEach((c, i) => c.classList.toggle('selected', i === retroSelectedIndex));
}

function renderRetroGameGrid() {
  // Limpia los placeholders de skeletonCardsHtml() del estado "cargando" —
  // no están trackeados en retroGameEls (se inyectaron como HTML crudo antes
  // de tener catálogo real), así que sin esto quedaban pegados para siempre
  // mezclados con las cartas reales. Mucho más visible en catálogos grandes
  // (ej. NAOMI con 100+ juegos) que en uno chico donde por suerte el índice
  // de las cartas reales tapaba a casi todos los placeholders.
  retroGameGrid.querySelectorAll('.skeleton-card').forEach(el => el.remove());
  if (!retroFilteredCatalog.length) {
    retroGameEls.forEach(el => el.remove());
    retroGameEls.clear();
    retroGameGrid.innerHTML = '<div class="empty">Sin resultados con estos filtros.</div>';
    return;
  }
  const emptyDiv = retroGameGrid.querySelector('.empty');
  if (emptyDiv) emptyDiv.remove();

  const seen = new Set();
  retroFilteredCatalog.forEach((entry, i) => {
    seen.add(entry.title);
    let card = retroGameEls.get(entry.title);
    if (!card) { card = buildRetroGameCard(entry); retroGameEls.set(entry.title, card); }
    else updateRetroGameCard(card, entry);
    if (retroGameGrid.children[i] !== card) retroGameGrid.insertBefore(card, retroGameGrid.children[i] || null);
  });
  for (const [title, el] of retroGameEls) {
    if (!seen.has(title)) { el.remove(); retroGameEls.delete(title); }
  }
  updateRetroSelectionStyles();
}

// Repurposa el panel de detalles de la derecha (el mismo de la biblioteca
// principal) para mostrar la ficha de un juego del catálogo retro.
async function renderRetroGameDetails(entry) {
  const empty = document.getElementById('details-empty');
  const content = document.getElementById('details-content');
  const videoBox = document.getElementById('d-video');
  empty.hidden = true; content.hidden = false;
  videoBox.hidden = true; videoBox.innerHTML = '';

  document.getElementById('d-title').textContent = entry.title;
  const cover = document.getElementById('d-cover');
  cover.style.backgroundImage = entry.coverUrl ? `url("${entry.coverUrl}")` : '';
  document.getElementById('d-badges').innerHTML =
    `<span class="d-badge plat">${escapeHtml(currentConsole.name)}</span>` +
    (entry.rerelease ? `<span class="d-badge not-installed">${icon('refresh')} Relanzamiento digital (versión mejorada)</span>` : '') +
    (entry.owned
      ? `<span class="d-badge installed">${icon('check')} Obtenido</span>`
      : '<span class="d-badge not-installed">— ROM no detectada</span>');
  document.getElementById('d-desc').innerHTML = skeletonLinesHtml(['long', 'medium']);
  document.getElementById('d-meta').innerHTML = '';
  // "¿Lo mueve tu PC?" no aplica a ROMs de consola, solo a juegos de PC actuales.
  document.getElementById('d-reqs').hidden = true;

  const actions = document.getElementById('d-actions');
  actions.innerHTML = '';
  const canPlay = entry.owned && (entry.ownedGame || entry.romPath);
  const btn = document.createElement('button');
  if (canPlay) {
    btn.className = 'action-btn play-ready';
    btn.innerHTML = `${icon('play')} Jugar`;
    btn.onclick = () => {
      if (entry.ownedGame) launchGame(entry.ownedGame);
      else launchLocalRom(entry);
    };
  } else {
    btn.className = 'action-btn play-missing';
    btn.innerHTML = `${icon('lock')} Falta la ROM`;
    btn.disabled = true;
  }
  actions.appendChild(btn);
  actions.appendChild(buildDerivaSearchButton(entry.title));
  // Texturas HD solo tiene sentido en las 3 consolas donde el emulador de
  // verdad soporta reemplazo de texturas (Dolphin en GC/Wii, PPSSPP en PSP
  // vía RetroArch) — ver textureDownload.js. RPCS3/Xenia/Xemu no aparecen
  // porque no tienen esa función (investigación previa, no un descuido).
  if (canPlay && entry.romPath && TEXTURE_PACK_CONSOLES.includes(currentConsole.id)) {
    actions.appendChild(buildTexturePackButton(entry, currentConsole.id));
  }
  if (!canPlay) {
    const hint = document.createElement('div');
    hint.id = 'd-play-hint';
    hint.textContent = `Agrega tu copia de "${entry.title}" en la carpeta de ROMs de ${currentConsole.name} para poder jugarlo.`;
    actions.appendChild(hint);
  }

  // Peso del archivo — solo tiene sentido para ROMs que el usuario ya tiene en
  // disco (no para el resto del catálogo, que ni siquiera existe localmente).
  const sizeBytes = entry.owned ? (entry.ownedGame ? entry.ownedGame.sizeBytes : entry.sizeBytes) : null;
  const sizeRow = sizeBytes != null ? `<b>Tamaño:</b> ${formatBytes(sizeBytes)}` : '';

  const info = await window.megahub.getRetroGameInfo(entry.title);
  // El usuario pudo haber seleccionado otro juego mientras esto cargaba
  if (!retroFilteredCatalog[retroSelectedIndex] || retroFilteredCatalog[retroSelectedIndex].title !== entry.title) return;
  if (info) {
    document.getElementById('d-desc').textContent = info.overview || '';
    const rows = sizeRow ? [sizeRow] : [];
    if (info.genres && info.genres.length) rows.push(`<b>Género:</b> ${escapeHtml(info.genres.join(', '))}`);
    if (info.developers && info.developers.length) rows.push(`<b>Desarrollador:</b> ${escapeHtml(info.developers.join(', '))}`);
    if (info.releaseDate) rows.push(`<b>Lanzamiento:</b> ${escapeHtml(info.releaseDate)}`);
    document.getElementById('d-meta').innerHTML = rows.join('<br>');
  } else {
    document.getElementById('d-desc').textContent = '';
    document.getElementById('d-meta').innerHTML = (sizeRow ? sizeRow + '<br>' : '') +
      '<span style="font-size:11.5px;opacity:0.75">Ficha completa (género, desarrollador, descripción) disponible agregando una clave gratuita de TheGamesDB en Ajustes → Modo Retro.</span>';
  }
}

