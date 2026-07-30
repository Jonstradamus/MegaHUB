// Riot no tiene una API pública de requisitos (a diferencia de Steam), pero
// son solo 5 juegos y sus specs oficiales cambian poco — se cura a mano en vez
// de intentar adivinar/scrapear. Mismo formato de texto que espera
// requirements.js (líneas "Processor:/Graphics:/Memory:", como el HTML que
// devuelve la API de Steam) para reusar tal cual analyzeRequirements().
// Fuentes: páginas de soporte/requisitos oficiales de cada juego, revisadas
// en julio 2026. El tamaño en disco es aproximado (varía con parches).
function reqText(lines) {
  return lines.join('\n');
}

const RIOT_GAME_DATA = {
  league_of_legends: {
    installSizeBytes: 16 * 1024 * 1024 * 1024,
    requirements: {
      minimum: reqText([
        'Processor: Intel Core i3-530 or AMD A6-3650',
        'Memory: 2 GB RAM',
        'Graphics: NVIDIA GeForce 9600GT or AMD Radeon HD 6570 (DirectX 11)',
      ]),
      recommended: reqText([
        'Processor: Intel Core i5-8250 or AMD Ryzen 3 1200',
        'Memory: 4 GB RAM',
        'Graphics: 2 GB VRAM',
      ]),
    },
  },
  valorant: {
    installSizeBytes: 30 * 1024 * 1024 * 1024,
    requirements: {
      minimum: reqText([
        'Processor: Intel Core 2 Duo E8400 or AMD Athlon 200GE',
        'Memory: 4 GB RAM',
        'Graphics: Intel HD 4000 or AMD Radeon R5 200 (1 GB VRAM)',
      ]),
      recommended: reqText([
        'Processor: Intel Core i3-4150 or AMD Ryzen 3 1200',
        'Memory: 4 GB RAM',
        'Graphics: NVIDIA GeForce GT 730 or AMD Radeon R7 240 (1 GB VRAM)',
      ]),
    },
  },
  teamfighttactics: {
    installSizeBytes: 12 * 1024 * 1024 * 1024,
    requirements: {
      minimum: reqText([
        'Processor: Intel Pentium 4 2.00GHz',
        'Memory: 4 GB RAM',
        'Graphics: AMD Radeon HD 5670',
      ]),
      recommended: null,
    },
  },
  bacon: { // Legends of Runeterra — id interno usado por Riot en metadata/instalación
    installSizeBytes: 3 * 1024 * 1024 * 1024,
    requirements: {
      minimum: reqText([
        'Processor: Intel Core i5-3330 or equivalent 3GHz processor',
        'Memory: 4 GB RAM',
        'Graphics: AMD Radeon HD 5450',
      ]),
      recommended: null,
    },
  },
  lion: { // 2XKO — id interno usado por Riot, alfa/beta al momento de curar estos datos
    installSizeBytes: 5.5 * 1024 * 1024 * 1024,
    requirements: {
      minimum: reqText([
        'Processor: Intel Core i7-4770 or AMD FX-9590',
        'Memory: 8 GB RAM',
        'Graphics: NVIDIA GeForce GTX 960 or AMD Radeon R9 380',
      ]),
      recommended: reqText([
        'Processor: Intel Core i5-11400 or AMD Ryzen 5 5600X',
        'Memory: 16 GB RAM',
        'Graphics: NVIDIA GeForce GTX 1660 Ti, AMD Radeon RX 5700 XT or Intel Arc A580',
      ]),
    },
  },
};
// Alias: lor/2xko son los nombres "bonitos" que ya usa riot.js en PRODUCT_NAMES
// para el mismo producto interno que bacon/lion.
RIOT_GAME_DATA.lor = RIOT_GAME_DATA.bacon;
RIOT_GAME_DATA['2xko'] = RIOT_GAME_DATA.lion;

function getRiotGameData(riotProduct) {
  return RIOT_GAME_DATA[riotProduct] || null;
}

module.exports = { getRiotGameData };
