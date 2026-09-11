/* global controlsFooter, cyclePlatform, gpActivate, gpCycleAchSourceTab, gpCycleSettingsTab, gpCycleView, gpMove, move, moveRetro, openSettings, padStatus, padStatusLabel, primaryAction, retroPrimaryAction, viewMode */
/* ================= Gamepad ================= */

const padState = { lastMove: 0, buttons: {} };
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = [...pads].find(p => p && p.connected);
  padStatusLabel.textContent = pad ? pad.id.slice(0, 22) : 'sin mando';
  padStatus.classList.toggle('on', !!pad);
  controlsFooter.classList.toggle('pad-active', !!pad);
  if (pad) {
    const now = performance.now();
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const dx = (ax < -0.5 || pad.buttons[14]?.pressed) ? -1 : (ax > 0.5 || pad.buttons[15]?.pressed) ? 1 : 0;
    const dy = (ay < -0.5 || pad.buttons[12]?.pressed) ? -1 : (ay > 0.5 || pad.buttons[13]?.pressed) ? 1 : 0;
    const edge = (idx) => {
      const pressed = pad.buttons[idx]?.pressed;
      const was = padState.buttons[idx];
      padState.buttons[idx] = pressed;
      return pressed && !was;
    };
    const settingsEl = document.getElementById('settings-overlay');
    const settingsOpen = !settingsEl.hidden;

    // Ajustes abierto: el mando SOLO mueve el modal (mismo aislamiento que ya
    // usa el teclado con Escape) — nunca se cuela hacia la vista de atrás.
    if (settingsOpen) {
      if ((dx) && now - padState.lastMove > 220) { gpCycleSettingsTab(dx); padState.lastMove = now; }
      if (edge(1) || edge(9)) settingsEl.hidden = true; // B o Start cierra
      requestAnimationFrame(pollGamepad);
      return;
    }
    if (edge(9)) openSettings(); // Start abre Ajustes desde cualquier vista

    // LT/RT: cambiar de vista sin soltar el mando — no compite con nada más
    // (LB/RB ya son "ciclar plataforma" en PC, mismo criterio de no
    // duplicar un botón para dos cosas dentro de la misma vista).
    if (edge(6)) gpCycleView(-1);
    if (edge(7)) gpCycleView(1);

    // Aislado igual que el teclado: cada vista mueve SOLO lo suyo, nunca lo
    // que quedó "detrás" en otra vista.
    if (viewMode === 'retro') {
      if ((dx || dy) && now - padState.lastMove > 180) { moveRetro(dx, dy); padState.lastMove = now; }
      if (edge(0)) retroPrimaryAction();
    } else if (viewMode === 'dock' || viewMode === 'list') {
      if ((dx || dy) && now - padState.lastMove > 180) { move(dx, dy); padState.lastMove = now; }
      if (edge(0)) primaryAction();
      if (edge(4)) cyclePlatform(-1);
      if (edge(5)) cyclePlatform(1);
    } else if (viewMode === 'home' || viewMode === 'profile' || viewMode === 'deals') {
      if ((dx || dy) && now - padState.lastMove > 180) { gpMove(dx, dy); padState.lastMove = now; }
      if (edge(0)) gpActivate();
    } else if (viewMode === 'achievements') {
      if (dx && now - padState.lastMove > 220) { gpCycleAchSourceTab(dx); padState.lastMove = now; }
    }
  }
  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);

