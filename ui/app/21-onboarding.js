/* global allGames:writable, buildPlatformChips, enrichMetadata, fetchMhAchievements, initSgdb, initTgdb, loadDeals, loadSpecs, markConnected, rebuildGenreChips, refreshConsoleOwnedCounts, render, renderThemeGrid, rescan, switchViewMode, updateFirstSeenMap, viewMode */
/* ================= Onboarding de primer uso (Fase 7) =================
   3 pasos cortos: conectar el primer launcher opcional, elegir skin, y un
   atajo a Retro si aplica — "Omitir" siempre visible en las tres, orienta,
   no bloquea. Se guarda un flag en localStorage (mismo patrón que
   megahub-view/megahub-theme) para no volver a mostrarlo. */
const ONBOARDING_SEEN_KEY = 'megahub-onboarding-seen';
const ONBOARDING_STEPS = 3;
let onboardingStep = 1;

function showOnboardingStep(n) {
  onboardingStep = n;
  document.querySelectorAll('.onboarding-step').forEach((el) => { el.hidden = Number(el.dataset.step) !== n; });
  document.querySelectorAll('.onboarding-dot').forEach((el) => { el.classList.toggle('active', Number(el.dataset.dot) === n); });
  document.getElementById('onboarding-back').hidden = n === 1;
  document.getElementById('onboarding-next').textContent = n === ONBOARDING_STEPS ? 'Empezar' : 'Siguiente';
}
function closeOnboarding() {
  document.getElementById('onboarding-overlay').hidden = true;
  localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
}
function initOnboarding() {
  if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return;
  renderThemeGrid('onboarding-theme-grid');
  showOnboardingStep(1);
  document.getElementById('onboarding-overlay').hidden = false;
}
document.getElementById('onboarding-skip').addEventListener('click', closeOnboarding);
document.getElementById('onboarding-next').addEventListener('click', () => {
  if (onboardingStep >= ONBOARDING_STEPS) closeOnboarding();
  else showOnboardingStep(onboardingStep + 1);
});
document.getElementById('onboarding-back').addEventListener('click', () => {
  if (onboardingStep > 1) showOnboardingStep(onboardingStep - 1);
});
document.getElementById('onboarding-retro-btn').addEventListener('click', () => {
  closeOnboarding();
  switchViewMode('retro');
});

(async () => {
  // Mostrar la biblioteca de la sesión anterior al instante (si hay caché en
  // disco) mientras el escaneo real corre — antes la ventana quedaba vacía
  // hasta que rescan() terminaba de escanear los 10 launchers/registro, que
  // en máquinas con muchos programas instalados podía tardar varios segundos.
  // rescan() de abajo igual reemplaza esto en cuanto el escaneo real termina.
  try {
    const cached = await window.megahub.getCachedGames();
    if (cached?.games?.length) {
      allGames = cached.games;
      updateFirstSeenMap(allGames);
      if (cached.accounts?.gog) markConnected('gog');
      if (cached.accounts?.epic) markConnected('epic');
      buildPlatformChips();
      rebuildGenreChips();
      render();
      document.dispatchEvent(new Event('megahub:games-updated'));
    }
  } catch {}

  await rescan();
  loadSpecs();
  initSgdb();
  initTgdb();
  if (viewMode === 'retro') refreshConsoleOwnedCounts();
  enrichMetadata();
  // enrichCovers() ya la dispara rescan() de arriba — no duplicarla acá para
  // no correr dos pasadas superpuestas sobre los mismos juegos.
  loadDeals({ silent: true }).catch(() => {});
  // En segundo plano, sin bloquear nada: si algo se desbloqueó fuera de esta
  // sesión (ej. Steam sumó horas mientras MegaHUB estaba cerrado) y todavía
  // cae dentro de la ventana de "recién" (5 min, ver isRecentlyEarned), se
  // avisa igual apenas arranca — sin esto, el toast solo disparaba si el
  // usuario ya había abierto Logros o la ficha de ese juego en esta sesión.
  fetchMhAchievements().catch(() => {});
  initOnboarding();
})();
