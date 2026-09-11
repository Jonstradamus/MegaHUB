/* exported openSettings, renderThemeGrid */
/* global CONSOLE_EMULATOR_GUIDE, LAUNCHER_REGISTRY, allGames, buildPlatformChips, disabledPlatforms, escapeHtml, icon, render, retroEnabled:writable, showToast, skeletonLinesHtml, widgetAutoHide:writable */
/* ================= Ajustes (Launchers + Modo Retro) ================= */

function saveDisabledPlatforms() {
  localStorage.setItem('megahub-disabled-platforms', JSON.stringify([...disabledPlatforms]));
}

function buildLauncherSettings() {
  const box = document.getElementById('launcher-list');
  box.innerHTML = '';
  for (const l of LAUNCHER_REGISTRY) {
    const row = document.createElement('div');
    row.className = 'launcher-row';
    const implemented = l.status === 'implemented';
    row.innerHTML = `
      <span class="launcher-name">${escapeHtml(l.label)}</span>
      <span class="launcher-tag ${l.tier}">${l.tier}</span>
      ${implemented ? '' : '<span class="launcher-status planned">próximamente</span>'}
    `;
    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch' + (implemented ? '' : ' disabled');
    if (implemented && !disabledPlatforms.has(l.id)) toggle.classList.add('on');
    if (implemented) {
      toggle.addEventListener('click', () => {
        if (disabledPlatforms.has(l.id)) disabledPlatforms.delete(l.id);
        else disabledPlatforms.add(l.id);
        toggle.classList.toggle('on');
        saveDisabledPlatforms();
        buildPlatformChips();
        render();
      });
    }
    row.appendChild(toggle);
    box.appendChild(row);
  }
}

let retroTabWired = false;

function renderConsoleGuide() {
  const box = document.getElementById('console-guide');
  if (box.childElementCount) return; // contenido estático: se arma una sola vez
  for (const group of CONSOLE_EMULATOR_GUIDE) {
    const section = document.createElement('div');
    section.className = 'gen-group';
    const title = document.createElement('div');
    title.className = 'gen-title';
    title.textContent = group.gen;
    section.appendChild(title);
    for (const item of group.items) {
      const row = document.createElement('div');
      row.className = 'console-row';
      row.innerHTML = `
        <span class="console-name">${escapeHtml(item.console)}</span>
        <span class="console-emu"><b>${escapeHtml(item.emu)}</b>${item.note ? ' — ' + escapeHtml(item.note) : ''}</span>
        <span class="console-src ${item.src}">${item.src === 'core' ? 'core RetroArch' : 'standalone'}</span>
      `;
      section.appendChild(row);
    }
    box.appendChild(section);
  }
}

const MENU_DRIVER_LABEL = { xmb: 'XMB', rgui: 'RGUI' };

async function renderSkinsList() {
  const box = document.getElementById('retro-skins-list');
  box.innerHTML = skeletonLinesHtml(['long', 'medium']) + skeletonLinesHtml(['long', 'medium']);
  const skins = await window.megahub.retroGetSkins();
  box.innerHTML = '';
  for (const skin of skins) {
    const card = document.createElement('div');
    card.className = 'skin-card' + (skin.installed ? ' installed' : '');
    card.dataset.skinId = skin.id;
    card.innerHTML = `
      <div class="skin-card-body">
        <div class="skin-card-title">${escapeHtml(skin.name)} <span class="skin-card-driver">${MENU_DRIVER_LABEL[skin.menuDriver] || skin.menuDriver}</span></div>
        <div class="skin-card-desc">${escapeHtml(skin.description)}</div>
        <div class="skin-card-credit">Por <a href="${escapeHtml(skin.creatorUrl)}" target="_blank" rel="noopener">${escapeHtml(skin.creator)}</a> · <a href="${escapeHtml(skin.sourceUrl)}" target="_blank" rel="noopener">código fuente</a> · ~${skin.sizeMb} MB</div>
      </div>
      <div class="skin-card-actions">
        ${skin.installed
          ? `<span class="skin-card-installed-badge">${icon('check')} Instalada</span>
             <button class="account-btn skin-install-btn" data-action="install">Reinstalar</button>
             ${skin.slot ? `<button class="account-btn skin-restore-btn" data-action="restore">Restaurar original</button>` : ''}`
          : `<button class="account-btn skin-install-btn" data-action="install">${icon('download')} Instalar</button>`}
        <div class="skin-card-status"></div>
      </div>
    `;
    box.appendChild(card);
  }

  box.querySelectorAll('.skin-install-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.skin-card');
      const id = card.dataset.skinId;
      const skin = skins.find(s => s.id === id);
      const confirmed = window.confirm(
        `¿Instalar "${skin.name}" de ${skin.creator} (~${skin.sizeMb} MB)?\n\n` +
        (skin.slot ? `Reemplaza la ranura de tema "${skin.slot}" en RetroArch — se respalda el original antes de sobreescribir.` : 'Se agrega junto a tus presets de RGUI existentes, sin reemplazar nada.')
      );
      if (!confirmed) return;
      const statusEl = card.querySelector('.skin-card-status');
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      statusEl.textContent = 'Descargando e instalando…';
      const result = await window.megahub.retroInstallSkin(id);
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      if (result && result.error) {
        statusEl.textContent = 'Error: ' + result.error;
        showToast(`Error instalando "${skin.name}": ${result.error}`, 'error');
        return;
      }
      statusEl.textContent = '';
      showToast(`"${skin.name}" instalada. Actívala en RetroArch → Ajustes → Apariencia.`, 'success');
      renderSkinsList();
    });
  });
  box.querySelectorAll('.skin-restore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.skin-card');
      const id = card.dataset.skinId;
      const skin = skins.find(s => s.id === id);
      if (!window.confirm(`¿Restaurar el tema original de la ranura "${skin.slot}" (quitar "${skin.name}")?`)) return;
      const statusEl = card.querySelector('.skin-card-status');
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      statusEl.textContent = 'Restaurando…';
      const result = await window.megahub.retroRestoreSkinSlot(id);
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      if (result && result.error) {
        statusEl.textContent = 'Error: ' + result.error;
        showToast('Error al restaurar: ' + result.error, 'error');
        return;
      }
      showToast(`Tema original restaurado.`, 'success');
      renderSkinsList();
    });
  });
}

function setupRetroTab() {
  const toggle = document.getElementById('retro-toggle');
  const status = document.getElementById('retro-status');
  toggle.classList.toggle('on', retroEnabled);
  if (!retroTabWired) {
    retroTabWired = true;
    toggle.addEventListener('click', () => {
      retroEnabled = !retroEnabled;
      toggle.classList.toggle('on', retroEnabled);
      localStorage.setItem('megahub-retro-enabled', retroEnabled ? 'on' : 'off');
      if (retroEnabled) disabledPlatforms.delete('retroarch');
      else disabledPlatforms.add('retroarch');
      saveDisabledPlatforms();
      buildPlatformChips();
      buildLauncherSettings();
      render();
    });
  }
  renderConsoleGuide();
  renderSkinsList();
  const retroGames = allGames.filter(g => g.platform === 'retroarch');
  if (retroGames.length) {
    const systems = new Set(retroGames.map(g => g.system).filter(Boolean));
    status.innerHTML = `<b>RetroArch detectado.</b> ${retroGames.length} ROMs indexadas en ${systems.size} sistema(s).`;
  } else {
    status.innerHTML = 'No se detectó RetroArch instalado (o no tiene playlists con ROMs indexadas todavía).';
  }
  setupDefaultRootSettings();
}

// Carpeta raíz por defecto (emulators/ + roms/) para las consolas sin
// ubicador propio — ver retroFolders.js. Se re-consulta cada vez que se abre
// esta pestaña por si se cambió desde otra ventana/instancia.
let defaultRootWired = false;
async function setupDefaultRootSettings() {
  const pathEl = document.getElementById('default-root-path');
  const changeBtn = document.getElementById('default-root-change-btn');
  const resetBtn = document.getElementById('default-root-reset-btn');

  async function refresh() {
    const info = await window.megahub.retroGetDefaultRoot();
    pathEl.textContent = info.isDefault ? `${info.root} (Documentos, predeterminado)` : info.root;
    resetBtn.hidden = info.isDefault;
  }

  if (!defaultRootWired) {
    defaultRootWired = true;
    changeBtn.addEventListener('click', async () => {
      const res = await window.megahub.retroPickDefaultRoot();
      if (!res) return; // cancelado
      if (res.error) { showToast(res.error, 'error'); return; }
      showToast('Carpeta raíz actualizada. Las consolas ya creadas mantienen sus carpetas anteriores; solo aplica a partir de ahora.', 'success', 7000);
      refresh();
    });
    resetBtn.addEventListener('click', async () => {
      await window.megahub.retroResetDefaultRoot();
      showToast('Restaurado a Documentos\\MegaHUB.', 'success');
      refresh();
    });
  }
  await refresh();
}

/* ---- Apariencia (temas de color) ----
   Cada tema solo redefine variables CSS (ver :root/body[data-theme] en
   app.css) — el resto de la hoja de estilos ya está escrito en términos de
   esas variables, así que agregar un tema acá es solo declarar su paleta,
   no tocar selectores. "aurora" (DERIVA) es la paleta por defecto de
   :root, sin atributo — por eso su id de tema es cadena vacía. */
const THEME_REGISTRY = [
  { id: '',              name: 'Violeta',   colors: ['#0b0d12', '#6d5df0', '#22d3ee'] },
  { id: 'arcade',        name: 'Rosa',      colors: ['#0a0510', '#ff2f92', '#33e6ff'] },
  { id: 'retrolight',    name: 'Lavanda',   colors: ['#eeece6', '#8683b8', '#7a5ea8'] },
  { id: 'xbox',          name: 'Verde',     colors: ['#060706', '#107c10', '#7ec418'] },
  { id: 'steam',         name: 'Celeste',   colors: ['#1b2838', '#66c0f4', '#a3cf06'] },
  { id: 'atari',         name: 'Rojo',      colors: ['#1c130d', '#e0392f', '#e8a33d'] },
  { id: 'sega',          name: 'Azul',      colors: ['#06182c', '#1e9be9', '#ff6a1a'] },
  { id: 'arcadepremium', name: 'Dorado',    colors: ['#050506', '#d4af37', '#ff2fa0'] },
  { id: 'rgb',           name: 'Arcoíris',  colors: ['#07080d', '#5cd8ff', '#b07dff'] },
  { id: 'plaza',         name: 'Plaza',     colors: ['#eaf6ff', '#0bb4e0', '#ff6b6b'] },
];
const THEME_STORAGE_KEY = 'megahub-theme';

function applyTheme(id, persist) {
  if (id) document.body.dataset.theme = id;
  else delete document.body.dataset.theme;
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, id || '');
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.themeId === id);
  });
}

function renderThemeGrid(gridId = 'theme-grid') {
  const grid = document.getElementById(gridId);
  if (!grid || grid.dataset.built === '1') return;
  grid.dataset.built = '1';
  const current = localStorage.getItem(THEME_STORAGE_KEY) || '';
  grid.innerHTML = THEME_REGISTRY.map((t) => {
    // Un solo gradiente con paradas duras (no 3 <span> hijos en flex) — más
    // a prueba de balas: el color de cada franja no depende de que el hijo
    // reciba su ancho de flex correctamente, es un solo background-image.
    const n = t.colors.length;
    const stops = t.colors.map((c, i) => `${c} ${Math.round((i / n) * 100)}%, ${c} ${Math.round(((i + 1) / n) * 100)}%`).join(', ');
    return `
    <button type="button" class="theme-card${t.id === current ? ' active' : ''}" data-theme-id="${t.id}">
      <span class="theme-swatch" style="background: linear-gradient(90deg, ${stops})"></span>
      <span class="theme-name">${t.name}</span>
    </button>
  `;
  }).join('');
  grid.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => applyTheme(card.dataset.themeId, true));
  });
}

// Aplica el tema guardado ANTES de construir la grilla (y lo antes posible
// en el arranque, no solo al abrir Ajustes) para que no haya un parpadeo
// de la paleta por defecto al cargar con un tema distinto ya elegido.
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || '', false);

const settingsTabIndicator = document.getElementById('settings-tab-indicator');
function moveSettingsIndicator(tab) {
  if (!tab) return;
  settingsTabIndicator.style.left = tab.offsetLeft + 'px';
  settingsTabIndicator.style.width = tab.offsetWidth + 'px';
}

let widgetAutoHideTabWired = false;
function setupWidgetAutoHideToggle() {
  const toggle = document.getElementById('widget-autohide-toggle');
  if (!toggle) return;
  toggle.classList.toggle('on', widgetAutoHide);
  if (widgetAutoHideTabWired) return;
  widgetAutoHideTabWired = true;
  toggle.addEventListener('click', () => {
    widgetAutoHide = !widgetAutoHide;
    toggle.classList.toggle('on', widgetAutoHide);
    localStorage.setItem('megahub-widget-autohide', widgetAutoHide ? 'on' : 'off');
    // Se avisa al proceso principal ya mismo (no solo al volver a entrar al
    // widget) para que, si el widget está pegado a un borde ahora mismo, se
    // despliegue de una si el usuario acaba de apagar el auto-ocultado.
    window.megahub.widgetSetAutoHide(widgetAutoHide);
  });
}

function openSettings() {
  document.getElementById('settings-overlay').hidden = false;
  buildLauncherSettings();
  setupRetroTab();
  renderThemeGrid();
  setupWidgetAutoHideToggle();
  // El modal recién se hace visible: el layout de las pestañas todavía no
  // existía en el frame anterior, así que offsetLeft/offsetWidth se leen
  // recién en el próximo frame para que el indicador arranque bien posicionado.
  requestAnimationFrame(() => moveSettingsIndicator(document.querySelector('.settings-tab.active')));
}
document.getElementById('settings-open').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-overlay').hidden = true;
});
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'settings-overlay') document.getElementById('settings-overlay').hidden = true;
});
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.settings-panel').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    moveSettingsIndicator(tab);
  });
});
window.addEventListener('resize', () => {
  if (!document.getElementById('settings-overlay').hidden) moveSettingsIndicator(document.querySelector('.settings-tab.active'));
});

