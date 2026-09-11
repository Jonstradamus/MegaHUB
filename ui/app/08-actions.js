/* exported primaryAction */
/* global activeChildren, currentConsole, selectedIndex, showToast, visible */
/* ================= Acciones ================= */

async function launchGame(game) {
  const res = await window.megahub.launchGame(game);
  if (!res.ok) console.warn('Launch error:', res.error);
}

// Lanza una ROM local (colocada a mano en roms/<consola>/, sin pasar por una
// playlist de RetroArch). A diferencia de launchGame, sí puede fallar de forma
// esperable (falta el core o el emulador) — se avisa junto al botón en vez de
// solo en consola.
async function launchLocalRom(entry) {
  if (!currentConsole || !entry.romPath) return;
  // Feedback SIEMPRE visible (toast), no solo la pista de texto junto al
  // botón — antes, si algo fallaba y el usuario no tenía la vista justo ahí,
  // parecía que el click no hizo nada en absoluto.
  showToast(`Abriendo "${entry.title}"…`, 'info', 2500);
  const result = await window.megahub.retroLaunchRom({
    consoleId: currentConsole.id,
    consoleName: currentConsole.name,
    emulatorName: currentConsole.emulator,
    romPath: entry.romPath,
    // Título ya cotejado contra el catálogo libretro-thumbnails en el escaneo
    // (retro-scan-roms) — sin esto, el logro/sesión usaba el nombre crudo del
    // archivo (ej. "hotd2") en vez del real ("The House of the Dead 2").
    title: entry.recognized ? entry.title : null,
  });
  if (result && result.error) {
    showToast(result.error, 'error', 7000);
    let hint = document.getElementById('d-play-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'd-play-hint';
      document.getElementById('d-actions').appendChild(hint);
    }
    hint.style.color = 'var(--bad)';
    hint.textContent = result.error;
  }
}

function primaryAction() {
  const game = visible[selectedIndex];
  if (!game) return;
  const el = activeChildren()[selectedIndex];
  if (el) { el.classList.add('launching'); setTimeout(() => el.classList.remove('launching'), 350); }
  if (game.installed) launchGame(game);
  else window.megahub.installGame(game);
}

