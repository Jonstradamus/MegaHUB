/* exported TEXTURE_PACK_CONSOLES, buildDerivaSearchButton, buildTexturePackButton, updateMultiplayerControls */
/* global MULTIPLAYER_KEY, PLAT_LABEL, escapeHtml, fetchMhAchievements, formatBytes, icon, launchGame, metaById, mhAchCache, rebuildGenreChips, showToast, skeletonLinesHtml, videoAllowedFor, viewMode */
/* ================= Panel de detalles ================= */

let detailsToken = 0;

// URL pública de la webapp de DERIVA — MISMA constante que usa DERIVA
// Companion (companion-desktop/lib/config.js, DERIVA_URL). Botón inverso del
// plan "Deriva MegaHUB" Fase 4: abre el buscador de DERIVA ya con el título
// puesto (ver el ?buscar= que consume src/App.jsx del lado de DERIVA).
const DERIVA_URL = 'https://deriva-webapp.vercel.app';
function buildDerivaSearchButton(title) {
  const btn = document.createElement('button');
  btn.className = 'action-btn deriva-search';
  btn.innerHTML = `${icon('link')} Buscar en DERIVA`;
  btn.title = 'Abre la búsqueda de contenido de DERIVA para este juego';
  btn.onclick = () => window.open(`${DERIVA_URL}/?buscar=${encodeURIComponent(title)}`, '_blank');
  return btn;
}

// Único hub con API pública real y genérica para mods (ver textureDownload.js)
// — funciona para cualquier juego de estas 3 consolas, no una lista fija. La
// mayoría de mods de GameBanana para estas consolas NO son "texturas HD" en
// sentido estricto (hay skins, retextures, modelos, idiomas, herramientas...)
// así que el panel los muestra todos, no solo los que calzan con ese nombre.
const TEXTURE_PACK_CONSOLES = ['gamecube', 'wii', 'psp'];
const MOD_SORTS = [
  { key: 'new', label: 'Nuevos', apiSort: 'new' },
  { key: 'popular', label: 'Más populares', apiSort: 'default' },
];

function buildTexturePackButton(entry, consoleId) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.innerHTML = `${icon('image')} Buscar mods (GameBanana)`;
  btn.title = 'Busca mods para este juego en GameBanana: texturas, skins, idiomas, etc.';
  btn.onclick = () => toggleModPanel(btn, entry, consoleId);
  return btn;
}

async function toggleModPanel(btn, entry, consoleId) {
  const actions = document.getElementById('d-actions');
  const existing = document.getElementById('d-texture-panel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'd-texture-panel';
  panel.className = 'mod-panel';
  const status = document.createElement('div');
  status.className = 'mod-panel-status';
  status.textContent = 'Buscando en GameBanana…';
  panel.appendChild(status);
  actions.appendChild(panel);

  const games = await window.megahub.textureSearchGame(entry.title);
  if (!document.getElementById('d-actions').contains(panel)) return; // el usuario cambió de juego mientras cargaba
  if (!games || !games.length) {
    status.textContent = `GameBanana no tiene ninguna página de juego que coincida con "${entry.title}".`;
    return;
  }
  // NameMatch ya viene ordenado por relevancia — se usa el primero sin pedir
  // que el usuario elija, para no meter un paso extra la mayoría de las veces.
  const game = games[0];
  let sortKey = 'popular';

  async function loadMods() {
    status.textContent = `Buscando mods de "${game.name}"…`;
    const sort = MOD_SORTS.find(s => s.key === sortKey);
    const { mods } = await window.megahub.textureListMods({ gameId: game.id, sort: sort.apiSort, perPage: 40 });
    if (!document.getElementById('d-actions').contains(panel)) return;
    if (!mods.length) {
      status.textContent = `"${game.name}" está en GameBanana pero no tiene mods todavía.`;
      return;
    }
    const list = sortKey === 'popular'
      ? [...mods].sort((a, b) => (b.likes + b.views / 100) - (a.likes + a.views / 100))
      : mods;
    renderModList(game, list);
  }

  function renderModList(game, list) {
    panel.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'mod-panel-header';
    const title = document.createElement('div');
    title.className = 'mod-panel-title';
    title.innerHTML = `Mods de <b>${escapeHtml(game.name)}</b> en GameBanana`;
    const sortBox = document.createElement('div');
    sortBox.className = 'mod-panel-sort';
    for (const s of MOD_SORTS) {
      const sBtn = document.createElement('button');
      sBtn.textContent = s.label;
      sBtn.className = s.key === sortKey ? 'active' : '';
      sBtn.onclick = () => { sortKey = s.key; loadMods(); };
      sortBox.appendChild(sBtn);
    }
    header.append(title, sortBox);
    panel.appendChild(header);

    const listEl = document.createElement('div');
    listEl.className = 'mod-panel-list';
    panel.appendChild(listEl);

    for (const mod of list) {
      const row = document.createElement('div');
      row.className = 'mod-row';
      const categoryLabel = mod.category || 'Sin categoría';
      row.innerHTML = `
        ${mod.thumbUrl ? `<img class="mod-row-thumb" src="${escapeHtml(mod.thumbUrl)}" alt="">` : ''}
        <div class="mod-row-info">
          <div class="mod-row-name">${escapeHtml(mod.name)}</div>
          <div class="mod-row-meta">
            <span class="mod-row-category${mod.autoInstallable ? '' : ' manual'}">${escapeHtml(categoryLabel)}</span>
            <span>${mod.likes} 👍</span>
          </div>
        </div>`;
      const installBtn = document.createElement('button');
      installBtn.className = 'action-btn mod-row-install';
      installBtn.textContent = mod.autoInstallable ? 'Instalar' : 'Descargar';
      installBtn.title = mod.autoInstallable
        ? 'Se instala solo: el emulador lo carga sin configuración extra.'
        : `Este mod es "${categoryLabel}", no una textura — el emulador no lo carga solo. Se descarga a una carpeta aparte para que lo instales a mano siguiendo las instrucciones del propio mod.`;
      installBtn.onclick = async () => {
        installBtn.disabled = true;
        installBtn.textContent = 'Consultando…';
        const info = await window.megahub.textureGetDownloadInfo(mod.id);
        if (!info) {
          showToast(`No se pudo obtener el archivo de descarga de "${mod.name}".`, 'error');
          installBtn.disabled = false;
          installBtn.textContent = mod.autoInstallable ? 'Instalar' : 'Descargar';
          return;
        }
        const confirmed = window.confirm(
          `¿Descargar el mod "${mod.name}" (${categoryLabel}, ${info.sizeMb} MB) desde GameBanana para ${entry.title}?\n\n` +
          (mod.autoInstallable
            ? 'Se instala directo donde el emulador lo carga solo. Si el archivo trae el contenido dentro de una subcarpeta, puede que después tengas que moverlo un nivel hacia afuera a mano.'
            : 'Este mod NO se instala solo: se descarga y descomprime en una carpeta aparte (MegaHUB-Mods) — revisa el LEEME que traiga el propio mod para saber dónde colocarlo.')
        );
        if (!confirmed) { installBtn.disabled = false; installBtn.textContent = mod.autoInstallable ? 'Instalar' : 'Descargar'; return; }

        installBtn.textContent = 'Descargando…';
        const result = await window.megahub.textureDownloadInstall({ consoleId, romPath: entry.romPath, mod: { id: mod.id, name: mod.name, autoInstallable: mod.autoInstallable } });
        installBtn.disabled = false;
        installBtn.textContent = mod.autoInstallable ? 'Instalar' : 'Descargar';
        if (result && result.error) { showToast(result.error, 'error', 7000); return; }
        showToast(`"${mod.name}" ${result.manual ? 'descargado' : 'instalado'} en ${result.destDir}`, 'success', 6000);
      };
      row.appendChild(installBtn);
      listEl.appendChild(row);
    }
  }

  await loadMods();
}

// Botón "MULTIJUGADOR" del sidebar izquierdo (junto al resto de controles del
// emulador de esta consola) — solo se muestra si esta consola tiene online
// real (ver MULTIPLAYER_KEY) y abre el LEEME.txt con las instrucciones
// concretas de cómo activarlo en ESE emulador (main.js resuelve la clave
// contra un whitelist fijo, no un nombre de archivo suelto).
function updateMultiplayerControls(consoleInfo) {
  const btn = document.getElementById('retro-multiplayer-btn');
  const key = MULTIPLAYER_KEY[consoleInfo.id];
  btn.hidden = !key;
  if (!key) return;
  btn.onclick = async () => {
    const res = await window.megahub.openMultiplayerReadme(key);
    if (res && res.error) showToast(res.error, 'error');
  };
}

// Logros del motor propio de MegaHUB para ESTE juego puntual (Fase 3 del
// plan Inicio/Perfil) — filtra mhAchCache, ya calculado para el dashboard de
// Logros (ver fetchMhAchievements()), por appid (Steam) o por título (Retro,
// mismo criterio de match que ya usan Inicio/Perfil). Si el motor todavía no
// calculó nada para este juego (sin horas jugadas) devuelve vacío — no hay
// "placeholder" fingiendo logros que no existen.
function achievementsForGame(game) {
  if (!mhAchCache || !Array.isArray(mhAchCache) || !mhAchCache.length) return [];
  if (game.platform === 'steam') {
    const appid = game.id.replace('steam-', '');
    return mhAchCache.filter(a => a.scope === 'steamgame' && a.appid === appid);
  }
  if (game.platform === 'retroarch') {
    const t = game.title.toLowerCase();
    return mhAchCache.filter(a => a.scope === 'retrogame' && a.gameTitle && a.gameTitle.toLowerCase() === t);
  }
  return [];
}

async function renderDetailsAchievements(game, token) {
  const box = document.getElementById('d-achievements');
  if (game.platform !== 'steam' && game.platform !== 'retroarch') { box.hidden = true; box.innerHTML = ''; return; }
  if (!mhAchCache || !mhAchCache.length) await fetchMhAchievements();
  if (token !== detailsToken) return;
  const list = achievementsForGame(game);
  if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }

  // Los tiers ya ganados como chips compactos, y el PRÓXIMO objetivo (el
  // primer tier todavía no alcanzado) con su progreso — mismo criterio de
  // "qué sigue" que ya usa el motor para ROMs sin jugar en el dashboard.
  const sorted = [...list].sort((a, b) => (a.progressTarget || 0) - (b.progressTarget || 0));
  const earned = sorted.filter(a => a.earned);
  const next = sorted.find(a => !a.earned);

  box.hidden = false;
  box.innerHTML = `
    <h3>${icon('trophy')} Logros</h3>
    <div class="d-ach-list">
      ${earned.map(a => `<span class="d-ach-chip earned" title="${escapeHtml(a.description || '')}">${icon('trophy')} ${escapeHtml(a.title)}</span>`).join('')}
      ${next ? `<span class="d-ach-chip next" title="${escapeHtml(next.description || '')}">${icon('lock')} ${escapeHtml(next.title)} — ${next.progressCurrent}/${next.progressTarget}h</span>` : ''}
    </div>
  `;
}

async function renderDetails(game) {
  const empty = document.getElementById('details-empty');
  const content = document.getElementById('details-content');
  const videoBox = document.getElementById('d-video');
  if (!game) { empty.hidden = false; content.hidden = true; videoBox.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  videoBox.hidden = true; videoBox.innerHTML = '';

  const token = ++detailsToken;
  document.getElementById('d-title').textContent = game.title;
  const cover = document.getElementById('d-cover');
  cover.style.backgroundImage = (game.heroUrl || game.coverUrl) ? `url("${game.heroUrl || game.coverUrl}")` : '';

  document.getElementById('d-badges').innerHTML =
    `<span class="d-badge plat">${PLAT_LABEL[game.platform]}</span>` +
    (game.installed
      ? `<span class="d-badge installed">${icon('check')} Instalado</span>`
      : `<span class="d-badge not-installed">${icon('download')} En biblioteca</span>`);

  document.getElementById('d-desc').textContent = '';
  document.getElementById('d-meta').innerHTML = '';
  document.getElementById('d-achievements').hidden = true; // se repinta más abajo — nunca se queda mostrando los logros del juego anterior
  document.getElementById('d-reqs').hidden = false;
  document.getElementById('d-reqs-body').innerHTML = skeletonLinesHtml(['medium', 'short']);

  const actions = document.getElementById('d-actions');
  actions.innerHTML = '';
  if (game.installed) {
    const btn = document.createElement('button');
    btn.className = 'action-btn play';
    btn.innerHTML = `${icon('play')} Jugar`;
    btn.onclick = () => launchGame(game);
    actions.appendChild(btn);
  } else {
    const btn = document.createElement('button');
    btn.className = 'action-btn install';
    btn.innerHTML = `${icon('download')} Instalar / ver en tienda`;
    btn.onclick = () => window.megahub.installGame(game);
    actions.appendChild(btn);
  }
  actions.appendChild(buildDerivaSearchButton(game.title));

  // Tamaño de instalación: inmediato si el scanner ya lo trae (Steam/Epic/
  // Battle.net/Ubisoft/EA/Rockstar leen un campo ya calculado del manifiesto o
  // registro); para GOG/Xbox (sin ese dato) se calcula bajo demanda recorriendo
  // la carpeta, solo al abrir esta ficha — nunca durante el escaneo completo.
  let sizeRow = '';
  if (game.installed) {
    if (game.installSizeBytes != null) sizeRow = `<b>Tamaño:</b> ${formatBytes(game.installSizeBytes)}`;
    else if (game.installDir || game.workDir) sizeRow = `<b>Tamaño:</b> <span id="d-size-pending">calculando…</span>`;
  }

  const meta = await window.megahub.getMeta(game);
  if (token !== detailsToken) return;
  const rows = sizeRow ? [sizeRow] : [];
  if (meta) {
    metaById[game.id] = meta;
    rebuildGenreChips();
    if (meta.shortDesc) document.getElementById('d-desc').textContent = meta.shortDesc;
    if (meta.genres && meta.genres.length) rows.push(`<b>Género:</b> ${escapeHtml(meta.genres.join(', '))}`);
    if (meta.releaseDate) rows.push(`<b>Lanzamiento:</b> ${escapeHtml(meta.releaseDate)}`);

    // El gameplay solo se muestra en modo Lista Y si el usuario clicó de verdad
    // el juego (no al navegarlo con flechas) — así no se carga video de más.
    if (viewMode === 'list' && videoAllowedFor === game.id && meta.trailerUrl) {
      videoBox.innerHTML = `<video src="${escapeHtml(meta.trailerUrl)}" ${meta.trailerPoster ? `poster="${escapeHtml(meta.trailerPoster)}"` : ''} controls muted loop></video>`;
      videoBox.hidden = false;
    }
  } else if (game.genre) {
    rows.push(`<b>Género:</b> ${escapeHtml(game.genre)}`);
  }
  document.getElementById('d-meta').innerHTML = rows.join('<br>');

  renderDetailsAchievements(game, token); // sin await: no bloquea el resto de la ficha, se pinta sola cuando llegue

  if (game.installed && game.installSizeBytes == null && (game.installDir || game.workDir)) {
    window.megahub.getInstallSize(game.installDir || game.workDir).then((bytes) => {
      if (token !== detailsToken) return;
      const el = document.getElementById('d-size-pending');
      if (el) el.textContent = bytes ? formatBytes(bytes) : 'desconocido';
    });
  }

  const analysis = await window.megahub.analyzeGame(game);
  if (token !== detailsToken) return;
  renderRequirements(analysis);
}

function pctClass(p) { return p >= 150 ? 'great' : p >= 100 ? 'ok' : p >= 75 ? 'warn' : 'bad'; }
function pctColor(p) { return p >= 150 ? 'var(--great)' : p >= 100 ? 'var(--ok)' : p >= 75 ? 'var(--warn)' : 'var(--bad)'; }

function renderRequirements(a) {
  const body = document.getElementById('d-reqs-body');
  if (!a || a.unsupported) { body.textContent = '—'; return; }
  if (a.noMatch) { body.innerHTML = '<span style="font-size:11.5px">No encontramos este juego en Steam para comparar requisitos.</span>'; return; }
  if (a.noData) {
    body.innerHTML = `<span style="font-size:11.5px">${a.viaMatch ? `"${escapeHtml(a.viaMatch.title)}" (Steam) no` : 'Este juego no'} publica requisitos${a.viaMatch ? '' : ' en Steam'}.</span>`;
    return;
  }
  if (a.noSpecs) { body.innerHTML = '<span style="font-size:11.5px">No se pudo detectar tu hardware</span>'; return; }

  const tier = (t, label) => {
    if (!t || t.overall == null) return '';
    const comps = ['gpu', 'cpu', 'ram'].map(k => {
      const c = t.components[k];
      if (!c || c.pct == null) return '';
      return `<div class="req-row"><span>${k.toUpperCase()}</span><span class="val ${pctClass(c.pct)}">${c.pct}%</span></div>`;
    }).join('');
    return `<div class="req-tier">
      <div class="req-tier-title">${label}</div>
      <div class="req-overall">
        <div class="req-bar"><div style="width:${Math.min(100, t.overall)}%;background:${pctColor(t.overall)}"></div></div>
        <span class="${pctClass(t.overall)}">${t.overall}%</span>
      </div>
      ${comps}
    </div>`;
  };

  const verdictText = {
    'recommended-met': {
      excelente: 'Muy por encima de lo recomendado',
      sobrado: 'Por encima de lo recomendado',
      cumple: 'Normal — cumple los requisitos recomendados',
    },
    'below-recommended': {
      cumple: 'Normal — cumple los mínimos con margen, no llega a lo recomendado',
    },
    'minimum-only': {
      excelente: 'Muy por encima de los mínimos (el juego no publica recomendados)',
      sobrado: 'Por encima de los mínimos (el juego no publica recomendados)',
      cumple: 'Normal — cumple los mínimos (el juego no publica recomendados)',
      justo: 'Deficiente — al límite de los requisitos mínimos',
      insuficiente: 'Deficiente — por debajo de los requisitos mínimos',
    },
    minimum: {
      justo: 'Deficiente — por debajo de lo recomendado y al límite de los mínimos',
      insuficiente: 'Deficiente — por debajo incluso de los requisitos mínimos',
    },
  };
  const verdictMsg = (verdictText[a.verdictBasis] || {})[a.verdict];
  const matchNote = a.viaMatch
    ? `<div style="font-size:10.5px;margin-top:4px;opacity:0.7">Requisitos de la ficha de Steam "${escapeHtml(a.viaMatch.title)}"${a.viaMatch.exact ? '' : ' (coincidencia aproximada)'} — este juego no es de Steam.</div>`
    : '';
  body.innerHTML =
    tier(a.minimum, 'Requisitos mínimos') +
    tier(a.recommended, 'Recomendados') +
    (verdictMsg ? `<div class="verdict ${a.verdict}">${verdictMsg}</div>` : '') +
    '<div style="font-size:10.5px;margin-top:6px;opacity:0.7">Estimación heurística comparando componentes, no un benchmark real.</div>' +
    matchNote;
}

