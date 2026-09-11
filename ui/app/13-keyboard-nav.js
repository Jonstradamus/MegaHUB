/* exported cyclePlatform, gpActivate, gpCycleAchSourceTab, gpCycleSettingsTab, gpCycleView, gpMove, move */
/* global moveRetro, primaryAction, refreshSelection, retroPrimaryAction, searchInput, selectedIndex:writable, switchViewMode, viewMode, visible */
/* ================= Navegación teclado ================= */

function move(dx, dy) {
  if (!visible.length) return;
  const delta = dx || dy; // ambos modos (dock/lista) son navegación lineal
  const next = Math.max(0, Math.min(visible.length - 1, selectedIndex + delta));
  if (next !== selectedIndex) { selectedIndex = next; refreshSelection(); }
}
function cyclePlatform(dir) {
  const box = document.getElementById('platform-filters');
  const chips = [...box.querySelectorAll('.chip')];
  const idx = chips.findIndex(c => c.classList.contains('active'));
  const next = chips[(idx + dir + chips.length) % chips.length];
  next.click();
}

/* ---- Navegación por mando fuera del dock/lista/retro (Fase 5) ----
   El dock y el modo retro ya tenían su propio manejo (selectedIndex/
   moveRetro, ver pollGamepad más abajo) — esto extiende el mismo mando a
   Inicio, Perfil y Ofertas (grillas de .dock-icon/.deal-card), a las
   pestañas de Logros/Ajustes, y a LT/RT para cambiar de vista sin soltar el
   mando. No usa el foco nativo del navegador para elegir el ítem (mismo
   criterio que el dock: un cursor propio) — sí llama a .focus() sobre el
   elemento actual solo para heredar gratis el anillo de :focus-visible que
   ya existe para teclado, en vez de inventar una clase de resaltado nueva. */
const GP_VIEW_ORDER = ['home', 'dock', 'retro', 'achievements', 'deals', 'profile'];
function gpNavItems() {
  let selector = null;
  if (viewMode === 'home') selector = '#home-wrap .dock-icon';
  else if (viewMode === 'profile') selector = '#profile-wrap .dock-icon';
  else if (viewMode === 'deals') selector = '#deals-wrap .deal-card';
  if (!selector) return [];
  // offsetParent === null descarta tarjetas dentro de una sección todavía
  // oculta (ej. secciones de Ofertas sin ítems, ver [hidden] en deals-wrap)
  // — existen en el DOM pero no hay nada que resaltar ni hacer clic ahí.
  return [...document.querySelectorAll(selector)].filter(el => el.offsetParent !== null);
}
let gpCursor = 0;
function gpMove(dx, dy) {
  const items = gpNavItems();
  if (!items.length) return;
  const delta = dx || dy;
  if (!delta) return;
  gpCursor = Math.max(0, Math.min(items.length - 1, gpCursor + delta));
  const el = items[gpCursor];
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function gpActivate() {
  const items = gpNavItems();
  const el = items[gpCursor];
  if (el) el.click();
}
function gpCycleView(dir) {
  const idx = GP_VIEW_ORDER.indexOf(viewMode);
  const next = GP_VIEW_ORDER[((idx === -1 ? 0 : idx) + dir + GP_VIEW_ORDER.length) % GP_VIEW_ORDER.length];
  gpCursor = 0;
  switchViewMode(next);
}
function gpCycleAchSourceTab(dir) {
  const chips = [...document.querySelectorAll('#ach-source-tabs .chip')];
  const idx = chips.findIndex(c => c.classList.contains('active'));
  const next = chips[(idx + dir + chips.length) % chips.length];
  if (next) next.click();
}
function gpCycleSettingsTab(dir) {
  const tabs = [...document.querySelectorAll('.settings-tab')];
  const idx = tabs.findIndex(t => t.classList.contains('active'));
  const next = tabs[(idx + dir + tabs.length) % tabs.length];
  if (next) next.click();
}

document.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  if (!document.getElementById('settings-overlay').hidden) {
    if (e.key === 'Escape') document.getElementById('settings-overlay').hidden = true;
    return;
  }
  // Modo retro y modo PC están aislados: el teclado/mando solo controla el
  // modo que se está viendo de verdad, nunca el que quedó "detrás".
  if (viewMode === 'retro') {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); moveRetro(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); moveRetro(1, 0); break;
      case 'ArrowUp': e.preventDefault(); moveRetro(0, -1); break;
      case 'ArrowDown': e.preventDefault(); moveRetro(0, 1); break;
      case 'Enter': retroPrimaryAction(); break;
      case '/': e.preventDefault(); searchInput.focus(); break;
    }
    return;
  }
  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); move(-1, 0); break;
    case 'ArrowRight': e.preventDefault(); move(1, 0); break;
    case 'ArrowUp': e.preventDefault(); move(0, -1); break;
    case 'ArrowDown': e.preventDefault(); move(0, 1); break;
    case 'Enter': primaryAction(); break;
    case 'q': case 'Q': cyclePlatform(-1); break;
    case 'e': case 'E': cyclePlatform(1); break;
    case '/': e.preventDefault(); searchInput.focus(); break;
  }
});

