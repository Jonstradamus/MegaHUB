// Appids de Steam que NO son juegos de verdad — fuente única compartida por
// todo lo que necesite responder "¿esto es un juego?": el escaneo de
// instalados (steam.js), el escaneo de biblioteca completa (steamOwned.js) y
// el motor de logros (achievementEngine.js). Antes había dos listas
// separadas y un lugar (el loop de logros de Steam) que no las consultaba —
// eso dejó a Spacewar (480) generando logros fantasma después de haberlo
// filtrado de la biblioteca. Una sola lista cierra esa clase de bug.
const NON_GAME_APPIDS = new Set([
  // Detectadas en appmanifest_*.acf de instalaciones locales (redistribuibles,
  // runtimes, herramientas que Steam instala junto a un juego real).
  '228980', '1070560', '1391110', '1493710', '2180100',
  // Detectadas en localconfig.vdf (apps "poseídas" sin haberlas comprado, o
  // apps internas de Steam sin ficha de juego real).
  // 480 = Spacewar, la app de pruebas de Valve para el SDK — casi cualquier
  // cuenta que alguna vez tuvo un juego con Source SDK la "posee" sin haberla
  // comprado nunca, y como no tiene ficha pública en la tienda su nombre nunca
  // se resuelve (quedaba mostrada como "Steam App 480" para siempre).
  '7', '480', '760', '241100',
]);

module.exports = { NON_GAME_APPIDS };
