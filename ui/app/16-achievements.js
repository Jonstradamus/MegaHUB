/* exported isRecentlyEarned, mhAchCache, mhAchLoading */
/* global CONSOLE_REGISTRY, allGames, consoleMonogram, escapeHtml, hueFromString, icon, showToast, skeletonLinesHtml, toastNewlyUnlockedAchievements */
/* ================= Logros ================= */
// Dos fuentes independientes en la misma pestaña 🏆 LOGROS:
//  - "mh" → motor propio de MegaHUB (global + Steam por horas reales +
//           Retro por juego/consola con sesiones medidas por MegaHUB).
//  - "ra" → RetroAchievements.

let achSource = 'mh'; // mh | ra | consolas
let achSourcesLoaded = new Set(); // para no re-pedir datos al solo cambiar de pestaña

async function initAchievementsView() {
  document.querySelectorAll('#ach-source-tabs .chip').forEach(c => c.classList.toggle('active', c.dataset.achSource === achSource));
  document.getElementById('ach-source-mh').hidden = achSource !== 'mh';
  document.getElementById('ach-source-ra').hidden = achSource !== 'ra';
  document.getElementById('ach-source-consolas').hidden = achSource !== 'consolas';

  if (achSource === 'mh' && !achSourcesLoaded.has('mh')) { achSourcesLoaded.add('mh'); await loadMhDashboard(); }
  else if (achSource === 'ra' && !achSourcesLoaded.has('ra')) { achSourcesLoaded.add('ra'); await initRaSourcePanel(); }
  else if (achSource === 'consolas' && !achSourcesLoaded.has('consolas')) { achSourcesLoaded.add('consolas'); await loadConsolasDashboard(); }
}

document.getElementById('ach-source-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-ach-source]');
  if (!btn) return;
  achSource = btn.dataset.achSource;
  initAchievementsView();
});

/* ---- Motor propio de MegaHUB ---- */

let mhAchCache = [];
let mhTab = 'global';

// Llamada liviana (sin tocar el DOM del dashboard de Logros) para que otras
// vistas —el panel de detalle de un juego, ver renderDetailsAchievements()—
// puedan pedir mhAchCache sin depender de que el usuario haya abierto la
// pestaña Logros primero. mhAchLoading deduplica: si 2 fichas de juego se
// abren rápido antes de que la primera termine, la segunda espera la MISMA
// promesa en vez de disparar un segundo cálculo completo (recorre todos los
// appids de Steam + todas las consolas retro, no es gratis).
let mhAchLoading = null;
async function fetchMhAchievements() {
  if (mhAchLoading) return mhAchLoading;
  const consoles = CONSOLE_REGISTRY.map(c => ({ id: c.id, name: c.name }));
  const consoleNames = Object.fromEntries(consoles.map(c => [c.id, c.name]));
  mhAchLoading = window.megahub.mhAchGetProgress({ libraryGamesCount: allGames.length, consoleNames, consoles })
    .then(res => {
      mhAchCache = res;
      if (Array.isArray(res)) toastNewlyUnlockedAchievements(res);
      return res;
    })
    .finally(() => { mhAchLoading = null; });
  return mhAchLoading;
}

async function loadMhDashboard() {
  const panel = document.getElementById('mh-panel');
  panel.innerHTML = Array.from({ length: 6 }, () =>
    `<div class="ach-card">${skeletonLinesHtml(['medium'])}${skeletonLinesHtml(['long', 'short'])}</div>`
  ).join('');
  const res = await fetchMhAchievements();
  if (res && res.error) {
    panel.innerHTML = `<div class="empty">Error: ${escapeHtml(res.error)}</div>`;
    return;
  }
  renderMhPanel();
}

document.getElementById('mh-refresh-btn').addEventListener('click', loadMhDashboard);

document.getElementById('mh-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-mh-tab]');
  if (!btn) return;
  mhTab = btn.dataset.mhTab;
  document.querySelectorAll('#mh-tabs .chip').forEach(c => c.classList.toggle('active', c === btn));
  renderMhPanel();
});

// Logro desbloqueado en los últimos 5 minutos: se destaca con un destello de
// borde + una cinta "Nuevo" en vez de quedar visualmente igual que uno
// ganado hace meses.
function isRecentlyEarned(a) {
  return a.earned && a.earnedAt && (Date.now() - a.earnedAt) < 5 * 60 * 1000;
}

function pctOf(current, target) {
  if (!target) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function renderMhPanel() {
  const panel = document.getElementById('mh-panel');
  const items = (mhAchCache || []).filter(a => a.scope === mhTab);
  if (!items.length) {
    panel.innerHTML = '<div class="empty">Nada por aquí todavía — sigue jugando para desbloquear logros en esta categoría.</div>';
    return;
  }
  if (mhTab === 'steamgame' || mhTab === 'retrogame') {
    renderMhGameList(panel, items);
    return;
  }
  panel.className = 'ach-grid';
  // Ganados primero, y entre empatados el más cercano a completarse.
  const sorted = [...items].sort((a, b) => (b.earned - a.earned) || (pctOf(b.progressCurrent, b.progressTarget) - pctOf(a.progressCurrent, a.progressTarget)));
  panel.innerHTML = sorted.map(a => {
    const pct = pctOf(a.progressCurrent, a.progressTarget);
    const sub = mhTab === 'retroconsole' ? consoleNameLookup(a.consoleId) : '';
    return `
      <div class="ach-card${a.earned ? ' earned' : ''}${isRecentlyEarned(a) ? ' recent' : ''}">
        ${isRecentlyEarned(a) ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
        <div class="ach-title">${a.earned ? icon('check') : ''}${escapeHtml(a.title)}</div>
        ${sub ? `<div class="ach-sub">${escapeHtml(sub)}</div>` : ''}
        <div class="ach-desc">${escapeHtml(a.description)}</div>
        <div class="ra-progress-bar${a.earned ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
        <div class="ra-progress-label"><span>${a.progressCurrent}/${a.progressTarget}</span><span>${pct}%</span></div>
      </div>
    `;
  }).join('');
}

// "Por juego (Steam)" y "Por juego (Retro)": en vez de mezclar los logros de
// todos los juegos en una sola parrilla, se agrupan por juego — una fila
// resumen por título, con sus propios logros como desplegable al hacer clic.
function renderMhGameList(panel, items) {
  panel.className = 'ach-game-list';
  const groupKey = (a) => (a.scope === 'steamgame' ? a.appid : a.gameKey);
  const groups = new Map();
  for (const a of items) {
    const key = groupKey(a);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  const rows = [...groups.entries()].map(([key, achs]) => {
    const first = achs[0];
    const earnedCount = achs.filter(a => a.earned).length;
    const gameTitle = first.gameTitle || key.split('::').pop();
    const gameIconUrl = first.scope === 'steamgame' ? first.gameIcon : null;
    const sub = first.scope === 'retrogame' ? consoleNameLookup(first.consoleId) : '';
    const monogramSeed = first.scope === 'retrogame' ? (first.consoleId || gameTitle) : gameTitle;
    // Dentro del desplegable: el logro más avanzado (o el ganado más alto) primero.
    const sortedAchs = [...achs].sort((a, b) => (b.earned - a.earned) || (b.progressTarget - a.progressTarget));
    const maxTarget = Math.max(...achs.map(a => a.progressTarget || 0));
    const pct = pctOf(first.progressCurrent, maxTarget);
    return `
      <div class="ach-game-row">
        <button class="ach-game-row-head" data-key="${escapeHtml(String(key))}">
          ${gameIconUrl ? `<img class="ach-game-icon" src="${escapeHtml(gameIconUrl)}">` : `<div class="ach-game-icon ach-game-icon-mono" style="background:linear-gradient(155deg, hsl(${hueFromString(monogramSeed)} 50% 28%), hsl(${(hueFromString(monogramSeed) + 35) % 360} 50% 16%));">${escapeHtml(consoleMonogram(gameTitle))}</div>`}
          <div class="ach-game-row-info">
            <div class="ach-game-row-title">${escapeHtml(gameTitle)}${sub ? ` <span class="ach-sub">— ${escapeHtml(sub)}</span>` : ''}</div>
            <div class="ra-progress-bar${earnedCount === achs.length ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
            <div class="ra-progress-label"><span>${earnedCount}/${achs.length} logros</span><span>${first.progressCurrent}h</span></div>
          </div>
          <span class="ach-game-row-chevron">${icon('chevron')}</span>
        </button>
        <div class="ach-game-row-body" hidden>
          ${sortedAchs.map(a => `
              <div class="ach-card small${a.earned ? ' earned' : ''}${isRecentlyEarned(a) ? ' recent' : ''}">
                ${isRecentlyEarned(a) ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
                <div class="ach-title">${a.earned ? icon('check') : ''}${escapeHtml(a.title)}</div>
                <div class="ach-desc">${escapeHtml(a.description)}</div>
                <div class="ra-progress-bar${a.earned ? ' mastered' : ''}"><div style="width:${pctOf(a.progressCurrent, a.progressTarget)}%"></div></div>
                <div class="ra-progress-label"><span>${a.progressCurrent}/${a.progressTarget}h</span><span>${pctOf(a.progressCurrent, a.progressTarget)}%</span></div>
              </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  // Con más logros ganados primero, para que lo más relevante quede arriba.
  panel.innerHTML = rows.join('');
  panel.querySelectorAll('.ach-game-row-head').forEach(head => {
    head.addEventListener('click', () => {
      const body = head.nextElementSibling;
      body.hidden = !body.hidden;
      head.querySelector('.ach-game-row-chevron').classList.toggle('open', !body.hidden);
    });
  });
}

function consoleNameLookup(consoleId) {
  const c = CONSOLE_REGISTRY.find(x => x.id === consoleId);
  return c ? c.name : consoleId;
}


/* ---- RetroAchievements ---- */

let raCompletionCache = null; // lista de juegos con progreso, recargada al entrar/actualizar
let raTab = 'games'; // games | recent

async function initRaSourcePanel() {
  const emptyState = document.getElementById('ra-empty-state');
  const dashboard = document.getElementById('ra-dashboard');
  const gameDetail = document.getElementById('ra-game-detail');
  gameDetail.hidden = true;

  await refreshCheevosStatusUi();

  const has = await window.megahub.raHasAccount();
  if (!has) {
    emptyState.hidden = false;
    dashboard.hidden = true;
    return;
  }
  emptyState.hidden = true;
  dashboard.hidden = false;
  await loadAchievementsDashboard();
}

async function refreshCheevosStatusUi() {
  const statusEl = document.getElementById('ra-cheevos-status');
  const btn = document.getElementById('ra-enable-cheevos-btn');
  const openBtn = document.getElementById('ra-open-retroarch-btn');
  const status = await window.megahub.raGetCheevosStatus();
  if (!status.installed) {
    statusEl.textContent = 'RetroArch no se detectó instalado — instálalo primero para poder jugar con logros activos.';
    btn.hidden = true;
    openBtn.hidden = true;
    return;
  }
  // Iniciar sesión (usuario + contraseña reales) se hace SIEMPRE dentro de
  // RetroArch mismo (Ajustes > Logros) — MegaHUB no la pide ni la guarda,
  // por eso el botón solo abre la app, no rellena nada.
  openBtn.hidden = false;
  if (status.enabled) {
    statusEl.textContent = '✔ Los logros ya están activados en RetroArch — si aún no iniciaste sesión, hazlo en Ajustes > Logros.';
    btn.hidden = true;
  } else {
    statusEl.textContent = 'RetroArch detectado, pero los logros todavía no están activados.';
    btn.hidden = false;
  }
}

document.getElementById('ra-open-retroarch-btn').addEventListener('click', () => {
  window.megahub.retroOpenRetroArch();
});

document.getElementById('ra-enable-cheevos-btn').addEventListener('click', async () => {
  const btn = document.getElementById('ra-enable-cheevos-btn');
  btn.disabled = true;
  const result = await window.megahub.raEnableCheevos();
  btn.disabled = false;
  const statusEl = document.getElementById('ra-cheevos-status');
  statusEl.textContent = result.error ? 'Error: ' + result.error : result.message;
  if (result.ok) btn.hidden = true;
});

document.getElementById('ra-connect-btn').addEventListener('click', async () => {
  const username = document.getElementById('ra-username-input').value.trim();
  const apiKey = document.getElementById('ra-key-input').value.trim();
  if (!username || !apiKey) return;
  const btn = document.getElementById('ra-connect-btn');
  btn.disabled = true;
  btn.textContent = 'Conectando…';
  await window.megahub.raSetAccount({ username, apiKey });
  const summary = await window.megahub.raGetSummary();
  btn.disabled = false;
  btn.textContent = 'Conectar';
  if (summary && summary.error) {
    alert('No se pudo conectar: ' + summary.error + '\n\nRevisa que el usuario y la API key sean correctos.');
    await window.megahub.raSetAccount({ username: null, apiKey: null });
    return;
  }
  await initRaSourcePanel();
});

document.getElementById('ra-disconnect-btn').addEventListener('click', async () => {
  if (!confirm('¿Desconectar tu cuenta de RetroAchievements de MegaHUB? (esto no borra tu progreso en retroachievements.org, solo el acceso desde aquí)')) return;
  await window.megahub.raSetAccount({ username: null, apiKey: null });
  await initRaSourcePanel();
});

document.getElementById('ra-refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('ra-refresh-btn');
  btn.disabled = true;
  await loadAchievementsDashboard(true);
  btn.disabled = false;
});

document.getElementById('ra-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-ra-tab]');
  if (!btn) return;
  raTab = btn.dataset.raTab;
  document.querySelectorAll('#ra-tabs .chip').forEach(c => c.classList.toggle('active', c === btn));
  document.getElementById('ra-panel-games').hidden = raTab !== 'games';
  document.getElementById('ra-panel-recent').hidden = raTab !== 'recent';
  if (raTab === 'recent') renderRaHistory();
});

document.getElementById('ra-game-back').addEventListener('click', () => {
  document.getElementById('ra-game-detail').hidden = true;
  document.getElementById('ra-dashboard').hidden = false;
});

async function loadAchievementsDashboard(forceRefreshHistory) {
  const usernameLabel = document.getElementById('ra-username-label');
  const statsEl = document.getElementById('ra-stats');
  usernameLabel.innerHTML = '<span class="skeleton skeleton-line short" style="width:160px;"></span>';
  statsEl.innerHTML = '<span class="skeleton skeleton-pill"></span><span class="skeleton skeleton-pill"></span><span class="skeleton skeleton-pill"></span>';

  const [summary, progress] = await Promise.all([
    window.megahub.raGetSummary(),
    window.megahub.raGetCompletionProgress(),
  ]);

  if (summary && summary.error) {
    usernameLabel.textContent = 'Error al cargar el perfil';
    statsEl.innerHTML = `<span class="ra-stat-pill">${escapeHtml(summary.error)}</span>`;
    return;
  }

  usernameLabel.textContent = summary.username || '';
  const masteredCount = (progress || []).filter(g => g.highestAwardKind === 'mastered' || g.highestAwardKind === 'completed').length;
  statsEl.innerHTML = `
    <span class="ra-stat-pill ra-points"><b>${summary.points ?? 0}</b> puntos</span>
    <span class="ra-stat-pill"><b>${summary.truePoints ?? 0}</b> puntos hardcore</span>
    ${summary.rank ? `<span class="ra-stat-pill">Rank <b>#${summary.rank}</b></span>` : ''}
    <span class="ra-stat-pill"><b>${(progress || []).length}</b> juegos jugados</span>
    <span class="ra-stat-pill ra-points"><b>${masteredCount}</b> masterizados</span>
  `;

  raCompletionCache = (progress && !progress.error) ? progress : [];
  renderRaGames();

  if (forceRefreshHistory) await window.megahub.raRefreshHistory();
  else window.megahub.raRefreshHistory(); // refresco en segundo plano, no bloquea el dashboard
  if (raTab === 'recent') renderRaHistory();
}

function renderRaGames() {
  const grid = document.getElementById('ra-panel-games');
  const games = raCompletionCache || [];
  if (!games.length) {
    grid.innerHTML = '<div class="empty">Todavía no hay progreso registrado — juega algo con los logros activados en RetroArch.</div>';
    return;
  }
  // Más reciente jugado primero.
  const sorted = [...games].sort((a, b) => new Date(b.mostRecentAwardedDate || 0) - new Date(a.mostRecentAwardedDate || 0));
  grid.innerHTML = sorted.map(g => {
    const pct = g.maxPossible ? Math.round((g.numAwarded / g.maxPossible) * 100) : 0;
    const mastered = g.highestAwardKind === 'mastered' || g.highestAwardKind === 'completed';
    return `
      <div class="ra-game-card" data-game-id="${g.gameId}">
        ${g.icon ? `<img class="ra-icon" src="${escapeHtml(g.icon)}">` : '<div class="ra-icon"></div>'}
        <div class="ra-game-info">
          <div class="ra-game-title">${escapeHtml(g.title)} ${mastered ? `<span class="ra-mastery-badge">${icon('trophy')}${escapeHtml(g.highestAwardKind)}</span>` : ''}</div>
          <div class="ra-game-console">${escapeHtml(g.consoleName || '')}</div>
          <div class="ra-progress-bar${mastered ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
          <div class="ra-progress-label"><span>${g.numAwarded}/${g.maxPossible}</span><span>${pct}%</span></div>
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.ra-game-card').forEach(card => {
    card.addEventListener('click', () => openRaGameDetail(card.dataset.gameId));
  });
}

async function renderRaHistory() {
  const panel = document.getElementById('ra-panel-recent');
  panel.innerHTML = Array.from({ length: 5 }, () =>
    `<div class="ra-history-item"><div class="skeleton" style="width:40px;height:40px;border-radius:6px;flex-shrink:0;"></div>
      <div class="ra-hist-main">${skeletonLinesHtml(['medium', 'short'])}</div></div>`
  ).join('');
  const history = await window.megahub.raGetHistory();
  if (!history.length) {
    panel.innerHTML = '<div class="empty">Sin logros registrados todavía — se van acumulando aquí cada vez que abres esta pestaña.</div>';
    return;
  }
  panel.innerHTML = history.map(h => `
    <div class="ra-history-item">
      ${h.badgeUrl ? `<img src="${escapeHtml(h.badgeUrl)}">` : ''}
      <div class="ra-hist-main">
        <div class="ra-hist-title">${escapeHtml(h.title)} — <span style="color:var(--dim);font-weight:500;">${escapeHtml(h.gameTitle || '')}</span></div>
        <div class="ra-hist-meta">${escapeHtml(h.description || '')} · ${new Date(h.date).toLocaleString()}${h.hardcore ? ' · Hardcore' : ''}</div>
      </div>
      <div class="ra-hist-points">${h.points} pts</div>
    </div>
  `).join('');
}

async function openRaGameDetail(gameId) {
  document.getElementById('ra-dashboard').hidden = true;
  const detail = document.getElementById('ra-game-detail');
  detail.hidden = false;
  document.getElementById('ra-game-detail-header').innerHTML =
    `<div class="skeleton" style="width:64px;height:64px;border-radius:10px;flex-shrink:0;"></div><div style="flex:1;">${skeletonLinesHtml(['medium', 'short'])}</div>`;
  document.getElementById('ra-game-detail-grid').innerHTML = Array.from({ length: 6 }, () =>
    `<div class="ra-ach-card"><div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
      <div style="flex:1;">${skeletonLinesHtml(['medium', 'long', 'short'])}</div></div>`
  ).join('');

  const game = await window.megahub.raGetGameProgress(gameId);
  if (game.error) {
    document.getElementById('ra-game-detail-header').innerHTML = `<div>Error: ${escapeHtml(game.error)}</div>`;
    return;
  }
  document.getElementById('ra-game-detail-header').innerHTML = `
    ${game.icon ? `<img src="${escapeHtml(game.icon)}">` : ''}
    <div>
      <h2>${escapeHtml(game.title)}</h2>
      <div class="side-note">${escapeHtml(game.consoleName || '')} · ${game.achievements.filter(a => a.earned).length}/${game.numAchievements} logros${game.userCompletion ? ` · ${escapeHtml(game.userCompletion)}` : ''}</div>
    </div>
  `;
  document.getElementById('ra-game-detail-grid').innerHTML = game.achievements.map(a => {
    const recent = a.earned && a.dateEarned && (Date.now() - new Date(a.dateEarned).getTime()) < 5 * 60 * 1000;
    return `
    <div class="ra-ach-card${a.earned ? '' : ' locked'}${recent ? ' recent' : ''}">
      ${recent ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
      ${a.badgeUrl ? `<img src="${escapeHtml(a.badgeUrl)}">` : ''}
      <div>
        <div class="ra-ach-title">${escapeHtml(a.title)}</div>
        <div class="ra-ach-desc">${escapeHtml(a.description || '')}</div>
        <div class="ra-ach-points">${a.points} pts${a.earnedHardcore ? ' · Hardcore' : ''}</div>
      </div>
    </div>
  `;
  }).join('');
}

/* ---- Xenia (Xbox 360) / RPCS3 (PS3) — logros y trofeos 100% locales ---- */

let consolasCache = []; // [{ key, source: 'xenia'|'rpcs3', title, iconDataUrl, earnedCount, totalCount, unknownStatus, items }]

async function loadConsolasDashboard() {
  const grid = document.getElementById('consolas-panel-games');
  grid.innerHTML = Array.from({ length: 3 }, () =>
    `<div class="ra-game-card"><div class="skeleton" style="width:64px;height:64px;border-radius:8px;flex-shrink:0;"></div>
      <div class="ra-game-info">${skeletonLinesHtml(['medium', 'short'])}</div></div>`
  ).join('');

  // Nunca dejar el esqueleto pegado en silencio: si algo revienta acá (IPC no
  // registrado todavía por una ventana vieja, un .gpd/TROPUSR corrupto, lo que
  // sea), se muestra el error en vez de quedarse cargando para siempre.
  let xenia, rpcs3;
  try {
    [xenia, rpcs3] = await Promise.all([window.megahub.xeniaGetAchievements(), window.megahub.rpcs3GetTrophies()]);
  } catch (e) {
    grid.innerHTML = `<div class="empty">No se pudo cargar Xenia/RPCS3: ${escapeHtml(String(e.message || e))}<br>Si acabas de actualizar MegaHUB, cierra la app por completo (no solo recargues) y vuelve a abrirla.</div>`;
    return;
  }
  const games = [];
  const errors = [];
  if (xenia && xenia.error) errors.push(`Xenia: ${xenia.error}`);
  if (rpcs3 && rpcs3.error) errors.push(`RPCS3: ${rpcs3.error}`);

  try {
  if (xenia && !xenia.error && xenia.installed) {
    for (const profile of xenia.profiles || []) {
      for (const g of profile.games || []) {
        games.push({
          key: `xenia:${profile.profileId}:${g.titleId}`,
          source: 'xenia',
          title: g.title,
          iconDataUrl: g.iconDataUrl,
          earnedCount: g.achievements.filter(a => a.earned).length,
          totalCount: g.achievements.length,
          unknownStatus: false,
          items: g.achievements.map(a => ({
            id: a.id, name: a.name, description: a.description, earned: a.earned,
            iconDataUrl: a.iconDataUrl, meta: `${a.gamerscore}g`,
          })),
        });
      }
    }
  }
  if (rpcs3 && !rpcs3.error && rpcs3.installed) {
    for (const g of rpcs3.games || []) {
      games.push({
        key: `rpcs3:${g.npcommid}`,
        source: 'rpcs3',
        title: g.title,
        iconDataUrl: g.iconDataUrl,
        earnedCount: 0,
        totalCount: g.trophies.length,
        unknownStatus: true, // ver limitación TROPUSR.DAT en rpcs3Trophies.js
        items: g.trophies.map(t => ({
          id: t.id, name: t.hidden ? '???' : t.name, description: t.hidden ? 'Trofeo oculto hasta desbloquearlo.' : t.description,
          earned: null, iconDataUrl: t.iconDataUrl, meta: t.typeLabel,
        })),
      });
    }
  }

  } catch (e) {
    errors.push(`Error mostrando los datos: ${e.message || e}`);
  }

  consolasCache = games;
  if (!games.length) {
    grid.innerHTML = errors.length
      ? `<div class="empty">${errors.map(escapeHtml).join('<br>')}</div>`
      : '<div class="empty">Nada todavía — instala Xenia o RPCS3 desde Modo Retro y juega algo con logros/trofeos.</div>';
    return;
  }
  if (errors.length) showToast(errors.join(' · '), 'error', 8000);
  renderConsolasGames();
}

document.getElementById('consolas-refresh-btn').addEventListener('click', loadConsolasDashboard);

function renderConsolasGames() {
  const grid = document.getElementById('consolas-panel-games');
  grid.innerHTML = consolasCache.map(g => {
    const pct = g.unknownStatus ? 0 : (g.totalCount ? Math.round((g.earnedCount / g.totalCount) * 100) : 0);
    return `
      <div class="ra-game-card" data-key="${escapeHtml(g.key)}">
        ${g.iconDataUrl ? `<img class="ra-icon" src="${escapeHtml(g.iconDataUrl)}">` : '<div class="ra-icon"></div>'}
        <div class="ra-game-info">
          <div class="ra-game-title">${escapeHtml(g.title)} <span class="ra-mastery-badge">${g.source === 'xenia' ? 'Xenia · Xbox 360' : 'RPCS3 · PS3'}</span></div>
          ${g.unknownStatus
            ? `<div class="ra-game-console">${g.totalCount} trofeos — estado de desbloqueo no disponible todavía</div>`
            : `<div class="ra-progress-bar${pct === 100 ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
               <div class="ra-progress-label"><span>${g.earnedCount}/${g.totalCount}</span><span>${pct}%</span></div>`}
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.ra-game-card').forEach(card => {
    card.addEventListener('click', () => openConsolasGameDetail(card.dataset.key));
  });
}

function openConsolasGameDetail(key) {
  const g = consolasCache.find(x => x.key === key);
  if (!g) return;
  document.getElementById('consolas-dashboard').hidden = true;
  document.getElementById('consolas-game-detail').hidden = false;
  document.getElementById('consolas-game-detail-header').innerHTML = `
    ${g.iconDataUrl ? `<img src="${escapeHtml(g.iconDataUrl)}">` : ''}
    <div>
      <h2>${escapeHtml(g.title)}</h2>
      <div class="side-note">${g.source === 'xenia' ? 'Xenia · Xbox 360' : 'RPCS3 · PS3'} · ${g.unknownStatus ? `${g.totalCount} trofeos` : `${g.earnedCount}/${g.totalCount} logros`}</div>
    </div>
  `;
  document.getElementById('consolas-game-detail-grid').innerHTML = g.items.map(a => `
    <div class="ra-ach-card${a.earned ? '' : ' locked'}">
      ${a.iconDataUrl ? `<img src="${escapeHtml(a.iconDataUrl)}">` : ''}
      <div>
        <div class="ra-ach-title">${escapeHtml(a.name)}</div>
        <div class="ra-ach-desc">${escapeHtml(a.description || '')}</div>
        <div class="ra-ach-points">${escapeHtml(a.meta)}${a.earned === null ? ' · estado desconocido' : ''}</div>
      </div>
    </div>
  `).join('');
}

document.getElementById('consolas-game-back').addEventListener('click', () => {
  document.getElementById('consolas-game-detail').hidden = true;
  document.getElementById('consolas-dashboard').hidden = false;
});

