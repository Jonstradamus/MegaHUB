/* global CONSOLE_REGISTRY, PLAT_LABEL, allGames, buildHomeTile, escapeHtml, formatHours */
/* ================= Perfil (estadísticas unificadas) =================
   Cruza SOLO las 2 fuentes con horas reales de por vida (Steam + Retro, ver
   el handler get-profile-stats en main.js) — el resto de launchers se listan
   aparte como "sin datos de horas" en vez de inventar un número. */

// El agregado que manda main.js trae appid/título (Steam) o título/consoleId
// (Retro), no el juego completo — se resuelve contra allGames (ya cargado)
// para tener coverUrl/installed/id y poder armar una tarjeta real. Si no
// resuelve (se desinstaló, o es una ROM fuera del catálogo) se omite: mejor
// no mostrarla que mostrar una tarjeta que no lanza nada.
function findGameForProfileEntry(entry, platformHint) {
  if (platformHint === 'steam') return allGames.find(g => g.id === `steam-${entry.appid}`) || null;
  const t = entry.title.toLowerCase();
  return allGames.find(g => g.platform === 'retroarch' && g.title && g.title.toLowerCase() === t) || null;
}

function renderProfile(stats) {
  const summarySection = document.getElementById('profile-summary');
  const breakdownSection = document.getElementById('profile-breakdown');
  const topSection = document.getElementById('profile-top');
  const untrackedEl = document.getElementById('profile-untracked');
  const emptyEl = document.getElementById('profile-empty');

  const totalMinutes = stats ? stats.totalSteamMinutes + stats.totalRetroMinutes : 0;
  if (!stats || totalMinutes <= 0) {
    summarySection.hidden = true;
    breakdownSection.hidden = true;
    topSection.hidden = true;
    untrackedEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  summarySection.hidden = false;
  document.getElementById('profile-total-hours').textContent = formatHours(totalMinutes);
  document.getElementById('profile-days-played').textContent = String(stats.daysPlayed || 0);

  const bars = [];
  if (stats.totalSteamMinutes > 0) bars.push({ label: 'Steam', minutes: stats.totalSteamMinutes, color: 'var(--accent)' });
  for (const c of stats.byConsole) bars.push({ label: c.name, minutes: c.minutes, color: 'var(--retro-accent)' });
  breakdownSection.hidden = !bars.length;
  if (bars.length) {
    const maxMinutes = Math.max(...bars.map(b => b.minutes));
    document.getElementById('profile-breakdown-bars').innerHTML = bars.map(b => `
      <div class="profile-bar-row">
        <span class="profile-bar-label">${escapeHtml(b.label)}</span>
        <div class="profile-bar-track"><div class="profile-bar-fill" style="width:${Math.max(4, Math.round(b.minutes / maxMinutes * 100))}%; background:${b.color}"></div></div>
        <span class="profile-bar-hours">${formatHours(b.minutes)}</span>
      </div>`).join('');
  }

  const combined = [
    ...stats.topSteamGames.map(g => ({ ...g, platformHint: 'steam' })),
    ...stats.topRetroGames.map(g => ({ ...g, platformHint: 'retro' })),
  ].sort((a, b) => b.minutes - a.minutes).slice(0, 8);
  const topGames = combined.map(entry => findGameForProfileEntry(entry, entry.platformHint)).filter(Boolean);
  const topGrid = document.getElementById('profile-top-grid');
  topGrid.innerHTML = '';
  topSection.hidden = !topGames.length;
  topGames.forEach(g => topGrid.appendChild(buildHomeTile(g)));

  if (stats.untrackedPlatforms && stats.untrackedPlatforms.length) {
    untrackedEl.hidden = false;
    const names = stats.untrackedPlatforms.map(p => PLAT_LABEL[p] || p).join(', ');
    untrackedEl.textContent = `También jugaste en: ${names} — sin datos de horas disponibles para estos launchers.`;
  } else {
    untrackedEl.hidden = true;
  }
}

async function initProfileView() {
  const consoleNames = Object.fromEntries(CONSOLE_REGISTRY.map(c => [c.id, c.name]));
  let stats = null;
  try {
    const res = await window.megahub.getProfileStats({ consoleNames });
    if (!res || !res.error) stats = res;
  } catch { stats = null; }
  renderProfile(stats);
}

