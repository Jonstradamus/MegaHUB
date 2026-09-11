/* global allGames:writable, metaById, rebuildGenreChips, render */
/* ================= Enriquecimiento en segundo plano ================= */

async function enrichMetadata() {
  // Prioridad: instalados primero, luego biblioteca. Sin tope: con 1.2s entre
  // llamadas (throttle del backend) una biblioteca grande tarda unos minutos en
  // resolverse del todo, pero corre en segundo plano y queda cacheada en disco,
  // así que las próximas aperturas ya no tienen que re-pedir nada.
  const targets = [
    ...allGames.filter(g => g.platform === 'steam' && g.installed),
    ...allGames.filter(g => g.platform === 'steam' && !g.installed),
  ].filter(g => !metaById[g.id]);
  let dirty = 0;
  for (const g of targets) {
    const meta = await window.megahub.getMeta(g);
    if (meta) {
      metaById[g.id] = meta;
      if (g.needsName && meta.name) { g.title = meta.name; g.needsName = false; dirty++; }
      // Lo que la tienda dice que no es un juego (DLC, herramienta) sale de la biblioteca
      if (!g.installed && meta.type && meta.type !== 'game') {
        allGames = allGames.filter(x => x.id !== g.id);
        dirty++;
      }
    } else if (g.needsName && !g.installed) {
      // Sin ficha en la tienda: no es lanzable/instalable, fuera
      allGames = allGames.filter(x => x.id !== g.id);
      dirty++;
    }
    if (dirty >= 8) { dirty = 0; render(); rebuildGenreChips(); }
  }
  render();
  rebuildGenreChips();
}

