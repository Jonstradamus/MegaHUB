/* exported CONSOLE_EMULATOR_GUIDE, CONSOLE_REGISTRY, LAUNCHER_REGISTRY, MULTIPLAYER_KEY, PLATFORM_ORDER, PLAT_ABBR, PLAT_LABEL, achievementsWrap, allGames, applyStaticIcons, consoleCardEls, controlsFooter, countEl, currentConsole, dealsWrap, disabledPlatforms, dock, dockEls, dockWrap, filters, hiddenGameIds, homeWrap, icon, list, listEls, localRomCounts, metaById, padStatus, padStatusLabel, profileWrap, retroCatalog, retroConsoleGrid, retroConsoleSelectedIndex, retroConsoleSortMode, retroConsoleView, retroCountEl, retroDetailMeta, retroDetailName, retroDetailPhoto, retroDetailView, retroEnabled, retroFilteredCatalog, retroGameEls, retroGameGrid, retroGridBuilt, retroOwnedFilterMode, retroSearchTerm, retroSelectedIndex, retroWrap, searchInput, selectedIndex, sgdbInput, sgdbSaveBtn, videoAllowedFor, viewMode, visible, widgetAutoHide */
/* ================= Iconos ================= */
// Set propio de iconos SVG monolínea (nada de librería externa ni descarga —
// paths escritos a mano, 24x24, stroke="currentColor" para heredar color de
// contexto). Reemplaza los emoji, que en Windows renderizan con la fuente de
// emoji del sistema y desentonan con el resto del diseño.
const ICON_PATHS = {
  gamepad: '<rect x="2" y="7.5" width="20" height="10" rx="4"/><line x1="6.5" y1="10" x2="6.5" y2="15"/><line x1="4" y1="12.5" x2="9" y2="12.5"/><circle cx="15.5" cy="10.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="17.8" cy="13" r="1.1" fill="currentColor" stroke="none"/>',
  trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0V4z"/><path d="M7 5.2H4.2A3 3 0 0 0 7 8.2"/><path d="M17 5.2h2.8A3 3 0 0 1 17 8.2"/><path d="M12 13.5V17"/><path d="M8.5 20.5h7"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 6.6l1.7 1.7M17.7 15.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 17.4l1.7-1.7M17.7 8.3l1.7-1.7"/>',
  menu: '<line x1="3.5" y1="6.5" x2="20.5" y2="6.5"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="3.5" y1="17.5" x2="20.5" y2="17.5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  zap: '<polygon points="13 2 4 14 11.5 14 10.5 22 20 10 12.5 10 13 2" stroke-linejoin="round"/>',
  download: '<path d="M12 3v11.5"/><polyline points="7 10.5 12 15.5 17 10.5"/><path d="M4.5 20.5h15"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11.2A6.5 6.5 0 1 0 5.5 9.8C5.5 15 12 21 12 21z"/><circle cx="12" cy="9.6" r="2.3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.6 6.4"/><polyline points="20 4.5 20 11 13.5 11"/>',
  folder: '<path d="M3 6.8A1.8 1.8 0 0 1 4.8 5h4.4l1.8 2h9.2A1.8 1.8 0 0 1 22 8.8v9.4A1.8 1.8 0 0 1 20.2 20H3.8A1.8 1.8 0 0 1 2 18.2V6.8z"/>',
  folderOpen: '<path d="M3 8.2V6.8A1.8 1.8 0 0 1 4.8 5h4.4l1.8 2h9.2A1.8 1.8 0 0 1 22 8.8v.4"/><path d="m3 8.2 18 0 1.7 9.4a1.8 1.8 0 0 1-1.8 2.1H3.1a1.8 1.8 0 0 1-1.8-2.1L3 8.2z"/>',
  package: '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
  check: '<polyline points="20 6.5 9.5 17.5 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  warning: '<path d="M12 3 2 20.5h20L12 3z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  lock: '<rect x="5" y="10.8" width="14" height="9.7" rx="2"/><path d="M8 10.8V7.3a4 4 0 0 1 8 0v3.5"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  link: '<path d="M14 4.5h5.5v5.5"/><line x1="19.5" y1="4.5" x2="10" y2="14"/><path d="M17.5 13v5a1.8 1.8 0 0 1-1.8 1.8H6.3A1.8 1.8 0 0 1 4.5 18V8.3a1.8 1.8 0 0 1 1.8-1.8h5"/>',
  play: '<polygon points="6 3.5 20 12 6 20.5" stroke-linejoin="round"/>',
  plug: '<path d="M9 3v6M15 3v6"/><path d="M6 9h12v3.5a6 6 0 0 1-12 0V9z"/><path d="M12 18.5V21"/>',
  eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c6.2 0 10 7 10 7a15.6 15.6 0 0 1-3.4 4.2M6.5 6.6C4 8.3 2 12 2 12s3.8 7 10 7a10 10 0 0 0 3.4-.6"/><path d="M9.5 9.8a3 3 0 0 0 4.2 4.2"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" stroke="none"/><path d="M21 16.5l-5.5-5.5a2 2 0 0 0-2.8 0L3 20"/>',
  winMin: '<line x1="5" y1="12" x2="19" y2="12"/>',
  winMax: '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
  winRestore: '<rect x="7.5" y="4.5" width="10" height="10" rx="1.3"/><path d="M6.5 8.5H5.8A1.3 1.3 0 0 0 4.5 9.8v8.4a1.3 1.3 0 0 0 1.3 1.3h8.4a1.3 1.3 0 0 0 1.3-1.3v-0.7"/>',
  winClose: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15 13.2c2.3.4 4 2.3 4 6.3"/>',
  tag: '<path d="M12.7 3.5H5.8A2.3 2.3 0 0 0 3.5 5.8v6.9c0 .6.24 1.19.67 1.62l8.4 8.4a2.3 2.3 0 0 0 3.26 0l5.03-5.03a2.3 2.3 0 0 0 0-3.26l-8.4-8.4A2.3 2.3 0 0 0 12.7 3.5z"/><circle cx="8.6" cy="8.6" r="1.6" fill="currentColor" stroke="none"/>',
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-6h4v6"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/>',
  gift: '<rect x="4" y="9.5" width="16" height="11" rx="1.5"/><path d="M4 9.5h16v4H4z"/><line x1="12" y1="9.5" x2="12" y2="20.5"/><path d="M12 9.5c0-2.4-1.8-4-3.4-4S6 6.6 6 7.9s1.4 1.6 2.9 1.6H12z"/><path d="M12 9.5c0-2.4 1.8-4 3.4-4S18 6.6 18 7.9s-1.4 1.6-2.9 1.6H12z"/>',
};
function icon(name, cls) {
  const body = ICON_PATHS[name];
  if (!body) return '';
  return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${body}</svg>`;
}

// El HTML estático usa <i data-icon="nombre" class="..."> como marcador — se
// reemplaza una vez al arrancar por el <svg> real, para no duplicar los
// paths de ICON_PATHS entre index.html y este archivo.
function applyStaticIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach(el => {
    el.outerHTML = icon(el.dataset.icon, el.className || '');
  });
}
applyStaticIcons();

const PLAT_LABEL = {
  steam: 'Steam', epic: 'Epic Games', gog: 'GOG',
  battlenet: 'Battle.net', riot: 'Riot Games', xbox: 'Xbox',
  rockstar: 'Rockstar Games', ubisoft: 'Ubisoft Connect', ea: 'EA App',
  retroarch: 'RetroArch', retro: 'Retro',
};
// Abreviaturas en texto, no emojis: un emoji mal renderizado en Windows puede
// confundirse con el icono nativo de "imagen rota" del navegador.
const PLAT_ABBR = {
  steam: 'STM', epic: 'EPIC', gog: 'GOG', battlenet: 'BNET', riot: 'RIOT',
  xbox: 'XBOX', rockstar: 'RSG', ubisoft: 'UPLAY', ea: 'EA', retroarch: 'RETRO',
};
const PLATFORM_ORDER = ['steam', 'epic', 'gog', 'battlenet', 'riot', 'xbox', 'rockstar', 'ubisoft', 'ea', 'retroarch'];

// Catálogo de launchers "posibles" para el panel de Ajustes. Los de status
// 'implemented' ya tienen scanner real; 'planned' se listan para transparencia
// (investigados como candidatos) pero MegaHUB aún no sabe leerlos.
const LAUNCHER_REGISTRY = [
  { id: 'steam', label: 'Steam', tier: 'clave', status: 'implemented' },
  { id: 'epic', label: 'Epic Games', tier: 'clave', status: 'implemented' },
  { id: 'gog', label: 'GOG Galaxy', tier: 'clave', status: 'implemented' },
  { id: 'battlenet', label: 'Battle.net', tier: 'clave', status: 'implemented' },
  { id: 'riot', label: 'Riot Client', tier: 'clave', status: 'implemented' },
  { id: 'xbox', label: 'Xbox / Game Pass', tier: 'clave', status: 'implemented' },
  { id: 'ubisoft', label: 'Ubisoft Connect', tier: 'clave', status: 'implemented' },
  { id: 'ea', label: 'EA App', tier: 'clave', status: 'implemented' },
  { id: 'rockstar', label: 'Rockstar Games Launcher', tier: 'clave', status: 'implemented' },
  { id: 'itch', label: 'itch.io', tier: 'nicho', status: 'planned' },
  { id: 'amazon', label: 'Amazon Games / Prime Gaming', tier: 'nicho', status: 'planned' },
  { id: 'humble', label: 'Humble App', tier: 'nicho', status: 'planned' },
  { id: 'paradox', label: 'Paradox Launcher', tier: 'nicho', status: 'planned' },
  { id: 'dmm', label: 'DMM GAME PLAYER', tier: 'nicho', status: 'planned' },
  { id: 'glyph', label: 'Glyph (Trion / Gamigo)', tier: 'nicho', status: 'planned' },
];

// Guía de referencia: emulador más popular/funcional por consola, hasta la
// generación PS3 / Xbox 360. 'core' = disponible como core de RetroArch,
// 'standalone' = rinde mejor como programa independiente (más pesados de emular).
const CONSOLE_EMULATOR_GUIDE = [
  {
    gen: '8 / 16 bits',
    items: [
      { console: 'NES', emu: 'Mesen', src: 'core' },
      { console: 'SNES', emu: 'Snes9x', src: 'core', note: 'bsnes si priorizas precisión sobre velocidad' },
      { console: 'Master System / Game Gear', emu: 'Genesis Plus GX', src: 'core' },
      { console: 'Mega Drive / Genesis', emu: 'Genesis Plus GX', src: 'core' },
      { console: 'Game Boy / Color', emu: 'SameBoy', src: 'core' },
    ],
  },
  {
    gen: '32 / 64 bits',
    items: [
      { console: 'Nintendo 64', emu: 'Project64', src: 'standalone', note: 'Mupen64Plus-Next como core alternativo' },
      { console: 'PlayStation (PS1)', emu: 'DuckStation', src: 'core' },
      { console: 'Sega Saturn', emu: 'Mednafen (Beetle Saturn)', src: 'core' },
    ],
  },
  {
    gen: 'Sexta generación',
    items: [
      { console: 'PlayStation 2', emu: 'PCSX2', src: 'standalone' },
      { console: 'GameCube', emu: 'Dolphin', src: 'standalone' },
      { console: 'Xbox (original)', emu: 'Xemu', src: 'standalone' },
      { console: 'Dreamcast', emu: 'Flycast', src: 'core', note: 'Redream como alternativa standalone más simple' },
      { console: 'NAOMI / Atomiswave (arcade)', emu: 'Flycast', src: 'core', note: 'mismo core que Dreamcast, mismo hardware base' },
      { console: 'Game Boy Advance', emu: 'mGBA', src: 'core' },
    ],
  },
  {
    gen: 'Séptima generación',
    items: [
      { console: 'PlayStation 3', emu: 'RPCS3', src: 'standalone' },
      { console: 'Xbox 360', emu: 'Xenia', src: 'standalone' },
      { console: 'Wii', emu: 'Dolphin', src: 'standalone' },
      { console: 'Nintendo DS', emu: 'melonDS', src: 'core' },
      { console: 'PSP', emu: 'PPSSPP', src: 'core' },
    ],
  },
  {
    gen: 'Bonus',
    items: [
      { console: 'Arcade', emu: 'MAME', src: 'core' },
    ],
  },
];

// Registro de consolas para la vista Retro (⚙ 🕹). repo = nombre del repositorio
// libretro-thumbnails (verificado en vivo); wikiTitle/commonsQuery = para resolver
// la foto vía Wikipedia/Commons (fotos libres, sin key). Ordenado por año de salida.
const RETROARCH_DL = 'https://www.retroarch.com/?page=platforms';
const CONSOLE_REGISTRY = [
  { id: 'atari2600', name: 'Atari 2600', year: 1977, gen: '2ª generación', wikiTitle: 'Atari 2600', commonsQuery: 'Atari 2600 console', repo: 'Atari_-_2600', emulator: 'Stella (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'arcade', name: 'Arcade', year: 1978, gen: 'Recreativas', wikiTitle: 'Arcade video game', commonsQuery: 'arcade cabinet', repo: 'FBNeo_-_Arcade_Games', emulator: 'FBNeo (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'nes', name: 'NES (Famicom)', year: 1983, gen: '8 bits', wikiTitle: 'Nintendo Entertainment System', commonsQuery: 'NES console', repo: 'Nintendo_-_Nintendo_Entertainment_System', emulator: 'Mesen (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'sms', name: 'Master System', year: 1985, gen: '8 bits', wikiTitle: 'Master System', commonsQuery: 'Sega Master System console', repo: 'Sega_-_Master_System_-_Mark_III', emulator: 'Genesis Plus GX (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'pcengine', name: 'PC Engine / TurboGrafx-16', year: 1987, gen: '16 bits', wikiTitle: 'TurboGrafx-16', commonsQuery: 'PC Engine console', repo: 'NEC_-_PC_Engine_-_TurboGrafx_16', emulator: 'Beetle PCE Fast (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'genesis', name: 'Mega Drive / Genesis', year: 1988, gen: '16 bits', wikiTitle: 'Sega Genesis', commonsQuery: 'Sega Genesis console', repo: 'Sega_-_Mega_Drive_-_Genesis', emulator: 'Genesis Plus GX (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'gb', name: 'Game Boy', year: 1989, gen: 'Portátil', wikiTitle: 'Game Boy', commonsQuery: 'Game Boy console', repo: 'Nintendo_-_Game_Boy', emulator: 'SameBoy (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'snes', name: 'Super Nintendo', year: 1990, gen: '16 bits', wikiTitle: 'Super Nintendo Entertainment System', commonsQuery: 'SNES console', repo: 'Nintendo_-_Super_Nintendo_Entertainment_System', emulator: 'Snes9x (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'gamegear', name: 'Game Gear', year: 1990, gen: 'Portátil', wikiTitle: 'Game Gear', commonsQuery: 'Sega Game Gear console', repo: 'Sega_-_Game_Gear', emulator: 'Genesis Plus GX (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'neogeo', name: 'Neo Geo (AES/MVS)', year: 1990, gen: '16 bits', wikiTitle: 'Neo Geo', commonsQuery: 'Neo Geo console', repo: 'SNK_-_Neo_Geo', emulator: 'FBNeo (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'segacd', name: 'Sega CD', year: 1991, gen: '16 bits', wikiTitle: 'Sega CD', commonsQuery: 'Sega CD console', repo: 'Sega_-_Mega-CD_-_Sega_CD', emulator: 'Genesis Plus GX (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'psx', name: 'PlayStation', year: 1994, gen: '32 bits', wikiTitle: 'PlayStation (console)', commonsQuery: 'PlayStation SCPH-1000', repo: 'Sony_-_PlayStation', emulator: 'DuckStation (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'saturn', name: 'Sega Saturn', year: 1994, gen: '32 bits', wikiTitle: 'Sega Saturn', commonsQuery: 'Sega Saturn console', repo: 'Sega_-_Saturn', emulator: 'Mednafen / Beetle Saturn (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'n64', name: 'Nintendo 64', year: 1996, gen: '64 bits', wikiTitle: 'Nintendo 64', commonsQuery: 'Nintendo 64 console', repo: 'Nintendo_-_Nintendo_64', emulator: 'Mupen64Plus-Next (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'gbc', name: 'Game Boy Color', year: 1998, gen: 'Portátil', wikiTitle: 'Game Boy Color', commonsQuery: 'Game Boy Color console', repo: 'Nintendo_-_Game_Boy_Color', emulator: 'SameBoy (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'dreamcast', name: 'Dreamcast', year: 1998, gen: '6ª generación', wikiTitle: 'Dreamcast', commonsQuery: 'Sega Dreamcast console', repo: 'Sega_-_Dreamcast', emulator: 'Flycast (core RetroArch)', emulatorUrl: RETROARCH_DL },
  // NAOMI/Atomiswave: placas arcade basadas en el mismo hardware que la
  // Dreamcast (por eso comparten emulador) — se agrupan en una sola entrada
  // porque en la práctica sus ROMs conviven en la misma carpeta y se abren
  // con el mismo core; el catálogo de portadas usa el repo de NAOMI (más
  // grande e incluye los juegos más conocidos, ej. House of the Dead 2).
  { id: 'naomi', name: 'NAOMI / Atomiswave', year: 1998, gen: '6ª generación', wikiTitle: 'Sega NAOMI', commonsQuery: 'Sega Naomi arcade board', repo: 'Sega_-_Naomi', emulator: 'Flycast (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'ps2', name: 'PlayStation 2', year: 2000, gen: '6ª generación', wikiTitle: 'PlayStation 2', commonsQuery: 'PlayStation 2 console', repo: 'Sony_-_PlayStation_2', emulator: 'PCSX2', emulatorUrl: 'https://pcsx2.net/downloads', downloadable: true },
  { id: 'gba', name: 'Game Boy Advance', year: 2001, gen: 'Portátil', wikiTitle: 'Game Boy Advance', commonsQuery: 'Game Boy Advance console', repo: 'Nintendo_-_Game_Boy_Advance', emulator: 'mGBA (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'gamecube', name: 'GameCube', year: 2001, gen: '6ª generación', wikiTitle: 'GameCube', commonsQuery: 'Nintendo GameCube console', repo: 'Nintendo_-_GameCube', emulator: 'Dolphin', emulatorUrl: 'https://dolphin-emu.org/download/', locatable: true },
  { id: 'xbox', name: 'Xbox', year: 2001, gen: '6ª generación', wikiTitle: 'Xbox (console)', commonsQuery: 'Xbox console', repo: 'Microsoft_-_Xbox', emulator: 'Xemu', emulatorUrl: 'https://xemu.app/', downloadable: true },
  { id: 'nds', name: 'Nintendo DS', year: 2004, gen: 'Portátil', wikiTitle: 'Nintendo DS', commonsQuery: 'Nintendo DS console', repo: 'Nintendo_-_Nintendo_DS', emulator: 'melonDS (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'psp', name: 'PSP', year: 2004, gen: 'Portátil', wikiTitle: 'PlayStation Portable', commonsQuery: 'PlayStation Portable console', repo: 'Sony_-_PlayStation_Portable', emulator: 'PPSSPP (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'xbox360', name: 'Xbox 360', year: 2005, gen: '7ª generación', wikiTitle: 'Xbox 360', commonsQuery: 'Xbox 360 console', repo: 'Microsoft_-_Xbox_360', emulator: 'Xenia', emulatorUrl: 'https://xenia.jp/', downloadable: true },
  { id: 'ps3', name: 'PlayStation 3', year: 2006, gen: '7ª generación', wikiTitle: 'PlayStation 3', commonsQuery: 'PlayStation 3 console', repo: 'Sony_-_PlayStation_3', emulator: 'RPCS3', emulatorUrl: 'https://rpcs3.net/download', downloadable: true },
  { id: 'wii', name: 'Wii', year: 2006, gen: '7ª generación', wikiTitle: 'Wii', commonsQuery: 'Nintendo Wii console', repo: 'Nintendo_-_Wii', emulator: 'Dolphin', emulatorUrl: 'https://dolphin-emu.org/download/', locatable: true },

  // Añadidas tras verificar legalidad: todas son proyectos open-source sin
  // demandas activas ni código propietario de por medio (a diferencia de
  // Yuzu/Citra, que sí fueron demandados por Nintendo en 2024 por habilitar
  // el descifrado de ROMs cifradas). Para 3DS se usa Azahar en vez de Citra:
  // Citra fue retirado como parte del acuerdo legal de Nintendo con Tropic
  // Haze; Azahar es un fork limpio nacido después, sin código de Nintendo y
  // sin soporte para ROMs cifradas.
  { id: 'intellivision', name: 'Intellivision', year: 1979, gen: '2ª generación', wikiTitle: 'Intellivision', commonsQuery: 'Intellivision console', repo: 'Mattel_-_Intellivision', emulator: 'FreeIntv (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'atari5200', name: 'Atari 5200', year: 1982, gen: '2ª generación', wikiTitle: 'Atari 5200', commonsQuery: 'Atari 5200 console', repo: 'Atari_-_5200', emulator: 'a5200 (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'colecovision', name: 'ColecoVision', year: 1982, gen: '2ª generación', wikiTitle: 'ColecoVision', commonsQuery: 'ColecoVision console', repo: 'Coleco_-_ColecoVision', emulator: 'Gearcoleco (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'vectrex', name: 'Vectrex', year: 1982, gen: '2ª generación', wikiTitle: 'Vectrex', commonsQuery: 'Vectrex console', repo: 'GCE_-_Vectrex', emulator: 'Vecx (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'msx', name: 'MSX', year: 1983, gen: '8 bits', wikiTitle: 'MSX', commonsQuery: 'MSX computer', repo: 'Microsoft_-_MSX', emulator: 'blueMSX (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'atari7800', name: 'Atari 7800', year: 1986, gen: '8 bits', wikiTitle: 'Atari 7800', commonsQuery: 'Atari 7800 console', repo: 'Atari_-_7800', emulator: 'ProSystem (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'atarilynx', name: 'Atari Lynx', year: 1989, gen: 'Portátil', wikiTitle: 'Atari Lynx', commonsQuery: 'Atari Lynx console', repo: 'Atari_-_Lynx', emulator: 'Handy (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'threedo', name: '3DO', year: 1993, gen: '5ª generación', wikiTitle: '3DO Interactive Multiplayer', commonsQuery: '3DO console', repo: 'The_3DO_Company_-_3DO', emulator: 'Opera (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'atarijaguar', name: 'Atari Jaguar', year: 1993, gen: '5ª generación', wikiTitle: 'Atari Jaguar', commonsQuery: 'Atari Jaguar console', repo: 'Atari_-_Jaguar', emulator: 'Virtual Jaguar (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'virtualboy', name: 'Virtual Boy', year: 1995, gen: 'Portátil', wikiTitle: 'Virtual Boy', commonsQuery: 'Virtual Boy console', repo: 'Nintendo_-_Virtual_Boy', emulator: 'Beetle VB (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'ngp', name: 'Neo Geo Pocket (Color)', year: 1999, gen: 'Portátil', wikiTitle: 'Neo Geo Pocket Color', commonsQuery: 'Neo Geo Pocket Color console', repo: 'SNK_-_Neo_Geo_Pocket_Color', emulator: 'Beetle NeoPop (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'wonderswan', name: 'WonderSwan (Color)', year: 1999, gen: 'Portátil', wikiTitle: 'WonderSwan Color', commonsQuery: 'WonderSwan Color console', repo: 'Bandai_-_WonderSwan_Color', emulator: 'Beetle Cygne (core RetroArch)', emulatorUrl: RETROARCH_DL },
  { id: 'n3ds', name: 'Nintendo 3DS', year: 2011, gen: 'Portátil', wikiTitle: 'Nintendo 3DS', commonsQuery: 'Nintendo 3DS console', repo: 'Nintendo_-_Nintendo_3DS', emulator: 'Azahar (core RetroArch)', emulatorUrl: RETROARCH_DL },
];

// Qué consolas tienen multijugador online real y con qué guía (ver
// docs/multiplayer/*.txt + el whitelist MULTIPLAYER_README de main.js).
// Se deriva de CONSOLE_REGISTRY para no mantener dos listas de "cores
// RetroArch" a mano; los standalone (Dolphin/RPCS3/PCSX2/Xemu) y Xbox 360
// (Xenia, sin online real — se deja afuera a propósito) van explícitos.
const MULTIPLAYER_KEY = {};
for (const c of CONSOLE_REGISTRY) {
  if (/core RetroArch/.test(c.emulator)) MULTIPLAYER_KEY[c.id] = 'retroarch';
}
MULTIPLAYER_KEY.gamecube = 'dolphin';
MULTIPLAYER_KEY.wii = 'dolphin';
MULTIPLAYER_KEY.ps2 = 'pcsx2';
MULTIPLAYER_KEY.ps3 = 'rpcs3';
MULTIPLAYER_KEY.xbox = 'xemu';

let allGames = [];
let visible = [];
let selectedIndex = 0;
let metaById = {};   // id → metadata (géneros, fecha, requisitos, trailer)
// Instalaciones nuevas (sin nada guardado todavía) aterrizan en Inicio, no
// en la grilla completa — quien ya tenía una vista elegida (dock/list/etc.)
// conserva la suya tal cual, esto solo cambia el default de un perfil nuevo.
let viewMode = localStorage.getItem('megahub-view') || 'home'; // home | dock | list
let videoAllowedFor = null; // id del juego donde el usuario hizo click explícito (habilita el video)

// Plataformas ocultas por el usuario desde Ajustes (persistido)
const disabledPlatforms = new Set(JSON.parse(localStorage.getItem('megahub-disabled-platforms') || '[]'));
let retroEnabled = localStorage.getItem('megahub-retro-enabled') !== 'off';
// Ajustes → Apariencia → "Auto-ocultar al pegarlo a un borde": si está en
// 'off', el widget se puede seguir pegando a un borde (posicionado) pero
// nunca se retrae solo — ver setupAppearanceTab() y win-widget-set-autohide en main.js.
let widgetAutoHide = localStorage.getItem('megahub-widget-autohide') !== 'off';

// Juegos ocultos individualmente (acción en lote u "Ocultar" — ver más abajo),
// distinto de las plataformas enteras deshabilitadas en Ajustes.
let hiddenGameIds = new Set(JSON.parse(localStorage.getItem('megahub-hidden-games') || '[]'));
function saveHiddenGames() { localStorage.setItem('megahub-hidden-games', JSON.stringify([...hiddenGameIds])); }

// Cachés de elementos DOM ya montados, uno por modo de vista — permiten reordenar
// / actualizar sin recrear <img> (evita parpadeos) y sin perder el trabajo al
// cambiar de modo.
const dockEls = new Map();
const listEls = new Map();

const filters = { platform: 'all', state: 'all', sort: 'name', genre: 'all', search: '' };

const dockWrap = document.getElementById('dock-wrap');
const dock = document.getElementById('dock');
const list = document.getElementById('list');
const countEl = document.getElementById('count');
const padStatus = document.getElementById('gamepad-status');
const padStatusLabel = document.getElementById('gamepad-status-label');
const controlsFooter = document.getElementById('controls');
const searchInput = document.getElementById('search');
const sgdbInput = document.getElementById('sgdb-key');
const sgdbSaveBtn = document.getElementById('sgdb-save');
const retroWrap = document.getElementById('retro-wrap');
const achievementsWrap = document.getElementById('achievements-wrap');
const dealsWrap = document.getElementById('deals-wrap');
const homeWrap = document.getElementById('home-wrap');
const profileWrap = document.getElementById('profile-wrap');

// Estado de la vista Retro — declarado aquí (antes de applyViewMode()/updateSidebarMode(),
// que ya se invocan más abajo) para evitar un ReferenceError de zona muerta temporal.
let retroGridBuilt = false;
let currentConsole = null;      // entrada activa de CONSOLE_REGISTRY
let retroCatalog = [];          // catálogo del sistema actual: [{title, coverUrl, owned, ownedGame}]
let retroFilteredCatalog = [];
let retroSelectedIndex = -1;
let retroOwnedFilterMode = 'all'; // 'all' | 'owned'
let retroSearchTerm = '';
const retroGameEls = new Map(); // title -> elemento <div class="retro-game-card"> ya montado
let retroConsoleSelectedIndex = -1; // navegación con teclado/mando del selector de consolas
// Elementos ya construidos, uno por consola — se reordenan según el filtro de
// orden elegido en vez de recrearse, así no se pierden las fotos ya cargadas.
const consoleCardEls = new Map();
let retroConsoleSortMode = localStorage.getItem('megahub-retro-console-sort') || 'year';
// ROMs puestas a mano en roms/<consola>/ que MegaHUB aún no cotejó contra el
// catálogo (eso solo pasa al abrir esa consola) — { [consoleId]: cantidad de
// archivos }. Sin esto, la grilla de selección solo miraba las playlists de
// RetroArch, así que las consolas con emulador standalone (Xbox/Xbox 360/PS2/
// GameCube/Wii/PS3, que nunca pasan por RetroArch) siempre decían "Ninguno
// detectado" aunque el usuario ya tuviera ROMs puestas ahí.
let localRomCounts = {};

const retroConsoleGrid = document.getElementById('retro-console-grid');
const retroConsoleView = document.getElementById('retro-console-view');
const retroDetailView = document.getElementById('retro-detail-view');
const retroDetailPhoto = document.getElementById('retro-detail-photo');
const retroDetailName = document.getElementById('retro-detail-name');
const retroDetailMeta = document.getElementById('retro-detail-meta');
const retroGameGrid = document.getElementById('retro-game-grid');
const retroCountEl = document.getElementById('retro-count');

