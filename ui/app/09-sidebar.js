/* exported buildPlatformChips, filterConsoleGridByName, rebuildGenreChips, syncChips */
/* global CONSOLE_REGISTRY, PLATFORM_ORDER, PLAT_LABEL, allGames, disabledPlatforms, filters, gameGenres, highlightMatch, render, retroConsoleGrid, selectedIndex:writable */
/* ================= Sidebar ================= */

function buildPlatformChips() {
  const box = document.getElementById('platform-filters');
  const present = [...new Set(allGames.map(g => g.platform))].filter(p => !disabledPlatforms.has(p));
  const plats = ['all', ...PLATFORM_ORDER.filter(p => present.includes(p))];
  box.innerHTML = '';
  for (const p of plats) {
    const btn = document.createElement('button');
    btn.className = 'chip' + (filters.platform === p ? ' active' : '');
    btn.textContent = p === 'all' ? 'Todas' : PLAT_LABEL[p];
    btn.onclick = () => { filters.platform = p; selectedIndex = 0; syncChips(box, btn); render(); };
    box.appendChild(btn);
  }
}

function rebuildGenreChips() {
  const box = document.getElementById('genre-filters');
  const genres = new Set();
  for (const g of allGames) {
    const gs = gameGenres(g);
    if (gs) gs.forEach(x => genres.add(x));
  }
  const current = filters.genre;
  box.innerHTML = '';
  const mk = (val, label) => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (current === val ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => { filters.genre = val; selectedIndex = 0; syncChips(box, btn); render(); };
    box.appendChild(btn);
  };
  mk('all', 'Todos');
  [...genres].sort().forEach(g => mk(g, g));
  document.getElementById('genre-note').style.display = genres.size ? 'none' : '';
}

function syncChips(box, activeBtn) {
  box.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === activeBtn));
}

document.getElementById('state-filters').addEventListener('click', (e) => {
  if (!e.target.dataset.state) return;
  filters.state = e.target.dataset.state;
  selectedIndex = 0;
  syncChips(e.currentTarget, e.target);
  render();
});
document.getElementById('sort-filters').addEventListener('click', (e) => {
  if (!e.target.dataset.sort) return;
  filters.sort = e.target.dataset.sort;
  syncChips(e.currentTarget, e.target);
  render();
});

function filterConsoleGridByName(term) {
  const t = term.toLowerCase();
  const visibleGens = new Set();
  retroConsoleGrid.querySelectorAll('.console-card').forEach(card => {
    const c = CONSOLE_REGISTRY.find(x => x.id === card.dataset.consoleId);
    if (!c) return;
    const match = !t || c.name.toLowerCase().includes(t);
    card.style.display = match ? '' : 'none';
    if (match) visibleGens.add(c.gen);
    card.querySelector('.console-card-name').innerHTML = highlightMatch(c.name, term);
  });
  retroConsoleGrid.querySelectorAll('.console-gen-header').forEach(h => {
    h.style.display = (!t || visibleGens.has(h.textContent)) ? '' : 'none';
  });
}

