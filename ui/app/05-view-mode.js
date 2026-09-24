/* exported findCoverForActivity, formatHours, switchViewMode, updateSearchContext, updateSidebarMode, widgetRefreshTile */
/* global CONSOLE_REGISTRY, PLAT_LABEL, achievementsWrap, allGames, currentConsole, dealsWrap, dockWrap, escapeHtml, homeWrap, icon, initAchievementsView, initDealsView, initHomeView, initProfileView, initRetroView, list, profileWrap, refreshSelection, renderDetails, retroWrap, searchInput, selectedDealKey:writable, showToast, skeletonLinesHtml, viewMode:writable, widgetAutoHide */
/* ================= Modo de vista ================= */

function applyViewMode() {
  homeWrap.hidden = viewMode !== 'home';
  dockWrap.hidden = viewMode !== 'dock';
  list.hidden = viewMode !== 'list';
  retroWrap.hidden = viewMode !== 'retro';
  achievementsWrap.hidden = viewMode !== 'achievements';
  dealsWrap.hidden = viewMode !== 'deals';
  profileWrap.hidden = viewMode !== 'profile';
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
  updateSidebarMode();
  updateSearchContext();
}
// Pantalla de carga al cambiar de modo: PC y Retro quedan aislados del todo
// (input, navegación, panel de detalles), así que el cambio ya no es un
// simple toggle de "hidden" — se muestra una transición breve mientras un
// modo se apaga y el otro se prepara, para que quede claro que no están
// corriendo los dos a la vez.
const modeTransitionOverlay = document.getElementById('mode-transition-overlay');
const modeTransitionLabel = document.getElementById('mode-transition-label');
const modeTransitionIcon = document.getElementById('mode-transition-icon');
const MODE_TRANSITION_META = {
  home: { label: 'Inicio', color: 'var(--accent)', icon: 'home' },
  dock: { label: 'PC', color: 'var(--accent)', icon: 'grid' },
  list: { label: 'PC', color: 'var(--accent)', icon: 'grid' },
  retro: { label: 'Modo Retro', color: 'var(--retro-accent)', icon: 'gamepad' },
  achievements: { label: 'Logros', color: 'var(--warn)', icon: 'trophy' },
  deals: { label: 'Ofertas', color: 'var(--ok)', icon: 'tag' },
  profile: { label: 'Perfil', color: 'var(--great)', icon: 'chart' },
};
function switchViewMode(nextMode) {
  if (nextMode === viewMode) return;
  const meta = MODE_TRANSITION_META[nextMode] || MODE_TRANSITION_META.dock;
  modeTransitionLabel.textContent = meta.label;
  modeTransitionIcon.innerHTML = icon(meta.icon);
  modeTransitionOverlay.style.setProperty('--mt-color', meta.color);
  modeTransitionOverlay.hidden = false;
  requestAnimationFrame(() => {
    setTimeout(() => {
      viewMode = nextMode;
      localStorage.setItem('megahub-view', viewMode);
      searchInput.value = '';
      applyViewMode();
      if (viewMode === 'retro') {
        // El panel de detalles es compartido visualmente con la biblioteca de
        // PC — sin este reset, seguía mostrando el último juego de PC
        // seleccionado mientras el usuario navega el modo retro (parecía que
        // "se quedó cargado"). Modo retro y modo PC son aislados: cada uno
        // entra con el panel de detalles vacío hasta que el usuario elija algo
        // dentro de ESE modo.
        renderDetails(null);
        initRetroView();
      } else if (viewMode === 'achievements') {
        renderDetails(null);
        initAchievementsView();
      } else if (viewMode === 'deals') {
        renderDetails(null);
        selectedDealKey = null;
        initDealsView();
      } else if (viewMode === 'home') {
        renderDetails(null);
        initHomeView();
      } else if (viewMode === 'profile') {
        renderDetails(null);
        initProfileView();
      } else {
        refreshSelection();
      }
      // El wipe + el pop del contenido duran ~600ms — se espera un poco más
      // de lo que tardaba el spinner viejo (220ms) para que la animación se
      // alcance a leer completa en vez de cortarse a medias.
      setTimeout(() => { modeTransitionOverlay.hidden = true; }, 480);
    }, 0);
  });
}
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchViewMode(btn.dataset.view);
  });
});
applyViewMode();
// Restaurar la vista con la que se cerró la app (si no era 'dock'/'list', que
// no necesitan init propio) se hace en 20-init.js, NO acá: initRetroView/
// initAchievementsView/initDealsView/initHomeView/initProfileView viven en
// archivos que este <script> clásico todavía no cargó en este punto — llamarlas
// acá tiraba un ReferenceError que cortaba en seco el resto de ESTE archivo
// (initWidgetMode() más abajo nunca llegaba a registrar sus listeners, así el
// botón de modo widget quedaba muerto sin ningún aviso visible).

// Biblioteca y modo retro son secciones separadas dentro del mismo hub: la barra
// lateral y el buscador cambian de contexto según dónde estés, en vez de ser
// filtros compartidos entre ambas.
function updateSidebarMode() {
  const mainSidebar = document.getElementById('sidebar');
  const retroSidebar = document.getElementById('retro-sidebar');
  const showRetro = viewMode === 'retro';
  // Logros y Ofertas son dashboards a ancho completo, sin filtros de
  // biblioteca — pero antes esto ocultaba el sidebar ENTERO, logo incluido,
  // así que la columna de la izquierda desaparecía de golpe y la topbar
  // quedaba arrancando en otra posición que en PC/Retro (el "desnivel"
  // reportado). Ahora se mantiene visible, solo se esconden sus secciones de
  // filtros (ver .sidebar-minimal en app.css) y queda el logo + el pill de
  // Companion, igual que en el resto de vistas.
  const minimal = viewMode === 'achievements' || viewMode === 'deals' || viewMode === 'home' || viewMode === 'profile';
  mainSidebar.hidden = showRetro;
  mainSidebar.classList.toggle('sidebar-minimal', minimal);
  retroSidebar.hidden = !showRetro;
  if (showRetro) {
    // Dentro de retro, el sidebar solo tiene sentido con una consola elegida:
    // mientras se está escogiendo consola, el panel de selección manda.
    document.getElementById('retro-sidebar-empty').hidden = !!currentConsole;
    document.getElementById('retro-sidebar-content').hidden = !currentConsole;
  }
}

function updateSearchContext() {
  if (viewMode === 'retro') {
    searchInput.placeholder = currentConsole ? 'Buscar en el catálogo…  ( / )' : 'Buscar consola…  ( / )';
  } else if (viewMode === 'achievements') {
    searchInput.placeholder = 'Logros — usa las pestañas de abajo';
  } else if (viewMode === 'deals') {
    searchInput.placeholder = 'Ofertas — sin buscador, revisa las secciones';
  } else if (viewMode === 'home') {
    searchInput.placeholder = 'Inicio — busca desde PC o Retro  ( / )';
  } else if (viewMode === 'profile') {
    searchInput.placeholder = 'Perfil — sin buscador, revisa las secciones';
  } else {
    searchInput.placeholder = 'Buscar juego…  ( / )';
  }
}

/* ---- Colapsar/expandir sidebar ---- */
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

/* ---- Tooltip de la navegación secundaria (Inicio/Logros/Ofertas/Perfil/
   Ajustes) ---- position:fixed a propósito: un tooltip position:absolute
   anidado dentro de #topbar queda recortado por el overflow del header sin
   importar el lado hacia el que se abra (ver comentario en #mini-tooltip,
   app.css). Con fixed lo posicionamos nosotros mismos con
   getBoundingClientRect(), así nunca depende del overflow de ningún
   ancestro. */
(function initMiniTooltips() {
  const tooltip = document.getElementById('mini-tooltip');
  let activeBtn = null;
  function place(btn) {
    const r = btn.getBoundingClientRect();
    tooltip.hidden = false;
    tooltip.textContent = btn.dataset.tooltip;
    const tw = tooltip.offsetWidth;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));
    tooltip.style.left = left + 'px';
    tooltip.style.top = (r.bottom + 8) + 'px';
    requestAnimationFrame(() => tooltip.classList.add('show'));
  }
  function hide() {
    activeBtn = null;
    tooltip.classList.remove('show');
    tooltip.hidden = true;
  }
  document.querySelectorAll('.topbar-mini-btn[data-tooltip]').forEach(btn => {
    btn.addEventListener('mouseenter', () => { activeBtn = btn; place(btn); });
    btn.addEventListener('focus', () => { activeBtn = btn; place(btn); });
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('blur', hide);
    btn.addEventListener('click', hide);
  });
  window.addEventListener('scroll', () => { if (activeBtn) place(activeBtn); }, true);
})();

/* ---- Titlebar propia (frame:false en main.js) ---- */
(function initTitlebar() {
  const maxBtn = document.getElementById('tb-max');
  function setMaximizedIcon(isMaximized) {
    maxBtn.innerHTML = icon(isMaximized ? 'winRestore' : 'winMax');
    maxBtn.title = isMaximized ? 'Restaurar' : 'Maximizar';
  }
  document.getElementById('tb-min').addEventListener('click', () => window.megahub.winMinimize());
  maxBtn.addEventListener('click', async () => setMaximizedIcon(await window.megahub.winMaximizeToggle()));
  document.getElementById('tb-close').addEventListener('click', () => window.megahub.winClose());
  document.getElementById('titlebar-drag').addEventListener('dblclick', async () => setMaximizedIcon(await window.megahub.winMaximizeToggle()));
  window.megahub.winIsMaximized().then(setMaximizedIcon);
  window.megahub.onWindowMaximizedChange(setMaximizedIcon);
})();

/* ---- Modo widget: MegaHUB compacto en la MISMA ventana (no una segunda
   ventana aparte) — reusa allGames tal cual ya lo dejó rescan(), sin volver a
   escanear la biblioteca. Se activa/desactiva con el botón de la esquina
   superior izquierda de la titlebar (#tb-widget), del lado contrario a
   minimizar/maximizar/cerrar. ---- */
// Asignada dentro de initWidgetMode() — puente para que applyCoverToElements()
// pueda refrescar un tile ya montado del widget cuando llega una portada tardía.
let widgetRefreshTile = null;
(function initWidgetMode() {
  const toggleBtn   = document.getElementById('tb-widget');
  const exitBtn     = document.getElementById('widget-exit');
  const view        = document.getElementById('widget-view');
  const tabBtns     = [...document.querySelectorAll('.wg-tab')];
  const shapeBtns   = [...document.querySelectorAll('.wg-shape')];
  const listEl      = document.getElementById('widget-list');
  const emptyEl     = document.getElementById('widget-empty');
  const detailEl    = document.getElementById('widget-detail');
  const detailCover = document.getElementById('widget-detail-cover');
  const detailTitle = document.getElementById('widget-detail-title');
  const detailPlay  = document.getElementById('widget-detail-play');
  const detailBack  = document.getElementById('widget-detail-back');

  let active = false;
  let tab = 'pc'; // 'pc' | 'retro'
  let shape = 'rect'; // 'square' | 'rect' | 'vertical'
  let selectedGame = null;

  function initialLetter(title) {
    return (title || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function tileInnerHtml(g) {
    return `
      ${g.coverUrl
        ? `<img src="${escapeHtml(g.coverUrl)}" alt="" loading="lazy" />`
        : `<span class="wg-fallback">${initialLetter(g.title)}</span>`}
      <span class="wg-title">${g.title}</span>
    `;
  }
  function tileHtml(g) {
    return `
      <button type="button" class="wg-tile" data-id="${g.id}" title="${g.title.replace(/"/g, '&quot;')}">
        ${tileInnerHtml(g)}
      </button>
    `;
  }
  function findTileEl(id) {
    return [...listEl.querySelectorAll('.wg-tile')].find(t => t.dataset.id === String(id));
  }
  // La carátula de un juego suele llegar en segundo plano (backfill) DESPUÉS
  // de que la lista del widget ya se pintó con la letra de respaldo — y a
  // diferencia del dock/lista principal (ver applyCoverToElements), acá nadie
  // volvía a pintar el tile una vez montado, así que el ícono se quedaba
  // pegado a "sin imagen" para siempre si el widget ya estaba abierto cuando
  // llegó la portada. refreshTile() se llama desde applyCoverToElements() para
  // que también se actualice en caliente, sin rehacer toda la lista.
  function refreshTile(game) {
    if (!active || !game.coverUrl) return;
    const tile = findTileEl(game.id);
    if (tile && !tile.querySelector('img')) tile.innerHTML = tileInnerHtml(game);
    if (selectedGame && selectedGame.id === game.id && !detailCover.querySelector('img')) {
      detailCover.innerHTML = `<img src="${escapeHtml(game.coverUrl)}" alt="" />`;
    }
  }
  widgetRefreshTile = refreshTile;

  // Juegos instalados de PC (todo lo que no sea una ROM de RetroArch).
  function pcGames() {
    return allGames.filter(g => g.installed && g.platform !== 'retroarch')
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  // ROMs de RetroArch agrupadas por consola (system = repo de libretro-thumbnails,
  // ver CONSOLE_REGISTRY más arriba en este archivo) — nombre bonito si está
  // catalogada, o el system tal cual si es una consola no listada.
  function retroGroups() {
    const games = allGames.filter(g => g.installed && g.platform === 'retroarch');
    const bySystem = new Map();
    for (const g of games) {
      const key = g.system || '?';
      if (!bySystem.has(key)) bySystem.set(key, []);
      bySystem.get(key).push(g);
    }
    const groups = [...bySystem.entries()].map(([system, list]) => ({
      system,
      name: CONSOLE_REGISTRY.find(c => c.repo === system)?.name || system.replace(/_/g, ' '),
      games: list.sort((a, b) => a.title.localeCompare(b.title, 'es')),
    }));
    groups.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return groups;
  }

  function findGameById(id) {
    return allGames.find(g => g.id === id) || null;
  }

  async function launchDirect(game) {
    const res = await window.megahub.launchGame(game);
    if (!res?.ok) showToast(res?.error || 'No se pudo lanzar el juego', 'error');
  }

  function renderList() {
    detailEl.hidden = true;
    listEl.hidden = false;

    let isEmpty = false;
    let grouped = false;
    if (tab === 'pc') {
      const games = pcGames();
      isEmpty = games.length === 0;
      if (isEmpty) emptyEl.textContent = 'Sin juegos de PC instalados todavía.';
      else listEl.innerHTML = games.map(tileHtml).join('');
    } else {
      const groups = retroGroups();
      isEmpty = groups.length === 0;
      if (isEmpty) {
        emptyEl.textContent = 'Sin ROMs de RetroArch detectadas todavía.';
      } else {
        // Un título con el nombre de la consola y abajo sus iconos, nada
        // más (sin contadores ni iconitos extra) — en cuadro/vertical el
        // grid de íconos de cada consola lo arma #widget-view[data-shape]
        // .wg-console-games (ver app.css); acá solo se agrupan los juegos.
        grouped = true;
        listEl.innerHTML = groups.map(group => `
          <div class="wg-console-group">
            <div class="wg-console-name">${escapeHtml(group.name)}</div>
            <div class="wg-console-games">${group.games.map(tileHtml).join('')}</div>
          </div>
        `).join('');
      }
    }
    listEl.classList.toggle('wg-grouped', grouped);

    emptyEl.hidden = !isEmpty;
    if (isEmpty) { listEl.innerHTML = ''; return; }

    listEl.querySelectorAll('.wg-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const game = findGameById(tile.dataset.id);
        if (!game) return;
        // Confirmación visual de que el clic registró (pulso + resplandor del
        // acento) — antes no había NADA salvo el hover de `:active` del
        // navegador, casi imperceptible en un clic normal, y en el dock
        // vertical (que lanza directo, sin pantalla de detalle de por medio)
        // ese era el único indicio de que había pasado algo.
        tile.classList.remove('wg-pressed');
        void tile.offsetWidth; // reinicia la animación si se clickea 2 veces seguidas
        tile.classList.add('wg-pressed');
        // Dock vertical: sin vista de detalle (no entra) — un solo clic lanza directo.
        if (shape === 'vertical') launchDirect(game);
        else showDetail(game);
      });
    });
  }

  function showDetail(game) {
    if (!game) return;
    selectedGame = game;
    listEl.hidden = true;
    detailEl.hidden = false;
    detailTitle.textContent = game.title;
    detailCover.innerHTML = game.coverUrl
      ? `<img src="${escapeHtml(game.coverUrl)}" alt="" />`
      : `<span class="wg-fallback">${initialLetter(game.title)}</span>`;
  }

  function backToList() {
    selectedGame = null;
    renderList();
  }

  async function playSelected() {
    if (!selectedGame) return;
    const res = await window.megahub.launchGame(selectedGame);
    if (!res?.ok) showToast(res?.error || 'No se pudo lanzar el juego', 'error');
  }

  async function enter() {
    active = true;
    document.body.classList.add('widget-mode');
    renderList();
    await window.megahub.widgetEnterMode();
    // main.js arranca cada sesión asumiendo auto-ocultar activado — si el
    // usuario lo apagó en Ajustes en una sesión anterior (persistido en
    // localStorage), hay que avisarle recién ahora que existe la ventana.
    window.megahub.widgetSetAutoHide(widgetAutoHide);
  }
  async function exit() {
    active = false;
    document.body.classList.remove('widget-mode');
    document.body.classList.remove('widget-retracted');
    await window.megahub.widgetExitMode();
  }

  // Pegado a un borde + auto-ocultar (ver bloque análogo en src/main.js): el
  // proceso principal decide CUÁNDO retraer/expandir (tiene el debounce y
  // sabe si está pegado a algún borde); acá solo se avisa de mouseenter/
  // mouseleave sobre toda la vista y se refleja el estado que confirme main
  // vía 'widget-retract-change' (nunca se asume localmente, para no
  // desincronizarse si el mouse sale muy rápido).
  view.addEventListener('mouseenter', () => { if (active) window.megahub.widgetHoverEnter(); });
  view.addEventListener('mouseleave', () => { if (active) window.megahub.widgetHoverLeave(); });
  window.megahub.onWidgetRetractChange((isRetracted) => {
    document.body.classList.toggle('widget-retracted', !!isRetracted);
  });

  toggleBtn.addEventListener('click', () => { active ? exit() : enter(); });
  exitBtn.addEventListener('click', exit);
  detailBack.addEventListener('click', backToList);
  detailPlay.addEventListener('click', playSelected);
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tab = btn.dataset.tab;
      selectedGame = null;
      renderList();
    });
  });
  shapeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      shapeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      shape = btn.dataset.shape;
      view.dataset.shape = shape;
      selectedGame = null; // el dock vertical no tiene vista de detalle — volver siempre a la lista
      renderList();
      await window.megahub.widgetSetShape(shape);
    });
  });
  document.addEventListener('megahub:games-updated', () => { if (active && !selectedGame) renderList(); });
})();

// Helpers de actividad (activityLog.js) — a nivel de módulo porque los usa
// tanto el panel del pill de Companion como el nuevo dashboard de Inicio
// (ver initHomeView() más abajo), no solo el pill.
function formatHours(minutes) {
  const h = minutes / 60;
  if (h >= 10 || Number.isInteger(h)) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}
// El log de actividad (activityLog.js) no guarda carátula — se busca por
// título en allGames, que ya está cargado por el rescan() normal (sin IPC
// extra por fila). Match solo por título (no por plataforma): el log de
// retro usa platform:'retro' pero el catálogo esos juegos los trae con
// platform:'retroarch', así que cruzar por plataforma los dejaría siempre
// sin carátula.
function findCoverForActivity(a) {
  const t = a.title.toLowerCase();
  const g = allGames.find(x => x.coverUrl && x.title && x.title.toLowerCase() === t);
  return g ? g.coverUrl : null;
}

/* ---- Pill "DERIVA Companion" (estado) + historial semanal propio ----
   Opcional y no intrusivo: si Companion no está instalado o no está
   corriendo, companion-get-status siempre devuelve { connected: false } y
   la pill se queda oculta — cero elementos rotos ni mensajes de error.
   La radio se sacó de acá (dependía de que Companion, "el gato", esté
   corriendo aparte solo para reproducir música) — lo que se expande al pasar
   el mouse ahora es un historial de horas jugadas esta semana, con datos
   propios de MegaHUB (ver activityLog.js), nada de Companion. */
(function initCompanionPill() {
  // Se repite una vez por sidebar (PC + Retro, mismo criterio que #logo
  // duplicado) — todas se mantienen en el mismo estado a la vez.
  const pills = [...document.querySelectorAll('.companion-pill')];
  if (!pills.length) return;

  function paint(pill, state, text) {
    pill.hidden = false;
    pill.dataset.state = state;
    const textEl = pill.querySelector('.companion-pill-text');
    if (textEl) textEl.textContent = text;
  }

  async function poll() {
    let status;
    try { status = await window.megahub.companionGetStatus(); }
    catch { status = { connected: false }; }

    if (!status.connected) {
      // Antes de tener NUNCA una conexión confirmada, se queda oculta del
      // todo (no todos los usuarios tienen/quieren el Companion) — una vez
      // que se vio conectado una vez en esta sesión, se muestra "desconectado"
      // en vez de desaparecer, para que no parezca un parpadeo raro de la UI.
      for (const pill of pills) {
        if (pill.dataset.everConnected === '1') paint(pill, 'off', 'DERIVA Companion · desconectado');
      }
      return;
    }
    for (const pill of pills) {
      pill.dataset.everConnected = '1';
      paint(pill, 'connected', 'DERIVA Companion · conectado');
    }
  }

  let activityCache = null;
  async function loadActivity(list) {
    list.innerHTML = `<div class="cpx-activity-empty">${skeletonLinesHtml(['medium', 'short'])}</div>`;
    try { activityCache = await window.megahub.companionGetWeeklyActivity(); }
    catch { activityCache = []; }
    renderActivity(list);
  }
  function renderActivity(list) {
    if (!activityCache || !activityCache.length) {
      list.innerHTML = '<div class="cpx-activity-empty">Todavía sin actividad esta semana.</div>';
      return;
    }
    list.innerHTML = activityCache.slice(0, 6).map(a => {
      const cover = findCoverForActivity(a);
      const isRetro = a.platform === 'retro';
      return `
      <div class="cpx-activity-row${isRetro ? ' cpx-retro' : ''}">
        <span class="cpx-activity-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy">` : ''}</span>
        <span class="cpx-activity-info">
          <span class="cpx-activity-name">${escapeHtml(a.title)}</span>
          <span class="cpx-activity-plat">${escapeHtml(PLAT_LABEL[a.platform] || a.platform)}</span>
        </span>
        <span class="cpx-activity-hours">${formatHours(a.minutes)}</span>
      </div>`;
    }).join('');
  }

  for (const pill of pills) {
    // El panel es position:fixed (ver app.css) para no quedar recortado por
    // el overflow-y:auto del sidebar — hay que calcularle top/left/width a
    // mano, y voltearlo arriba de la pill si no entra abajo (ventana baja).
    const expand = pill.querySelector('.companion-pill-expand');
    if (expand) {
      const positionExpand = () => {
        const rect = pill.getBoundingClientRect();
        // Pegado (0px de separación, no +4): un hueco entre la pill y el
        // panel es una "zona muerta" de hover — al cruzarla con el mouse
        // hacia abajo, el cursor pasa un instante sobre NADA, :hover se
        // rompe, y el panel (pointer-events:none fuera de :hover) ya no
        // puede recapturarlo aunque el cursor termine encima. El espacio
        // visual lo da el propio borde/sombra del panel, no un gap real.
        // Ancho mínimo 220px: si la pill de origen es angosta (sidebar
        // colapsado/estrecho), el contenido del panel necesita más espacio
        // del que la propia pill tiene.
        const width = Math.max(Math.round(rect.width), 220);
        let left = Math.round(rect.left);
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
        expand.style.left = `${left}px`;
        expand.style.width = `${width}px`;
        expand.style.top = `${Math.round(rect.bottom)}px`;
        expand.classList.remove('cpx-flip-up');
        // visibility:hidden (no display:none) ya deja medir la altura real
        // sin tener que mostrarlo primero.
        const needed = expand.offsetHeight;
        if (rect.bottom + needed > window.innerHeight) {
          expand.style.top = `${Math.round(rect.top - needed)}px`;
          expand.classList.add('cpx-flip-up');
        }
      };
      // rAF (no llamada directa): si el hover llega justo cuando el layout
      // todavía se está asentando (recién arrancó la app, cambio de vista,
      // fuente cargando), medir de una podía devolver un rect viejo/a medio
      // reflow — el panel quedaba plantado en cualquier lado ("una esquina")
      // y ya no se recalculaba solo. Con rAF se mide recién en el próximo
      // frame de pintado, con el layout ya resuelto.
      const scheduleReposition = () => requestAnimationFrame(positionExpand);
      const activityList = pill.querySelector('.cpx-activity-list');
      const onOpen = () => {
        scheduleReposition();
        loadActivity(activityList); // se pide fresco cada vez que se abre — cambia lento (semanal), no hace falta cachear entre aperturas
      };
      pill.addEventListener('mouseenter', onOpen);
      pill.addEventListener('focusin', onOpen);
      // Si el panel ya está abierto cuando terminan de llegar portadas nuevas
      // (ver enrichCoversSafe), re-pintar con los mismos datos en vez de
      // esperar a que el usuario lo cierre y lo vuelva a abrir.
      document.addEventListener('megahub:covers-updated', () => {
        if (activityCache && pill.matches(':hover, :focus-within')) renderActivity(activityList);
      });
      window.addEventListener('resize', () => { if (pill.matches(':hover, :focus-within')) scheduleReposition(); });
    }
  }

  poll();
  setInterval(poll, 5000);
})();

