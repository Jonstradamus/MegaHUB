/* exported dealKeyOf, dealsIndex, loadDeals, selectDeal, selectedDealKey */
/* global applyStaticIcons, buildDerivaSearchButton, escapeHtml, icon:writable, skeletonLinesHtml */
/* ================= Ofertas (Steam/GOG/Epic/otras + recomendado) ================= */
// Vista a pantalla completa (mismo patrón que Logros): una sección por tienda
// (Steam/GOG/Epic/"Otras tiendas" — Eneba no está cubierto por CheapShark, la
// fuente que usamos, así que no inventamos precios para ella) más "Recomendado
// para ti" según el microgénero más jugado. Todo se cachea 6h en disco en el
// backend (ver services/dealsEngine.js), así que reabrir la vista no vuelve a
// pedir nada salvo que se use "Actualizar".
const DEALS_SECTION_INITIAL = 6;
const DEALS_NOTABLE_SAVINGS = 40; // a partir de acá una oferta cuenta como "grande" para la alerta
let dealsLoaded = false;
let dealsData = { steam: [], gog: [], epic: [], other: [], errors: [] };
let dealsReco = null;
let dealsFree = [];
const dealsExpanded = { steam: false, gog: false, epic: false, other: false };

// "Nuevas desde la última vez que abriste Ofertas" — se guarda el dealID de
// todo lo que ya se le mostró al usuario; lo que aparece en el próximo refresh
// y no está en ese set es lo que dispara la alerta (campanita) del botón.
function getSeenDealIds() {
  try { return new Set(JSON.parse(localStorage.getItem('megahub-deals-seen') || '[]')); }
  catch { return new Set(); }
}
function markDealsSeen() {
  const ids = [...dealsData.steam, ...dealsData.gog, ...dealsData.epic, ...dealsData.other, ...dealsFree]
    .map(d => d.dealID).filter(Boolean);
  const merged = [...new Set([...getSeenDealIds(), ...ids])].slice(-500);
  localStorage.setItem('megahub-deals-seen', JSON.stringify(merged));
  updateDealsBadge();
}

function money(n) {
  return n == null ? '—' : `$${n.toFixed(2)}`;
}

// Clickear una tarjeta selecciona el juego (como en la biblioteca) en vez de
// salir directo al navegador — el link real vive en el botón "Ir a la tienda"
// del panel de detalles (#details, a la derecha). dealsIndex guarda el objeto
// completo por clave para que el click delegado lo pueda recuperar.
const dealsIndex = new Map();
let selectedDealKey = null;
function dealKeyOf(d) { return String(d.dealID || d.steamAppID || d.title); }

function dealCardHtml(d, { showStore = false, isNew = false } = {}) {
  const key = dealKeyOf(d);
  dealsIndex.set(key, d);
  const priceHtml = d.salePrice === 0
    ? `<div class="deal-card-price"><span class="old">${money(d.normalPrice)}</span><span class="new deal-card-free">GRATIS</span></div>`
    : d.salePrice != null
    ? `<div class="deal-card-price"><span class="old">${money(d.normalPrice)}</span><span class="new">${money(d.salePrice)}</span></div>${d.savings > 0 ? `<div class="deal-card-savings">-${d.savings}%</div>` : ''}`
    : `<div class="deal-card-price"><span class="new">Ver precio</span></div>`;
  return `
    <div class="deal-card${key === selectedDealKey ? ' selected' : ''}" data-deal-key="${key}" tabindex="0" role="button" title="${escapeHtml(d.title)}">
      ${isNew ? '<span class="deal-card-new">Nuevo</span>' : ''}
      ${d.thumb ? `<img class="deal-card-thumb" src="${escapeHtml(d.thumb)}" alt="" loading="lazy" />` : '<div class="deal-card-thumb"></div>'}
      <div class="deal-card-title">${escapeHtml(d.title)}</div>
      ${showStore ? `<div class="deal-store-badge">${escapeHtml(d.storeName)}</div>` : ''}
      ${priceHtml}
    </div>`;
}

// Metacritic clasifica por color con estos mismos cortes (75+ verde, 50-74
// amarillo, <50 rojo) — se replica esa convención visual, ya reconocible,
// para que la puntuación se lea de un vistazo sin tener que leer el número.
function metacriticTier(score) {
  if (score >= 75) return 'great';
  if (score >= 50) return 'mixed';
  return 'bad';
}
function steamTier(pct) {
  if (pct >= 80) return 'great';
  if (pct >= 50) return 'mixed';
  return 'bad';
}

function scoreBlockHtml(d) {
  if (d.metacriticScore != null) {
    const tier = metacriticTier(d.metacriticScore);
    const verdict = tier === 'great' ? 'Aclamación general' : tier === 'mixed' ? 'Reseñas mixtas' : 'Reseñas negativas';
    return `
      <div class="deal-score">
        <div class="score-badge score-${tier}">${d.metacriticScore}</div>
        <div class="score-meta">
          <div class="score-source">Metacritic</div>
          <div class="score-verdict">${verdict}</div>
        </div>
      </div>`;
  }
  if (d.steamRatingPercent != null) {
    const tier = steamTier(d.steamRatingPercent);
    const verdict = tier === 'great' ? 'Mayormente positivas' : tier === 'mixed' ? 'Variadas' : 'Mayormente negativas';
    return `
      <div class="deal-score">
        <div class="score-badge score-${tier} score-steam">${d.steamRatingPercent}%</div>
        <div class="score-meta">
          <div class="score-source">Steam</div>
          <div class="score-verdict">${verdict}</div>
        </div>
      </div>`;
  }
  return `
    <div class="deal-score">
      <div class="score-badge score-none">—</div>
      <div class="score-meta">
        <div class="score-source">Puntuación</div>
        <div class="score-verdict">Sin datos disponibles</div>
      </div>
    </div>`;
}

function priceBlockHtml(d) {
  if (d.salePrice == null) {
    return `<div class="deal-price-block"><span class="deal-price-new">${money(d.normalPrice)}</span></div>`;
  }
  if (d.salePrice === 0) {
    return `<div class="deal-price-block"><span class="deal-price-old">${money(d.normalPrice)}</span><span class="deal-price-new deal-card-free">GRATIS</span></div>`;
  }
  return `
    <div class="deal-price-block">
      <span class="deal-price-old">${money(d.normalPrice)}</span>
      <span class="deal-price-new">${money(d.salePrice)}</span>
      ${d.savings > 0 ? `<span class="deal-price-discount">-${d.savings}%</span>` : ''}
    </div>`;
}

function selectDeal(key) {
  const deal = dealsIndex.get(key);
  if (!deal) return;
  selectedDealKey = key;
  document.querySelectorAll('.deal-card').forEach(el => el.classList.toggle('selected', el.dataset.dealKey === key));
  renderDealDetails(deal);
}

function renderDealDetails(d) {
  const empty = document.getElementById('details-empty');
  const content = document.getElementById('details-content');
  const videoBox = document.getElementById('d-video');
  empty.hidden = true; content.hidden = false;
  videoBox.hidden = true; videoBox.innerHTML = '';

  document.getElementById('d-title').textContent = d.title;
  document.getElementById('d-cover').style.backgroundImage = d.thumb ? `url("${d.thumb}")` : '';
  document.getElementById('d-badges').innerHTML =
    `<span class="d-badge plat">${escapeHtml(d.storeName)}</span>` +
    (d.releaseYear ? `<span class="d-badge">${d.releaseYear}</span>` : '');
  document.getElementById('d-desc').textContent = '';
  document.getElementById('d-meta').innerHTML = scoreBlockHtml(d) + priceBlockHtml(d);
  document.getElementById('d-reqs').hidden = true;

  const actions = document.getElementById('d-actions');
  actions.innerHTML = '';
  const goBtn = document.createElement('button');
  goBtn.className = 'action-btn install';
  goBtn.innerHTML = `${icon('link')} Ir a la tienda`;
  goBtn.onclick = () => window.open(d.dealLink, '_blank');
  actions.appendChild(goBtn);
  actions.appendChild(buildDerivaSearchButton(d.title));
}

document.getElementById('deals-wrap').addEventListener('click', (e) => {
  const card = e.target.closest('.deal-card');
  if (card) selectDeal(card.dataset.dealKey);
});
document.getElementById('deals-wrap').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.deal-card');
  if (card) { e.preventDefault(); selectDeal(card.dataset.dealKey); }
});

// "Gratis ahora" (Epic semanal + freebies puntuales de Steam/GOG/otras, ver
// dealsEngine.getFreeGames): va primero, antes de "Recomendado para ti" —
// es la sección con vencimiento (24-72h típico), así que gana prioridad
// visual sobre el resto, que no se vence.
function renderDealsFree() {
  const section = document.getElementById('deals-free-section');
  if (!dealsFree.length) { section.hidden = true; return; }
  const seen = getSeenDealIds();
  document.getElementById('deals-free-grid').innerHTML = dealsFree
    .map(d => dealCardHtml(d, { showStore: true, isNew: !seen.has(d.dealID) }))
    .join('');
  section.hidden = false;
}

function renderDealsReco() {
  const section = document.getElementById('deals-reco-section');
  if (!dealsReco || !dealsReco.games || !dealsReco.games.length) { section.hidden = true; return; }
  section.querySelector('.deals-section-title').innerHTML =
    `<i data-icon="zap"></i> Recomendado para ti — juegas mucho <b>${escapeHtml(dealsReco.tagLabel)}</b>`;
  document.getElementById('deals-reco-grid').innerHTML = dealsReco.games.map(g => dealCardHtml(g, { showStore: true })).join('');
  applyStaticIcons(section);
  section.hidden = false;
}

function renderDealsSection(key) {
  const section = document.querySelector(`.deals-store-section[data-store="${key}"]`);
  const grid = section.querySelector('.deals-grid');
  const moreBtn = section.querySelector('.deals-more-btn');
  const countEl = section.querySelector('.deals-count');
  const all = dealsData[key] || [];
  const failed = dealsData.errors.includes(key === 'other' ? 'Otras tiendas' : { steam: 'Steam', gog: 'GOG', epic: 'Epic Games' }[key]);
  countEl.textContent = all.length ? `(${all.length})` : '';
  if (failed && !all.length) {
    grid.innerHTML = '<div class="empty">No se pudo consultar esta tienda ahora mismo — probá "Actualizar" en un rato.</div>';
    moreBtn.hidden = true;
    return;
  }
  if (!all.length) {
    grid.innerHTML = '<div class="empty">Sin ofertas grandes en este momento.</div>';
    moreBtn.hidden = true;
    return;
  }
  const seen = getSeenDealIds();
  const visible = dealsExpanded[key] ? all : all.slice(0, DEALS_SECTION_INITIAL);
  grid.innerHTML = visible.map(d => dealCardHtml(d, { isNew: d.savings >= DEALS_NOTABLE_SAVINGS && !seen.has(d.dealID) })).join('');
  moreBtn.hidden = all.length <= DEALS_SECTION_INITIAL;
  moreBtn.textContent = dealsExpanded[key] ? 'Ver menos' : `Ver más (${all.length - DEALS_SECTION_INITIAL})`;
}

function renderDealsAll() {
  renderDealsFree();
  renderDealsReco();
  ['steam', 'gog', 'epic', 'other'].forEach(renderDealsSection);
}

document.querySelectorAll('.deals-more-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.closest('.deals-store-section').dataset.store;
    dealsExpanded[key] = !dealsExpanded[key];
    renderDealsSection(key);
  });
});

function dealsSkeletonHtml() {
  return Array.from({ length: 6 }, () => `<div class="deal-card deal-card-skeleton">${skeletonLinesHtml(['medium', 'short'])}</div>`).join('');
}

async function loadDeals({ silent = false, force = false } = {}) {
  if (!silent) {
    document.getElementById('deals-free-grid').innerHTML = dealsSkeletonHtml();
    document.getElementById('deals-reco-grid').innerHTML = dealsSkeletonHtml();
    document.querySelectorAll('.deals-store-section .deals-grid').forEach(g => { g.innerHTML = dealsSkeletonHtml(); });
  }
  const [topRes, recoRes, freeRes] = await Promise.all([
    window.megahub.dealsGetTop(force),
    window.megahub.dealsGetRecommendation(force),
    window.megahub.dealsGetFree(force),
  ]);
  dealsData = {
    steam: (topRes && topRes.steam) || [],
    gog: (topRes && topRes.gog) || [],
    epic: (topRes && topRes.epic) || [],
    other: (topRes && topRes.other) || [],
    errors: (topRes && topRes.errors) || [],
  };
  dealsReco = (recoRes && recoRes.recommendation) || null;
  dealsFree = (freeRes && freeRes.games) || [];
  dealsLoaded = true;
  updateDealsBadge();
  if (!silent) renderDealsAll();
}

// Botón "OFERTAS" del topbar: punto + brillo verde en TODO el botón si hay
// ofertas grandes NUEVAS (que el usuario todavía no vio) — nada si no hay
// nada nuevo, para que el brillo signifique algo en vez de quedar prendido
// siempre. Al abrir la vista se marcan como vistas (ver markDealsSeen) y se apaga solo.
function updateDealsBadge() {
  const badge = document.getElementById('deals-badge');
  const btn = document.querySelector('.view-deals-btn');
  const all = [...dealsData.steam, ...dealsData.gog, ...dealsData.epic, ...dealsData.other];
  const seen = getSeenDealIds();
  const hasNew = all.some(d => d.savings >= DEALS_NOTABLE_SAVINGS && !seen.has(d.dealID))
    || dealsFree.some(d => !seen.has(d.dealID)); // un juego gratis nuevo siempre cuenta como notable, sin importar el umbral de ahorro
  badge.hidden = !hasNew;
  btn.classList.toggle('deals-has-new', hasNew);
}

async function initDealsView() {
  if (!dealsLoaded) await loadDeals();
  else renderDealsAll();
  markDealsSeen();
}
document.getElementById('deals-refresh-btn').addEventListener('click', async () => {
  dealsLoaded = false;
  await loadDeals({ force: true });
  markDealsSeen();
});

