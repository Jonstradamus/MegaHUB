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
  retroarch: 'RetroArch',
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
let viewMode = localStorage.getItem('megahub-view') || 'dock'; // dock | list
let videoAllowedFor = null; // id del juego donde el usuario hizo click explícito (habilita el video)

// Plataformas ocultas por el usuario desde Ajustes (persistido)
const disabledPlatforms = new Set(JSON.parse(localStorage.getItem('megahub-disabled-platforms') || '[]'));
let retroEnabled = localStorage.getItem('megahub-retro-enabled') !== 'off';

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
const searchInput = document.getElementById('search');
const sgdbInput = document.getElementById('sgdb-key');
const sgdbSaveBtn = document.getElementById('sgdb-save');
const retroWrap = document.getElementById('retro-wrap');
const achievementsWrap = document.getElementById('achievements-wrap');

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

/* ================= Filtros / orden ================= */

function applyFilters() {
  let list_ = allGames.filter(g => !disabledPlatforms.has(g.platform));
  // "Ocultos" es la única vista que SÍ muestra los juegos ocultos (para poder
  // revisarlos y volver a mostrarlos) — en cualquier otro estado quedan fuera.
  list_ = filters.state === 'hidden'
    ? list_.filter(g => hiddenGameIds.has(g.id))
    : list_.filter(g => !hiddenGameIds.has(g.id));
  if (filters.platform !== 'all') list_ = list_.filter(g => g.platform === filters.platform);
  if (filters.state === 'installed') list_ = list_.filter(g => g.installed);
  if (filters.state === 'library') list_ = list_.filter(g => !g.installed);
  if (filters.genre !== 'all') {
    list_ = list_.filter(g => {
      const genres = gameGenres(g);
      return genres && genres.includes(filters.genre);
    });
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list_ = list_.filter(g => g.title.toLowerCase().includes(q));
  }
  if (filters.sort === 'date') {
    list_ = [...list_].sort((a, b) => (gameReleaseTs(b) || 0) - (gameReleaseTs(a) || 0));
  } else {
    list_ = [...list_].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }
  return list_;
}

function gameGenres(g) {
  if (g.genre) return [g.genre];
  const m = metaById[g.id];
  return m && m.genres && m.genres.length ? m.genres : null;
}
function gameReleaseTs(g) {
  const m = metaById[g.id];
  return m ? m.releaseTs : null;
}

/* ================= Render (compartido por los 2 modos) ================= */

// Sincroniza un contenedor con `visible` reutilizando los nodos ya creados (con su
// <img> ya cargada) y solo reordenando/creando/borrando lo estrictamente necesario.
// Evita que cualquier modo "parpadee" y pierda la carátula visible cada vez que
// llega metadata o una portada en segundo plano.
function syncContainer(container, elementsMap, buildFn, updateFn, emptyMsg) {
  if (!visible.length) {
    elementsMap.forEach(el => el.remove());
    elementsMap.clear();
    if (!container.querySelector('.empty')) container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
    return;
  }
  const emptyDiv = container.querySelector('.empty');
  if (emptyDiv) emptyDiv.remove();

  const seen = new Set();
  visible.forEach((game, i) => {
    seen.add(game.id);
    let el = elementsMap.get(game.id);
    if (!el) { el = buildFn(game); elementsMap.set(game.id, el); }
    else updateFn(el, game);
    if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
  });
  for (const [id, el] of elementsMap) {
    if (!seen.has(id)) { el.remove(); elementsMap.delete(id); }
  }
}

function render() {
  visible = applyFilters();
  selectedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  countEl.textContent = visible.length ? `${visible.length} juegos` : '';

  const emptyMsg = 'No hay juegos con estos filtros.';
  syncContainer(dock, dockEls, buildDockIcon, updateDockIcon, emptyMsg);
  syncContainer(list, listEls, buildListRow, updateListRow, emptyMsg);

  refreshSelection();
}

function makePlaceholder(game) {
  const div = document.createElement('div');
  div.className = 'placeholder';
  const abbr = game.placeholderAbbr || PLAT_ABBR[game.platform] || '??';
  if (game.placeholderAbbr) div.classList.add('placeholder-retro');
  div.innerHTML = `<span class="plat-abbr">${escapeHtml(abbr)}</span><span class="plat-title">${escapeHtml(game.title)}</span>`;
  return div;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = bytes / 1024, i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val >= 100 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

// Envuelve la primera coincidencia de `term` dentro de `text` en un <mark>,
// para resaltar visualmente qué parte del título coincidió con la búsqueda.
function highlightMatch(text, term) {
  const s = String(text);
  if (!term) return escapeHtml(s);
  const idx = s.toLowerCase().indexOf(String(term).toLowerCase());
  if (idx === -1) return escapeHtml(s);
  return escapeHtml(s.slice(0, idx)) +
    '<mark class="search-hl">' + escapeHtml(s.slice(idx, idx + term.length)) + '</mark>' +
    escapeHtml(s.slice(idx + term.length));
}

function skeletonCardsHtml(count = 10) {
  return Array.from({ length: count },
    () => '<div class="skeleton-card"><div class="skeleton skeleton-cover"></div><div class="skeleton skeleton-title"></div></div>'
  ).join('');
}
function skeletonLinesHtml(widths = ['long', 'medium', 'short']) {
  return widths.map(w => `<span class="skeleton skeleton-line ${w}"></span>`).join('');
}

/* ================= Toasts ================= */

const toastContainer = document.getElementById('toast-container');
const TOAST_ICON = { success: 'check', error: 'warning', info: 'zap' };
function showToast(message, type = 'info', duration = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(TOAST_ICON[type] || 'zap')}<span class="toast-msg"></span>`;
  el.querySelector('.toast-msg').textContent = message;
  toastContainer.appendChild(el);
  const remove = () => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, duration);
}

/* ---- Portada compartida por los modos ---- */

// Renderiza SIEMPRE desde cero (usar solo cuando llega una portada nueva de
// verdad — build inicial o backfill —, nunca en cada render() de refresco).
function renderCoverInto(slot, game) {
  slot.innerHTML = '';
  slot.dataset.renderedFor = game.coverUrl || '';
  const trySrc = (src, isFallback) => {
    const img = document.createElement('img');
    const fail = () => {
      // Si el slot ya no contiene esta imagen (otro render la reemplazó
      // mientras esta seguía cargando), no pisar lo que haya ahora.
      if (!slot.contains(img)) return;
      const meta = metaById[game.id];
      const fallbackUrl = !isFallback && game.platform === 'steam' && meta && meta.headerImage && meta.headerImage !== src
        ? meta.headerImage : null;
      if (fallbackUrl) { game.lastTriedFallback = fallbackUrl; trySrc(fallbackUrl, true); return; }
      game.coverFailed = true;
      slot.innerHTML = '';
      slot.appendChild(makePlaceholder(game));
      retryCoverViaExternalFallback(game);
    };
    img.loading = 'lazy';
    img.onerror = fail;
    img.onload = () => {
      // Algunas CDNs (visto en Steam para lanzamientos muy nuevos) devuelven 200
      // con una imagen "no disponible" minúscula en vez de un 404 real.
      if (img.naturalWidth < 40 || img.naturalHeight < 40) fail();
    };
    // NOTA: se probó un timeout fijo acá como red de seguridad para portadas
    // que ni cargan ni fallan — se revirtió porque con una biblioteca grande
    // muchas imágenes en cola (límite de conexiones concurrentes del propio
    // navegador hacia el CDN de Steam, no un error real) tardan de sobra más
    // que cualquier timeout razonable, y terminaban reemplazadas por el
    // placeholder de golpe aunque la portada fuera perfectamente válida.
    img.src = src;
    slot.appendChild(img);
  };
  if (game.coverUrl) trySrc(game.coverUrl, false);
  else slot.appendChild(makePlaceholder(game));
}

// Usado en cada render(): evita recrear el <img> (y por tanto el parpadeo) si
// ya se está mostrando lo correcto; solo re-renderiza si hay algo nuevo que
// probar (portada distinta, o llegó un header_image de respaldo que aún no
// habíamos intentado tras un fallo previo).
function syncCoverSlot(slot, game) {
  const hasImg = !!slot.querySelector('img');
  const desired = game.coverUrl || '';
  if (hasImg && slot.dataset.renderedFor === desired) return;
  if (!game.coverUrl) {
    if (slot.querySelector('.placeholder')) {
      const label = slot.querySelector('.placeholder .plat-title');
      if (label) label.textContent = game.title;
      return;
    }
    renderCoverInto(slot, game);
    return;
  }
  if (game.coverFailed) {
    const meta = metaById[game.id];
    const hasNewFallback = game.platform === 'steam' && meta && meta.headerImage && meta.headerImage !== game.lastTriedFallback;
    if (!hasNewFallback) return; // ya falló y no hay nada nuevo que probar
  }
  renderCoverInto(slot, game);
}

/* ---- Modo Dock (estilo iPhone), vista principal ---- */

function buildDockIcon(game) {
  const wrap = document.createElement('div');
  wrap.dataset.platform = game.platform;
  wrap.dataset.id = game.id;

  const face = document.createElement('div');
  face.className = 'icon-face';
  wrap.appendChild(face);

  const label = document.createElement('div');
  label.className = 'icon-label';
  wrap.appendChild(label);

  wrap.addEventListener('click', () => selectById(game.id));
  wrap.addEventListener('dblclick', () => primaryAction());

  updateDockIcon(wrap, game);
  return wrap;
}

function updateDockIcon(wrap, game) {
  wrap.className = 'dock-icon' + (game.installed ? ' installed' : ' not-installed');
  const label = wrap.querySelector('.icon-label');
  if (label) label.innerHTML = highlightMatch(game.title, filters.search);
  syncCoverSlot(wrap.querySelector('.icon-face'), game);
}

/* ---- Modo Lista ---- */

function buildListRow(game) {
  const row = document.createElement('div');
  row.dataset.platform = game.platform;
  row.dataset.id = game.id;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  row.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = '<div class="row-title"></div><div class="row-meta"></div>';
  row.appendChild(info);

  const state = document.createElement('div');
  state.className = 'row-state';
  row.appendChild(state);

  row.addEventListener('click', () => selectById(game.id));
  row.addEventListener('dblclick', () => primaryAction());

  updateListRow(row, game);
  return row;
}

function updateListRow(row, game) {
  row.className = 'list-row' + (game.installed ? '' : ' not-installed');
  syncCoverSlot(row.querySelector('.thumb'), game);

  row.querySelector('.row-title').innerHTML = highlightMatch(game.title, filters.search);

  const meta = metaById[game.id];
  const bits = [`<span class="row-badge">${escapeHtml(PLAT_LABEL[game.platform] || game.platform)}</span>`];
  const genres = gameGenres(game);
  if (genres && genres.length) bits.push(`<span class="row-badge">${escapeHtml(genres[0])}</span>`);
  if (meta && meta.releaseDate) bits.push(`<span class="row-badge">${escapeHtml(meta.releaseDate)}</span>`);
  // Solo el valor ya conocido del scan (Steam/Epic/Battle.net/Ubisoft/EA/
  // Rockstar) — nunca se dispara el cálculo bajo demanda (GOG/Xbox) acá, para
  // no recorrer carpetas de decenas de juegos con cada render de la lista.
  if (game.installSizeBytes != null) bits.push(`<span class="row-badge">${formatBytes(game.installSizeBytes)}</span>`);
  row.querySelector('.row-meta').innerHTML = bits.join('');

  const state = row.querySelector('.row-state');
  state.textContent = game.installed ? '✔ Instalado' : '⬇ Biblioteca';
  state.className = 'row-state ' + (game.installed ? 'installed' : 'not-installed');
}

/* ---- Selección / navegación compartidas ---- */

function activeContainer() {
  return viewMode === 'dock' ? dock : list;
}
function activeChildren() {
  return [...activeContainer().children].filter(c => !c.classList.contains('empty'));
}

// Selección "confirmada" por click: además de mover el cursor, habilita el
// video (solo se muestra cuando el usuario clica de verdad, no al navegar).
function selectById(id) {
  const idx = visible.findIndex(g => g.id === id);
  if (idx !== -1) { selectedIndex = idx; videoAllowedFor = id; refreshSelection(); }
}

function refreshSelection() {
  [dock, list].forEach(container => {
    [...container.children].forEach((c, i) => {
      if (c.classList.contains('empty')) return;
      c.classList.toggle('selected', i === selectedIndex);
    });
  });
  const sel = activeChildren()[selectedIndex];
  if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  renderDetails(visible[selectedIndex] || null);
}

/* ================= Modo de vista ================= */

function applyViewMode() {
  dockWrap.hidden = viewMode !== 'dock';
  list.hidden = viewMode !== 'list';
  retroWrap.hidden = viewMode !== 'retro';
  achievementsWrap.hidden = viewMode !== 'achievements';
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewMode));
  updateSidebarMode();
  updateSearchContext();
}
// Pantalla de carga al cambiar de modo: PC y Retro quedan aislados del todo
// (input, navegación, panel de detalles), así que el cambio ya no es un
// simple toggle de "hidden" — se muestra una transición breve mientras un
// modo se apaga y el otro se prepara, para que quede claro que no están
// corriendo los dos a la vez.
const modeTransitionOverlay = document.getElementById('mode-transition-overlay');
const modeTransitionLabel = document.getElementById('mode-transition-label');
const modeTransitionIcon = document.getElementById('mode-transition-icon');
const MODE_TRANSITION_META = {
  dock: { label: 'PC', color: 'var(--accent)', icon: 'grid' },
  list: { label: 'PC', color: 'var(--accent)', icon: 'grid' },
  retro: { label: 'Modo Retro', color: 'var(--retro-accent)', icon: 'gamepad' },
  achievements: { label: 'Logros', color: 'var(--warn)', icon: 'trophy' },
};
function switchViewMode(nextMode) {
  if (nextMode === viewMode) return;
  const meta = MODE_TRANSITION_META[nextMode] || MODE_TRANSITION_META.dock;
  modeTransitionLabel.textContent = meta.label;
  modeTransitionIcon.innerHTML = icon(meta.icon);
  modeTransitionOverlay.style.setProperty('--mt-color', meta.color);
  modeTransitionOverlay.hidden = false;
  requestAnimationFrame(() => {
    setTimeout(() => {
      viewMode = nextMode;
      localStorage.setItem('megahub-view', viewMode);
      searchInput.value = '';
      applyViewMode();
      if (viewMode === 'retro') {
        // El panel de detalles es compartido visualmente con la biblioteca de
        // PC — sin este reset, seguía mostrando el último juego de PC
        // seleccionado mientras el usuario navega el modo retro (parecía que
        // "se quedó cargado"). Modo retro y modo PC son aislados: cada uno
        // entra con el panel de detalles vacío hasta que el usuario elija algo
        // dentro de ESE modo.
        renderDetails(null);
        initRetroView();
      } else if (viewMode === 'achievements') {
        renderDetails(null);
        initAchievementsView();
      } else {
        refreshSelection();
      }
      // El wipe + el pop del contenido duran ~600ms — se espera un poco más
      // de lo que tardaba el spinner viejo (220ms) para que la animación se
      // alcance a leer completa en vez de cortarse a medias.
      setTimeout(() => { modeTransitionOverlay.hidden = true; }, 480);
    }, 0);
  });
}
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchViewMode(btn.dataset.view);
  });
});
applyViewMode();
if (viewMode === 'retro') initRetroView();
if (viewMode === 'achievements') initAchievementsView();

// Biblioteca y modo retro son secciones separadas dentro del mismo hub: la barra
// lateral y el buscador cambian de contexto según dónde estés, en vez de ser
// filtros compartidos entre ambas.
function updateSidebarMode() {
  const mainSidebar = document.getElementById('sidebar');
  const retroSidebar = document.getElementById('retro-sidebar');
  const showRetro = viewMode === 'retro';
  // Logros es un dashboard a ancho completo, sin panel lateral de filtros.
  mainSidebar.hidden = showRetro || viewMode === 'achievements';
  retroSidebar.hidden = !showRetro;
  if (showRetro) {
    // Dentro de retro, el sidebar solo tiene sentido con una consola elegida:
    // mientras se está escogiendo consola, el panel de selección manda.
    document.getElementById('retro-sidebar-empty').hidden = !!currentConsole;
    document.getElementById('retro-sidebar-content').hidden = !currentConsole;
  }
}

function updateSearchContext() {
  if (viewMode === 'retro') {
    searchInput.placeholder = currentConsole ? 'Buscar en el catálogo…  ( / )' : 'Buscar consola…  ( / )';
  } else if (viewMode === 'achievements') {
    searchInput.placeholder = 'Logros — usa las pestañas de abajo';
  } else {
    searchInput.placeholder = 'Buscar juego…  ( / )';
  }
}

/* ---- Colapsar/expandir sidebar ---- */
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

/* ---- Titlebar propia (frame:false en main.js) ---- */
(function initTitlebar() {
  const maxBtn = document.getElementById('tb-max');
  function setMaximizedIcon(isMaximized) {
    maxBtn.innerHTML = icon(isMaximized ? 'winRestore' : 'winMax');
    maxBtn.title = isMaximized ? 'Restaurar' : 'Maximizar';
  }
  document.getElementById('tb-min').addEventListener('click', () => window.megahub.winMinimize());
  maxBtn.addEventListener('click', async () => setMaximizedIcon(await window.megahub.winMaximizeToggle()));
  document.getElementById('tb-close').addEventListener('click', () => window.megahub.winClose());
  document.getElementById('titlebar-drag').addEventListener('dblclick', async () => setMaximizedIcon(await window.megahub.winMaximizeToggle()));
  window.megahub.winIsMaximized().then(setMaximizedIcon);
  window.megahub.onWindowMaximizedChange(setMaximizedIcon);
})();

/* ---- Pill "DERIVA Companion" (estado + mini-control de radio) ----
   Opcional y no intrusivo: si Companion no está instalado o no está
   corriendo, companion-get-status siempre devuelve { connected: false } y
   la pill se queda oculta — cero elementos rotos ni mensajes de error. */
(function initCompanionPill() {
  // Se repite una vez por sidebar (PC + Retro, mismo criterio que #logo
  // duplicado) — todas se mantienen en el mismo estado a la vez.
  const pills = [...document.querySelectorAll('.companion-pill')];
  if (!pills.length) return;

  function paint(pill, state, text, radio) {
    pill.hidden = false;
    pill.dataset.state = state;
    const textEl = pill.querySelector('.companion-pill-text');
    if (textEl) textEl.textContent = text;

    // Panel ampliado (calco de companion-desktop/radio.html): carátula,
    // género, título/artista, ícono de play, like, guardar y volumen.
    const coverImg = pill.querySelector('.cpx-cover-img');
    const coverFallback = pill.querySelector('.cpx-cover-fallback');
    if (coverImg && coverFallback) {
      if (radio?.cover) { coverImg.src = radio.cover; coverImg.hidden = false; coverFallback.hidden = true; }
      else { coverImg.hidden = true; coverFallback.hidden = false; }
    }
    const genreEl = pill.querySelector('.cpx-genre');
    if (genreEl) genreEl.textContent = radio?.genreLabel ? `Radio ${radio.genreLabel}` : 'Radio';
    const titleEl = pill.querySelector('.cpx-title');
    if (titleEl) titleEl.textContent = radio?.title || 'Pulsa play para sintonizar';
    const artistEl = pill.querySelector('.cpx-artist');
    if (artistEl) artistEl.textContent = radio?.artist || '';
    const playIco = pill.querySelector('.cpx-play-ico');
    if (playIco) playIco.innerHTML = radio?.playing ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    const likeBtn = pill.querySelector('.cpx-like');
    if (likeBtn) { likeBtn.classList.toggle('cpx-active', !!radio?.liked); likeBtn.textContent = radio?.liked ? '♥' : '♡'; }
    const saveBtn = pill.querySelector('.cpx-save');
    if (saveBtn) saveBtn.disabled = !radio?.canSave;
    const volumeEl = pill.querySelector('.cpx-volume');
    // No pisar el valor mientras el usuario lo está arrastrando (ver el
    // listener 'input' de abajo) — si no, el próximo poll (cada 5s) le
    // devuelve el valor viejo a mitad de un drag.
    if (volumeEl && volumeEl.dataset.dragging !== '1') {
      const v = radio?.muted ? 0 : (radio?.volume ?? 70);
      volumeEl.value = v;
      volumeEl.style.setProperty('--p', v + '%');
    }
  }

  async function poll() {
    let status;
    try { status = await window.megahub.companionGetStatus(); }
    catch { status = { connected: false, radio: null }; }

    if (!status.connected) {
      // Antes de tener NUNCA una conexión confirmada, se queda oculta del
      // todo (no todos los usuarios tienen/quieren el Companion) — una vez
      // que se vio conectado una vez en esta sesión, se muestra "desconectado"
      // en vez de desaparecer, para que no parezca un parpadeo raro de la UI.
      for (const pill of pills) {
        if (pill.dataset.everConnected === '1') paint(pill, 'off', 'DERIVA Companion · desconectado', null);
      }
      return;
    }
    for (const pill of pills) {
      pill.dataset.everConnected = '1';
      if (status.radio?.playing && status.radio.title) {
        const text = status.radio.artist ? `🎧 ${status.radio.title} — ${status.radio.artist}` : `🎧 ${status.radio.title}`;
        paint(pill, 'playing', text, status.radio);
      } else {
        paint(pill, 'connected', 'DERIVA Companion · conectado', status.radio);
      }
    }
  }

  for (const pill of pills) {
    pill.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.megahub.companionSendCommand(btn.dataset.cmd);
      });
    });
    const volumeEl = pill.querySelector('.cpx-volume');
    if (volumeEl) {
      // 'input' dispara en cada tick del arrastre — se actualiza el relleno
      // visual (--p) al instante, pero el comando real se manda solo en
      // 'change' (al soltar) para no saturar el archivo puente.
      volumeEl.addEventListener('input', () => {
        volumeEl.dataset.dragging = '1';
        volumeEl.style.setProperty('--p', volumeEl.value + '%');
      });
      volumeEl.addEventListener('change', () => {
        window.megahub.companionSendCommand('volume', Number(volumeEl.value));
        volumeEl.dataset.dragging = '0';
      });
    }

    // El panel es position:fixed (ver app.css) para no quedar recortado por
    // el overflow-y:auto del sidebar — hay que calcularle top/left/width a
    // mano, y voltearlo arriba de la pill si no entra abajo (ventana baja).
    const expand = pill.querySelector('.companion-pill-expand');
    if (expand) {
      const positionExpand = () => {
        const rect = pill.getBoundingClientRect();
        // Pegado (0px de separación, no +4): un hueco entre la pill y el
        // panel es una "zona muerta" de hover — al cruzarla con el mouse
        // hacia abajo, el cursor pasa un instante sobre NADA, :hover se
        // rompe, y el panel (pointer-events:none fuera de :hover) ya no
        // puede recapturarlo aunque el cursor termine encima. El espacio
        // visual lo da el propio borde/sombra del panel, no un gap real.
        // Ancho mínimo 220px: si la pill de origen es angosta (sidebar
        // colapsado/estrecho), el contenido del panel (sobre todo el botón
        // "Guardar en Mi lista") necesita más espacio del que la propia pill
        // tiene — copiar su ancho tal cual lo hacía overflow visualmente.
        const width = Math.max(Math.round(rect.width), 220);
        let left = Math.round(rect.left);
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
        expand.style.left = `${left}px`;
        expand.style.width = `${width}px`;
        expand.style.top = `${Math.round(rect.bottom)}px`;
        expand.classList.remove('cpx-flip-up');
        // visibility:hidden (no display:none) ya deja medir la altura real
        // sin tener que mostrarlo primero.
        const needed = expand.offsetHeight;
        if (rect.bottom + needed > window.innerHeight) {
          expand.style.top = `${Math.round(rect.top - needed)}px`;
          expand.classList.add('cpx-flip-up');
        }
      };
      pill.addEventListener('mouseenter', positionExpand);
      pill.addEventListener('focusin', positionExpand);
      window.addEventListener('resize', () => { if (pill.matches(':hover, :focus-within')) positionExpand(); });
    }
  }

  poll();
  setInterval(poll, 5000);
})();

/* ================= Vista Retro (consolas + catálogo) ================= */

function normalizeRetroTitle(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function ownedGamesForConsole(consoleInfo) {
  return allGames.filter(g => g.platform === 'retroarch' && g.system && g.system.replace(/ /g, '_') === consoleInfo.repo);
}

// Playlists de RetroArch (ya cotejadas, con título) + archivos sueltos en
// roms/<consola>/ (sin cotejar todavía, pero cuentan igual como "tenés algo
// acá") — las dos fuentes reales de "obtenido" a nivel grilla.
function combinedOwnedCount(consoleInfo) {
  return ownedGamesForConsole(consoleInfo).length + (localRomCounts[consoleInfo.id] || 0);
}

async function loadLocalRomCounts() {
  try { localRomCounts = await window.megahub.retroGetLocalRomCounts(CONSOLE_REGISTRY.map(c => c.id)); }
  catch { localRomCounts = {}; }
}

async function initRetroView() {
  // Se recarga cada vez que se entra al modo retro (no solo la primera vez):
  // el usuario pudo haber agregado ROMs a mano mientras la app seguía abierta.
  await loadLocalRomCounts();
  if (!retroGridBuilt) {
    retroGridBuilt = true;
    buildConsoleGrid();
  } else if (retroConsoleSortMode === 'owned') {
    applyConsoleSort();
  } else {
    refreshConsoleOwnedCounts();
  }
}

document.querySelectorAll('#retro-console-sort .chip').forEach(c => c.classList.toggle('active', c.dataset.consort === retroConsoleSortMode));

function buildConsoleGrid() {
  consoleCardEls.clear();
  for (const c of CONSOLE_REGISTRY) {
    const card = document.createElement('div');
    card.className = 'console-card';
    card.dataset.consoleId = c.id;
    card.innerHTML = `
      <div class="console-photo-box loading">
        <span class="console-year-badge">${c.year}</span>
      </div>
      <div class="console-card-body">
        <div class="console-card-name">${escapeHtml(c.name)}</div>
        <div class="console-card-gen">${escapeHtml(c.gen)}</div>
        <div class="console-card-owned">—</div>
      </div>
    `;
    card.addEventListener('click', () => openConsoleDetail(c));
    consoleCardEls.set(c.id, card);
  }
  applyConsoleSort();
  loadConsolePhotos(CONSOLE_REGISTRY);
}

// Orden por generación: agrupa por `gen` ordenando los grupos por el año más
// temprano de cada uno (no por el orden de aparición en el registro, que
// intercala generaciones a propósito para que la grilla por año quede
// cronológica de verdad).
function sortedConsoleList() {
  if (retroConsoleSortMode === 'owned') {
    return [...CONSOLE_REGISTRY].sort((a, b) => {
      const diff = combinedOwnedCount(b) - combinedOwnedCount(a);
      return diff !== 0 ? diff : a.year - b.year;
    });
  }
  if (retroConsoleSortMode === 'gen') {
    const genMinYear = new Map();
    for (const c of CONSOLE_REGISTRY) {
      if (!genMinYear.has(c.gen) || c.year < genMinYear.get(c.gen)) genMinYear.set(c.gen, c.year);
    }
    return [...CONSOLE_REGISTRY].sort((a, b) => {
      const diff = genMinYear.get(a.gen) - genMinYear.get(b.gen);
      return diff !== 0 ? diff : a.year - b.year;
    });
  }
  return [...CONSOLE_REGISTRY].sort((a, b) => a.year - b.year);
}

function applyConsoleSort() {
  const sorted = sortedConsoleList();
  retroConsoleGrid.querySelectorAll('.console-gen-header').forEach(h => h.remove());
  let lastGen = null;
  sorted.forEach(c => {
    if (retroConsoleSortMode === 'gen' && c.gen !== lastGen) {
      lastGen = c.gen;
      const header = document.createElement('div');
      header.className = 'console-gen-header';
      header.textContent = c.gen;
      retroConsoleGrid.appendChild(header);
    }
    const el = consoleCardEls.get(c.id);
    if (el) retroConsoleGrid.appendChild(el);
  });
  refreshConsoleOwnedCounts();
}

document.getElementById('retro-console-sort').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-consort]');
  if (!btn) return;
  retroConsoleSortMode = btn.dataset.consort;
  localStorage.setItem('megahub-retro-console-sort', retroConsoleSortMode);
  document.querySelectorAll('#retro-console-sort .chip').forEach(c => c.classList.toggle('active', c === btn));
  retroConsoleSelectedIndex = -1;
  applyConsoleSort();
});

function refreshConsoleOwnedCounts() {
  for (const card of retroConsoleGrid.querySelectorAll('.console-card')) {
    const c = CONSOLE_REGISTRY.find(x => x.id === card.dataset.consoleId);
    if (!c) continue;
    const retroCount = ownedGamesForConsole(c).length;
    const localCount = localRomCounts[c.id] || 0;
    const el = card.querySelector('.console-card-owned');
    let text;
    if (retroCount && localCount) text = `${retroCount} en tu RetroArch + ${localCount} en tu carpeta`;
    else if (retroCount) text = `${retroCount} en tu RetroArch`;
    else if (localCount) text = `${localCount} archivo${localCount === 1 ? '' : 's'} en tu carpeta`;
    else text = 'Ninguno detectado';
    el.textContent = text;
    el.classList.toggle('none', !retroCount && !localCount);
  }
}

// Navegación con teclado/mando DENTRO del modo retro — antes no existía nada
// de esto, así que el teclado/mando seguía moviendo la biblioteca de PC (oculta
// detrás) en vez del modo retro. Aislado del todo: cada modo solo reacciona a
// su propio input.
function moveRetroConsoleGrid(delta) {
  const cards = [...retroConsoleGrid.querySelectorAll('.console-card')];
  if (!cards.length) return;
  const next = Math.max(0, Math.min(cards.length - 1, retroConsoleSelectedIndex + delta));
  if (next === retroConsoleSelectedIndex) return;
  retroConsoleSelectedIndex = next;
  cards.forEach((c, i) => c.classList.toggle('selected', i === next));
  cards[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}
function moveRetroGameGrid(delta) {
  if (!retroFilteredCatalog.length) return;
  const next = Math.max(0, Math.min(retroFilteredCatalog.length - 1, retroSelectedIndex + delta));
  if (next === retroSelectedIndex) return;
  retroSelectedIndex = next;
  updateRetroSelectionStyles();
  const card = retroGameGrid.children[next];
  if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  renderRetroGameDetails(retroFilteredCatalog[next]);
}
// dx/dy tratados como un único delta lineal, igual que move() en la biblioteca
// de PC — el grid no tiene una cuadrícula de columnas fija que trackear.
function moveRetro(dx, dy) {
  const delta = dx || dy;
  if (!delta) return;
  if (!currentConsole) moveRetroConsoleGrid(delta);
  else moveRetroGameGrid(delta);
}
function retroPrimaryAction() {
  if (!currentConsole) {
    const card = retroConsoleGrid.querySelectorAll('.console-card')[retroConsoleSelectedIndex];
    if (card) openConsoleDetail(CONSOLE_REGISTRY.find(c => c.id === card.dataset.consoleId));
    return;
  }
  const entry = retroFilteredCatalog[retroSelectedIndex];
  if (!entry) return;
  if (entry.owned && entry.ownedGame) launchGame(entry.ownedGame);
  else if (entry.owned && entry.romPath) launchLocalRom(entry);
}

// Hash simple y estable del id de consola -> matiz de color (0-360), para que
// el badge de respaldo (sin logo encontrado) tenga un color consistente y
// distinto por consola en vez de que todas se vean iguales.
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function consoleMonogram(name) {
  const words = name.replace(/[()]/g, '').split(/[\s/]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Oscurece un color bajando su luminosidad PERCIBIDA una cantidad fija, no
// mezclando con negro por porcentaje: verificado con luminancia real (fórmula
// BT.709) que color-mix a un % fijo daba MUCHO menos contraste en azules que
// en verdes (el canal verde pesa 0.7152 en luminancia, el azul solo 0.0722)
// — el aro de las consolas PlayStation (azul) se veía "liso" por esto, no
// por un bug de estructura. Trabajando en HSL con L absoluto en vez de RGB
// mezclado, el contraste queda parejo sin importar el matiz.
function darkenForContrast(hex, lightnessDrop) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const newL = Math.max(0.08, l - lightnessDrop);
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(newL * 100)}%)`;
}

// rgba() fijo (no color-mix()) para el glow animado del ícono: el navegador
// no interpola bien un color-mix() dentro de un @keyframes (compara los dos
// filtros como valores discretos y salta entre ellos en vez de transicionar),
// lo que se sentía como un parpadeo en vez de una respiración suave. Se
// normaliza vía canvas (no un parseo manual de hex) porque getConsoleColor
// también devuelve hsl(...) para el respaldo por hash.
let _colorCanvasCtx = null;
function colorToRgba(color, alpha) {
  if (!_colorCanvasCtx) _colorCanvasCtx = document.createElement('canvas').getContext('2d');
  _colorCanvasCtx.fillStyle = '#000';
  _colorCanvasCtx.fillStyle = color;
  const norm = _colorCanvasCtx.fillStyle;
  let r = 0, g = 0, b = 0;
  if (norm[0] === '#') {
    r = parseInt(norm.slice(1, 3), 16); g = parseInt(norm.slice(3, 5), 16); b = parseInt(norm.slice(5, 7), 16);
  } else {
    const m = norm.match(/rgba?\(([^)]+)\)/);
    if (m) [r, g, b] = m[1].split(',').map((s) => parseFloat(s));
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Botón real (letra + color) del control de cada consola — curado a mano
// por las que recuerdo con confianza razonable a partir de su control real
// (no el logo de la marca: la letra/símbolo de UN botón físico y su color de
// verdad). Las que no aparecen acá caen a la inicial del nombre + color por
// hash en vez de que se invente un dato sin verificar.
const CONSOLE_REAL_BUTTON = {
  atari2600: { letter: '●', color: '#c0392b' },       // único botón de fuego del joystick, sin letra
  arcade: { letter: '1', color: '#d8d8d8' },          // botón de inicio "1P" típico, blanco/plata
  nes: { letter: 'A', color: '#3a3a3a' },
  sms: { letter: '1', color: '#3a3a3a' },             // botones literalmente rotulados "1"/"2"
  pcengine: { letter: 'I', color: '#b0303a' },        // botones rotulados "I"/"II", rojos
  genesis: { letter: 'A', color: '#222222', shape: 'oval' }, // botones ovalados/alargados reales, no redondos
  gb: { letter: 'A', color: '#7a2f3a' },
  snes: { letter: 'A', color: '#8a6fb5' },
  gamegear: { letter: '1', color: '#333333' },
  neogeo: { letter: 'A', color: '#222222' },
  segacd: { letter: 'A', color: '#222222', shape: 'oval' }, // mismo control que Genesis
  psx: { letter: '×', color: '#3b6fd1' },
  saturn: { letter: 'A', color: '#5a5a5a' },
  n64: { letter: 'A', color: '#2f8a4b' },
  gbc: { letter: 'A', color: '#5a4f70' },
  dreamcast: { letter: 'A', color: '#8a8a92' },
  naomi: { letter: '1', color: '#c0392b' },
  ps2: { letter: '×', color: '#3b6fd1' },
  gba: { letter: 'A', color: '#5a4f8a' },
  gamecube: { letter: 'A', color: '#3fae55' },
  xbox: { letter: 'A', color: '#3fae4a' },
  nds: { letter: 'A', color: '#8a8a92' },
  psp: { letter: '×', color: '#3b6fd1' },
  xbox360: { letter: 'A', color: '#3fae4a' },
  ps3: { letter: '×', color: '#3b6fd1' },
  wii: { letter: 'A', color: '#c9cdd6' },
  intellivision: { letter: '●', color: '#c0392b' },   // botones de acción laterales, sin letra
  atari7800: { letter: '●', color: '#c0392b' },
  atarijaguar: { letter: 'A', color: '#c0392b' },
  virtualboy: { letter: 'A', color: '#c0392b' },
  // Investigados y confirmados a pedido explícito (antes caían al color por
  // hash): 3DO tiene botones A/B/C color crema/beige de verdad (confirmado
  // por foto real del control Panasonic), Atari 5200 rojo/naranja,
  // ColecoVision gris, Vectrex negro, Atari Lynx negro (no rojo como el
  // resto de la familia Atari — verificado, es la excepción), Nintendo 3DS
  // gris (sin colorear, a diferencia de otros ABXY de la casa).
  threedo: { color: '#d9c8a3' },
  atari5200: { color: '#c0392b' },
  colecovision: { color: '#5a5a5a' },
  vectrex: { color: '#2a2a2a' },
  atarilynx: { color: '#2a2a2a' },
  n3ds: { color: '#8a8a92' },
};

// Color de identidad de una consola: el real de su botón donde se conoce
// (CONSOLE_REAL_BUTTON), o uno estable por hash del id como respaldo — misma
// fuente de verdad para el botón 3D y para teñir el ícono de silueta.
function getConsoleColor(consoleInfo) {
  const real = CONSOLE_REAL_BUTTON[consoleInfo.id];
  if (real) return { base: real.color, dark: darkenForContrast(real.color, 0.3) };
  const hue = hueFromString(consoleInfo.id);
  return { base: `hsl(${hue} 55% 46%)`, dark: `hsl(${hue} 60% 22%)` };
}

// Botón de consola en 3D con el color real del botón de su propio control —
// reemplaza el logo oficial de cada marca (ver investigación de copyright en
// textureDownload.js/consolePhotos.js, eliminado) por un elemento de UI
// propio: aro biselado + plato cóncavo con brillo real + anillo LED.
function renderConsoleFallbackBadge(box, consoleInfo) {
  const { base, dark } = getConsoleColor(consoleInfo);
  const real = CONSOLE_REAL_BUTTON[consoleInfo.id];
  box.style.background = '';
  // Variación real de forma (óvalo donde de verdad se sabe, ver arriba) y de
  // "época" (más chato/anguloso en la era de joystick, más curvo/glossy en
  // la moderna) — para que no todas las consolas usen el mismo molde, sin
  // inventar una forma específica que no se conoce con certeza.
  const shapeClass = real && real.shape === 'oval' ? ' console-btn--oval' : '';
  const eraClass = /2ª generación|Recreativas|8 bits/.test(consoleInfo.gen) ? ' console-btn--retro'
    : /6ª generación|7ª generación/.test(consoleInfo.gen) ? ' console-btn--modern' : '';
  const wrap = document.createElement('div');
  wrap.className = 'console-btn-wrap';
  wrap.innerHTML = `
    <button class="console-btn${shapeClass}${eraClass}" type="button" tabindex="-1" style="--base:${base};--dark:${dark};--glow:${base}">
      <div class="console-btn-dish"></div>
    </button>`;
  box.prepend(wrap);
}

// Antes esto bajaba/bundleaba el logo OFICIAL de cada marca (Nintendo, Sega,
// Sony, Microsoft...) desde Wikipedia/Commons — esos logos son marcas
// registradas; Wikipedia puede alojarlos bajo su propia excepción de "fair
// use" para el artículo QUE HABLA de la consola, pero esa excepción no cubre
// que MegaHUB los redistribuya como decoración de su propia interfaz.
//
// Reemplazado por los íconos del propio proyecto RetroArch/libretro
// (retroarch-assets, tema "XMB Monochrome" de Kivutar — CC BY 4.0, ver
// ui/console-icons/CREDITS.txt) — diseñados A PROPÓSITO como siluetas
// monocromas genéricas, no logos de marca, exactamente para este mismo uso.
// Solo 38 de las 39 consolas tienen ícono en ese set (falta NAOMI/Atomiswave)
// — esa cae al botón 3D genérico en vez de inventar un ícono que no existe.
function tryLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ids con ícono real ya confirmado (se llena en loadConsolePhotos) — así
// openConsoleDetail/el sidebar pueden reusar el mismo ícono teñido sin
// tener que volver a probar la carga de la imagen.
const consoleIconLoaded = new Set();

function consoleIconHtml(consoleInfo) {
  if (!consoleIconLoaded.has(consoleInfo.id)) return null;
  const { base } = getConsoleColor(consoleInfo);
  // Anillo medio a partir del propio color de la consola (no blanco fijo):
  // en consolas claras (ej. Wii, #c9cdd6) un anillo blanco se perdía contra
  // el propio ícono, casi igual de claro — con un tono más oscuro del mismo
  // color siempre queda un salto de luminosidad hacia el ícono Y hacia el
  // anillo negro exterior, sea cual sea el color base.
  const ring = darkenForContrast(base, 0.18);
  const url = `url('console-icons/${consoleInfo.id}.png')`;
  // Glow bajo/alto precalculados como rgba() fijo (no color-mix() animado en
  // CSS, ver colorToRgba) para que el @keyframes interpole de verdad y se
  // sienta como una respiración continua, no un parpadeo entre dos estados.
  const glowLow = colorToRgba(base, 0.32);
  const glowHigh = colorToRgba(base, 0.62);
  // Contorno tipo sticker (negro afuera + tono propio adentro) hecho con 2
  // capas más escaladas de la misma silueta, NO con drop-shadow apilado — 16
  // drop-shadow por ícono (probado antes) volvía la grilla de 39 consolas
  // extremadamente lenta. 3 divs enmascarados es una composición normal,
  // sin el costo de recalcular un filtro de sombra 16 veces por elemento.
  // El halo de color (glow) va en el wrapper, un solo drop-shadow barato.
  return `<div class="console-icon-stack" style="--icon-color:${base};--glow-low:${glowLow};--glow-high:${glowHigh}">
    <div class="console-icon-outline console-icon-outline--dark" style="--icon-url:${url}"></div>
    <div class="console-icon-outline console-icon-outline--light" style="--icon-url:${url};--ring-color:${ring}"></div>
    <div class="console-icon-mask" style="--icon-url:${url};--icon-color:${base}"></div>
  </div>`;
}

async function loadConsolePhotos(list) {
  for (const c of list) {
    const card = retroConsoleGrid.querySelector(`.console-card[data-console-id="${c.id}"]`);
    if (!card) continue;
    const box = card.querySelector('.console-photo-box');
    box.classList.remove('loading');
    const url = await tryLoadImage(`console-icons/${c.id}.png`);
    if (url) {
      consoleIconLoaded.add(c.id);
      box.insertAdjacentHTML('afterbegin', consoleIconHtml(c));
    } else {
      renderConsoleFallbackBadge(box, c);
    }
  }
}

async function openConsoleDetail(consoleInfo) {
  currentConsole = consoleInfo;
  retroConsoleView.hidden = true;
  retroDetailView.hidden = false;
  retroDetailName.textContent = consoleInfo.name;
  retroDetailMeta.innerHTML = `<span>${consoleInfo.year}</span><span>${escapeHtml(consoleInfo.gen)}</span><span id="retro-detail-owned-badge" class="skeleton skeleton-pill" style="width:150px;height:18px;"></span>`;
  const iconHtml = consoleIconHtml(consoleInfo) || '';
  retroDetailPhoto.innerHTML = iconHtml;

  // Sidebar de modo retro: info de consola + emulador + carpetas.
  document.getElementById('retro-sidebar-console-info').innerHTML = `
    ${iconHtml}
    <div>
      <div class="rsci-name">${escapeHtml(consoleInfo.name)}</div>
      <div class="rsci-meta">${consoleInfo.year} · ${escapeHtml(consoleInfo.gen)}</div>
    </div>
  `;
  document.getElementById('retro-download-link').href = consoleInfo.emulatorUrl;
  document.getElementById('retro-rom-scan-status').textContent = '';

  updateStandaloneEmulatorControls(consoleInfo);
  updateRetroArchControls(consoleInfo);
  updateRomLocationControls(consoleInfo);
  updateResolutionPresetControls(consoleInfo);
  updateMultiplayerControls(consoleInfo);

  searchInput.value = '';
  retroSearchTerm = '';
  retroOwnedFilterMode = 'all';
  document.querySelectorAll('#retro-owned-filter .chip').forEach(c => c.classList.toggle('active', c.dataset.owned === 'all'));
  retroGameEls.clear(); // los títulos solo son únicos dentro del catálogo de esta consola
  retroGameGrid.innerHTML = skeletonCardsHtml(12);
  retroGameGrid.style.removeProperty('--cover-aspect'); // vuelve al 2/3 por defecto hasta medir esta consola
  retroGameGrid.style.setProperty('--ph-hue', hueFromString(consoleInfo.id));
  retroSelectedIndex = -1;
  updateSidebarMode();
  updateSearchContext();

  const result = await window.megahub.getRetroCatalog(consoleInfo.repo);
  if (currentConsole !== consoleInfo) return; // el usuario ya cambió de consola

  if (result.error) {
    // Distinto de un catálogo genuinamente vacío: acá la petición al repo de
    // portadas falló de verdad (repo renombrado, sin conexión, rate-limit) —
    // antes esto quedaba indistinguible de "sin resultados" y encima podía
    // dejar el resto del panel a medio cargar si algo más asumía un array.
    retroCatalog = [];
    showToast(`No se pudo cargar el catálogo de ${consoleInfo.name}: ${result.error}`, 'error');
    retroGameEls.clear();
    retroGameGrid.innerHTML = '<div class="empty">No se pudo cargar el catálogo de portadas — revisa tu conexión e intenta entrar de nuevo a esta consola.</div>';
    refreshRetroOwnedBadge();
    return;
  }

  const catalog = result.catalog;
  const owned = ownedGamesForConsole(consoleInfo);
  const ownedByNorm = new Map(owned.map(g => [normalizeRetroTitle(g.title), g]));
  // placeholderAbbr: cuando el catálogo no trae portada (o falla al cargar),
  // makePlaceholder() cae a PLAT_ABBR[game.platform] — estas entradas no
  // tienen `platform`, así que sin esto mostraban un genérico "??" en vez de
  // algo reconocible de la consola actual.
  const placeholderAbbr = consoleMonogram(consoleInfo.name);
  retroCatalog = catalog.map(entry => {
    const match = ownedByNorm.get(normalizeRetroTitle(entry.title));
    return { ...entry, owned: !!match, ownedGame: match || null, placeholderAbbr };
  });
  refreshRetroOwnedBadge();
  applyRetroFilters();
  scanLocalRoms(consoleInfo);
  detectCoverAspect(consoleInfo, retroCatalog);
}

// Cada consola tiene su propia proporción "típica" de carátula (portada
// vertical tipo caja moderna, cuadrada en algunas retro, panorámica en
// flyers de arcade...). En vez de mantener una tabla manual por sistema
// (36 consolas, se desactualiza fácil), se mide en vivo: se cargan unas
// pocas portadas reales del catálogo y se usa la proporción más común entre
// ellas — así toda la biblioteca de ESA consola queda uniforme entre sí, sin
// asumir nada de antemano.
async function detectCoverAspect(consoleInfo, catalog) {
  const samples = catalog.filter(e => e.coverUrl).slice(0, 8);
  if (samples.length < 3) return; // muy pocas para que la muestra signifique algo
  const ratios = await Promise.all(samples.map(entry => new Promise(resolve => {
    const img = new Image();
    const done = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
    img.onload = done;
    img.onerror = () => resolve(null);
    img.src = entry.coverUrl;
  })));
  if (currentConsole !== consoleInfo) return; // cambió de consola mientras medíamos
  const valid = ratios.filter(Boolean).sort((a, b) => a - b);
  if (valid.length < 3) return;
  const median = valid[Math.floor(valid.length / 2)];
  // Clamp razonable: nunca más angosto que una tapa de cartucho ni más ancho
  // que un flyer de arcade panorámico, para que un outlier no deforme la grilla entera.
  const clamped = Math.min(2.2, Math.max(0.55, median));
  retroGameGrid.style.setProperty('--cover-aspect', clamped.toFixed(3));
}

// Para las 3 consolas con emulador standalone descargable (Xemu/PCSX2/Xenia,
// todas builds portables sin instalador): en vez de solo dejar el enlace a la
// web oficial, MegaHUB puede bajar + descomprimir + dejar el ejecutable listo
// dentro de emulators/<consola>/ él mismo, y detecta si ya está ahí — así el
// usuario no tiene que ir manualmente emulador por emulador (como un gestor
// de mods tipo Vortex, pero para emuladores).
async function updateStandaloneEmulatorControls(consoleInfo) {
  const downloadLink = document.getElementById('retro-download-link');
  const autoBtn = document.getElementById('retro-auto-download-btn');
  const locateBtn = document.getElementById('retro-locate-emulator-btn');
  const openBtn = document.getElementById('retro-open-standalone-btn');
  const statusEl = document.getElementById('retro-auto-download-status');

  // "downloadable" = tiene fuente automática (Xemu/PCSX2/Xenia/RPCS3).
  // "locatable" = no tiene descarga automática (ej. Dolphin, bloqueado por un
  // challenge anti-bot en su web oficial) pero SÍ se puede detectar si el
  // usuario ya lo instaló él mismo y señalar la carpeta con el "ubicador".
  if (!consoleInfo.downloadable && !consoleInfo.locatable) {
    autoBtn.hidden = true;
    locateBtn.hidden = true;
    openBtn.hidden = true;
    statusEl.textContent = '';
    return;
  }

  downloadLink.hidden = false;
  autoBtn.hidden = true;
  locateBtn.hidden = true;
  openBtn.hidden = true;
  autoBtn.disabled = false;
  autoBtn.querySelector('span').textContent = 'Descargar e instalar automáticamente (con tu confirmación)';
  statusEl.textContent = 'Comprobando si ya está instalado…';

  const status = await window.megahub.retroGetEmulatorStatus({ id: consoleInfo.id, name: consoleInfo.name, emulator: consoleInfo.emulator });
  if (currentConsole !== consoleInfo) return;

  if (status && status.installed) {
    // Ya sea porque MegaHUB lo descargó o porque el usuario ubicó su propia
    // carpeta: el enlace/descarga ya son redundantes.
    downloadLink.hidden = true;
    openBtn.hidden = false;
    const locations = await window.megahub.retroGetLocations(consoleInfo.id);
    if (currentConsole !== consoleInfo) return;
    statusEl.innerHTML = `${escapeHtml(consoleInfo.emulator)} ya está instalado en <code>${escapeHtml(status.emuDir)}</code>.` +
      (locations.customEmu ? ` <a href="#" id="retro-clear-emu-loc">Olvidar esta ubicación</a>` : '');
    const clearLink = document.getElementById('retro-clear-emu-loc');
    if (clearLink) {
      clearLink.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.megahub.retroClearEmulatorLocation(consoleInfo.id);
        updateStandaloneEmulatorControls(consoleInfo);
      });
    }
  } else {
    // Sin fuente de descarga automática (Dolphin), solo se ofrece ubicar.
    autoBtn.hidden = !consoleInfo.downloadable;
    locateBtn.hidden = false;
    statusEl.textContent = '';
  }
}

// Presets de resolución/rendimiento (Por defecto/1080p/2K/4K): para los
// emuladores standalone (ver resolutionPresets.js SUPPORTED) siempre hay un
// ajuste real de resolución interna que tocar. Para los cores de RetroArch se
// muestra en TODOS (para que sea "para todos los emuladores" como pidió el
// usuario), pero el backend responde con result.info=true y una explicación
// en vez de aplicar nada cuando el sistema es 2D pixel-exacto y no tiene
// ninguna "resolución interna" real que escalar (ver RETROARCH_CORE_FOLDER
// en resolutionPresets.js para la lista de los que sí la tienen).
const RESOLUTION_PRESET_STANDALONE = ['ps2', 'ps3', 'xbox', 'xbox360', 'gamecube', 'wii'];

async function updateResolutionPresetControls(consoleInfo) {
  const section = document.getElementById('retro-resolution-section');
  const statusEl = document.getElementById('retro-resolution-status');
  const usesRetroArch = consoleInfo.emulator.includes('core RetroArch');
  if (!RESOLUTION_PRESET_STANDALONE.includes(consoleInfo.id) && !usesRetroArch) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  statusEl.textContent = 'Elige el nivel de calidad/rendimiento para ' + consoleInfo.emulator + '.';
}

document.getElementById('retro-resolution-presets').addEventListener('click', async (e) => {
  const btn = e.target.closest('.chip[data-tier]');
  if (!btn || !currentConsole) return;
  const statusEl = document.getElementById('retro-resolution-status');
  const chips = document.querySelectorAll('#retro-resolution-presets .chip');
  chips.forEach(c => c.disabled = true);
  statusEl.textContent = 'Aplicando…';
  const result = await window.megahub.retroApplyResolutionPreset({ id: currentConsole.id, tier: btn.dataset.tier });
  chips.forEach(c => c.disabled = false);
  chips.forEach(c => c.classList.toggle('active', c === btn));
  statusEl.textContent = result && result.error ? 'Error: ' + result.error : (result && result.message) || '';
  if (result && result.error) showToast('Error aplicando preset: ' + result.error, 'error');
  else if (!(result && result.info)) showToast(`Preset "${btn.textContent}" aplicado a ${currentConsole.emulator}.`, 'success');
});

document.getElementById('retro-locate-emulator-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const locations = await window.megahub.retroPickEmulatorFolder(currentConsole.id);
  if (!locations) return; // el usuario canceló el diálogo
  updateStandaloneEmulatorControls(currentConsole);
});

// Muestra dónde busca las ROMs de la consola actual (por defecto roms/<id>/,
// o la carpeta propia del usuario si la ubicó) y deja cambiarla/quitarla.
async function updateRomLocationControls(consoleInfo) {
  const locateBtn = document.getElementById('retro-locate-roms-btn');
  const statusEl = document.getElementById('retro-rom-location-status');
  const locations = await window.megahub.retroGetLocations(consoleInfo.id);
  if (currentConsole !== consoleInfo) return;

  locateBtn.querySelector('span').textContent = locations.customRom ? 'Cambiar carpeta de ROMs' : '¿Ya tienes ROMs en otra carpeta? Ubicar';
  statusEl.innerHTML = locations.customRom
    ? `Buscando ROMs en: <code>${escapeHtml(locations.romDir)}</code> — <a href="#" id="retro-clear-rom-loc">usar la carpeta de MegaHUB</a>`
    : '';
  const clearLink = document.getElementById('retro-clear-rom-loc');
  if (clearLink) {
    clearLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.megahub.retroClearRomsLocation(consoleInfo.id);
      updateRomLocationControls(consoleInfo);
      scanLocalRoms(consoleInfo);
    });
  }
}

document.getElementById('retro-locate-roms-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const locations = await window.megahub.retroPickRomsFolder(currentConsole.id);
  if (!locations) return;
  updateRomLocationControls(currentConsole);
  scanLocalRoms(currentConsole);
});

// Si la consola usa un core de RetroArch (14 de las 21), en vez de solo dejar
// el enlace estático a retroarch.com detecta si el usuario YA lo tiene instalado
// y, si es así, ofrece instalar el core específico (con confirmación) o abrir
// RetroArch para jugar/configurar — sin que tenga que ir manualmente al
// Actualizador en línea.
async function updateRetroArchControls(consoleInfo) {
  const controls = document.getElementById('retro-core-controls');
  const downloadLink = document.getElementById('retro-download-link');
  const usesRetroArch = consoleInfo.emulator.includes('core RetroArch');
  if (!usesRetroArch) { controls.hidden = true; return; }

  const statusEl = document.getElementById('retro-core-status');
  const installBtn = document.getElementById('retro-install-core-btn');
  const sysFilesBtn = document.getElementById('retro-install-sysfiles-btn');
  const openBtn = document.getElementById('retro-open-retroarch-btn');
  const biosWarning = document.getElementById('retro-bios-warning');
  controls.hidden = false;
  downloadLink.hidden = false; // se oculta más abajo solo si RetroArch ya está instalado
  statusEl.textContent = 'Comprobando tu instalación de RetroArch…';
  installBtn.hidden = true;
  sysFilesBtn.hidden = true;
  openBtn.hidden = true;
  biosWarning.hidden = true;
  document.getElementById('retro-core-install-status').textContent = '';

  const status = await window.megahub.retroGetRetroArchStatus(consoleInfo.id);
  if (currentConsole !== consoleInfo) return;

  if (!status.installed) {
    statusEl.textContent = 'RetroArch no se detectó instalado — usa el enlace de arriba para bajarlo primero.';
    return;
  }
  // RetroArch ya está instalado: el enlace genérico de descarga ya no aplica.
  downloadLink.hidden = true;
  openBtn.hidden = false;
  if (!status.core) {
    statusEl.textContent = 'RetroArch detectado ✓ (sin core automático disponible para este sistema).';
  } else if (status.core.installed) {
    statusEl.textContent = `RetroArch detectado ✓ — core "${status.core.coreName}" ya instalado.`;
  } else {
    statusEl.textContent = `RetroArch detectado ✓ — falta el core "${status.core.coreName}" (${status.core.sizeMb} MB).`;
    installBtn.hidden = false;
    installBtn.querySelector('span').textContent = `Instalar core (${status.core.coreName}, ${status.core.sizeMb} MB)`;
  }

  // Archivos de sistema del core (fuentes/hiscore/etc, oficiales de RetroArch,
  // NO son BIOS con copyright) — ej. PPSSPP/FBNeo los necesitan para funcionar
  // del todo y normalmente se bajan a mano desde el Actualizador en línea.
  if (status.systemFiles && !status.systemFiles.installed) {
    sysFilesBtn.hidden = false;
    sysFilesBtn.querySelector('span').textContent = `Descargar archivos de sistema (${status.systemFiles.zipName}, ${status.systemFiles.sizeMb} MB)`;
  }

  // BIOS con copyright: nunca la proporcionamos, solo avisamos si falta.
  if (status.bios && status.bios.required && !status.bios.satisfied) {
    biosWarning.hidden = false;
    const files = status.bios.expectedFiles || [];
    const fileList = files.length > 1
      ? (status.bios.anyOf === false ? files.join(' y ') : files.join(' o '))
      : (files[0] || 'BIOS oficial');
    document.getElementById('retro-bios-warning-text').textContent =
      `Requiere ${fileList} — extráela vía dumping desde tu consola. No proporcionamos BIOS.`;
  }
}

document.getElementById('retro-open-bios-folder-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const result = await window.megahub.retroOpenBiosFolder(currentConsole.id);
  if (result && result.error) showToast('Error: ' + result.error, 'error');
});

document.getElementById('retro-install-core-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-install-core-btn');
  const installStatus = document.getElementById('retro-core-install-status');
  const label = btn.querySelector('span');

  const status = await window.megahub.retroGetRetroArchStatus(currentConsole.id);
  if (!status.core) return;
  const confirmed = window.confirm(
    `¿Descargar el core "${status.core.coreName}" (${status.core.sizeMb} MB) desde buildbot.libretro.com ` +
    `e instalarlo en la carpeta cores/ de tu RetroArch?\n\nSolo se descomprime ahí — no se ejecuta nada.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  label.textContent = 'Instalando…';
  const result = await window.megahub.retroInstallCore(currentConsole.id);
  btn.disabled = false;
  if (result && result.error) {
    installStatus.textContent = 'Error: ' + result.error;
    showToast('Error instalando el core: ' + result.error, 'error');
    return;
  }
  label.textContent = `Instalar core (${result.coreName})`;
  installStatus.textContent = `Core "${result.coreName}" instalado correctamente.`;
  showToast(`Core "${result.coreName}" instalado.`, 'success');
  updateRetroArchControls(currentConsole);
});

document.getElementById('retro-install-sysfiles-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-install-sysfiles-btn');
  const installStatus = document.getElementById('retro-core-install-status');
  const label = btn.querySelector('span');

  const status = await window.megahub.retroGetRetroArchStatus(currentConsole.id);
  if (!status.systemFiles) return;
  const confirmed = window.confirm(
    `¿Descargar "${status.systemFiles.zipName}" (${status.systemFiles.sizeMb} MB) desde buildbot.libretro.com ` +
    `(el mismo origen oficial que usa el Actualizador en línea de RetroArch) e instalarlo en tu carpeta system/?\n\n` +
    `Esto NO es una BIOS — son assets propios y libres que el core necesita (fuentes, hiscore, etc).`
  );
  if (!confirmed) return;

  const prevLabel = label.textContent;
  btn.disabled = true;
  label.textContent = 'Descargando…';
  const result = await window.megahub.retroInstallCoreSystemFiles(currentConsole.id);
  btn.disabled = false;
  if (result && result.error) {
    installStatus.textContent = 'Error: ' + result.error;
    label.textContent = prevLabel;
    showToast('Error descargando archivos de sistema: ' + result.error, 'error');
    return;
  }
  installStatus.textContent = `"${result.zipName}" instalado correctamente.`;
  showToast(`"${result.zipName}" instalado.`, 'success');
  updateRetroArchControls(currentConsole);
});

document.getElementById('retro-open-retroarch-btn').addEventListener('click', () => {
  window.megahub.retroOpenRetroArch();
});

function refreshRetroOwnedBadge() {
  const badge = document.getElementById('retro-detail-owned-badge');
  if (!badge) return;
  badge.classList.remove('skeleton', 'skeleton-pill');
  badge.style.cssText = '';
  const ownedCount = retroCatalog.filter(e => e.owned).length;
  badge.textContent = `${ownedCount} obtenido${ownedCount === 1 ? '' : 's'} de ${retroCatalog.length} en el catálogo`;
}

// Cruza los archivos que el usuario puso en roms/<consola>/ contra el catálogo,
// para marcarlos como "obtenidos" aunque no vengan de un playlist de RetroArch.
async function scanLocalRoms(consoleInfo) {
  const statusEl = document.getElementById('retro-rom-scan-status');
  const results = await window.megahub.retroScanRoms({ id: consoleInfo.id, repo: consoleInfo.repo });
  if (currentConsole !== consoleInfo) return;
  if (!results.length) {
    statusEl.textContent = 'Sin archivos en tu carpeta roms/' + consoleInfo.id + ' todavía.';
    return;
  }
  const recognized = results.filter(r => r.recognized);
  const unrecognized = results.filter(r => !r.recognized);
  let dirty = false;
  const touchedTitles = new Set();
  for (const r of recognized) {
    const target = retroCatalog.find(e => normalizeRetroTitle(e.title) === normalizeRetroTitle(r.title));
    if (!target) continue;
    if (target.romPath !== r.path) { target.romPath = r.path; touchedTitles.add(target.title); }
    target.sizeBytes = r.sizeBytes ?? target.sizeBytes ?? null;
    if (!target.owned) { target.owned = true; dirty = true; }
  }
  // Lo que no aparece en el catálogo de libretro-thumbnails (muy incompleto
  // para consolas que no son cores de RetroArch — Xbox/Xbox 360/PS3/PS2/
  // GameCube/Wii solo tienen un puñado de portadas ahí) se agrega igual como
  // un juego propio de tu biblioteca: si no, un ROM real que sí tienes se
  // quedaba invisible solo porque ESE catálogo en particular no lo traía.
  const newlyAdded = [];
  for (const r of unrecognized) {
    const already = retroCatalog.find(e => normalizeRetroTitle(e.title) === normalizeRetroTitle(r.title));
    if (already) {
      if (already.romPath !== r.path) { already.romPath = r.path; touchedTitles.add(already.title); }
      already.sizeBytes = r.sizeBytes ?? already.sizeBytes ?? null;
      if (!already.owned) { already.owned = true; dirty = true; }
      continue;
    }
    const entry = { title: r.title, coverUrl: null, rerelease: false, owned: true, ownedGame: null, romPath: r.path, sizeBytes: r.sizeBytes ?? null };
    retroCatalog.push(entry);
    newlyAdded.push(entry);
    dirty = true;
  }
  statusEl.innerHTML = `<b>${results.length}</b> ROM${results.length === 1 ? '' : 's'} detectada${results.length === 1 ? '' : 's'} en tu carpeta` +
    (newlyAdded.length ? `<br>${newlyAdded.length} no estaba${newlyAdded.length === 1 ? '' : 'n'} en el catálogo de portadas — se agregó${newlyAdded.length === 1 ? '' : 'ron'} igual a tu biblioteca.` : '');
  if (dirty) { refreshRetroOwnedBadge(); applyRetroFilters(); }
  // Si el juego seleccionado ahora mismo es uno de los que cambió, refresca el
  // botón "Jugar" del panel de detalles sin esperar a que el usuario reclique.
  const selected = retroFilteredCatalog[retroSelectedIndex];
  if (selected && touchedTitles.has(selected.title)) renderRetroGameDetails(selected);

  // Portada de respaldo (Wikipedia, sin necesidad de clave) para lo que se
  // agregó sin pasar por el catálogo de libretro-thumbnails.
  for (const entry of newlyAdded) {
    try {
      const url = await window.megahub.getWikipediaCover(entry.title);
      if (url && currentConsole === consoleInfo) { entry.coverUrl = url; applyRetroFilters(); }
    } catch {}
  }
}

// Vuelve a escanear roms/<consola>/ al recuperar el foco de la ventana (p.ej.
// al volver de haber abierto RetroArch/el emulador o de haber copiado ROMs a
// mano) — así el estado "obtenido"/"Jugar" no se queda desactualizado por
// caché mientras la app sigue abierta.
window.addEventListener('focus', () => {
  if (viewMode === 'retro' && currentConsole) {
    scanLocalRoms(currentConsole);
    // Vuelve a chequear la BIOS: si el usuario recién la copió en el Explorador
    // (ej. después de tocar "Abrir carpeta de BIOS") y vuelve a MegaHUB, el
    // aviso debe desaparecer solo, sin tener que salir y reentrar a la consola.
    updateRetroArchControls(currentConsole);
  }
});

document.getElementById('retro-back').addEventListener('click', async () => {
  retroDetailView.hidden = true;
  retroConsoleView.hidden = false;
  currentConsole = null;
  retroConsoleSelectedIndex = -1;
  searchInput.value = '';
  updateSidebarMode();
  updateSearchContext();
  // Pudo haber agregado/ubicado ROMs mientras estaba en el detalle de esta consola.
  await loadLocalRomCounts();
  if (retroConsoleSortMode === 'owned') applyConsoleSort();
  else refreshConsoleOwnedCounts();
});

document.getElementById('retro-owned-filter').addEventListener('click', (e) => {
  if (!e.target.dataset.owned) return;
  retroOwnedFilterMode = e.target.dataset.owned;
  document.querySelectorAll('#retro-owned-filter .chip').forEach(c => c.classList.toggle('active', c === e.target));
  applyRetroFilters();
});

document.getElementById('retro-create-folders-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const res = await window.megahub.retroCreateFolders({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  const statusEl = document.getElementById('retro-rom-scan-status');
  if (res && res.error) { statusEl.textContent = 'Error creando carpetas: ' + res.error; showToast('Error creando carpetas: ' + res.error, 'error'); return; }
  statusEl.textContent = 'Carpetas creadas en emulators/' + currentConsole.id + ' y roms/' + currentConsole.id + '.';
  showToast(`Carpetas de ${currentConsole.name} creadas.`, 'success');
  if (res && res.emuDir) window.megahub.retroOpenFolder(res.emuDir);
});
document.getElementById('retro-open-roms-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const res = await window.megahub.retroCreateFolders({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  if (res && res.romDir) window.megahub.retroOpenFolder(res.romDir);
});

// Descarga automática: SIEMPRE con confirmación explícita mostrando nombre,
// origen y tamaño antes de bajar nada. Todas las fuentes de esta lista son
// builds portables (zip/7z), así que se descomprimen solas dentro de
// emulators/<consola>/ — nunca se ejecuta el archivo descargado.
document.getElementById('retro-auto-download-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const btn = document.getElementById('retro-auto-download-btn');
  const statusEl = document.getElementById('retro-auto-download-status');
  const label = btn.querySelector('span');
  const defaultLabel = 'Descargar e instalar automáticamente (con tu confirmación)';

  btn.disabled = true;
  label.textContent = 'Consultando última versión…';
  const info = await window.megahub.retroGetDownloadInfo(currentConsole.id);
  if (currentConsole == null) return;
  if (!info) {
    label.textContent = defaultLabel;
    btn.disabled = false;
    statusEl.textContent = 'No se pudo obtener la última versión ahora mismo. Usa el enlace de arriba.';
    return;
  }

  const confirmed = window.confirm(
    `¿Descargar ${info.name} (${info.sizeMb} MB, versión ${info.version}) desde github.com/${info.repo} ` +
    `e instalarlo en emulators/${currentConsole.id}/?\n\nSolo se descomprime ahí — no se ejecuta nada.`
  );
  if (!confirmed) {
    label.textContent = defaultLabel;
    btn.disabled = false;
    return;
  }

  label.textContent = 'Descargando e instalando…';
  statusEl.textContent = '';
  const result = await window.megahub.retroDownloadEmulator({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  btn.disabled = false;
  label.textContent = defaultLabel;
  if (result && result.error) {
    statusEl.textContent = 'Error al descargar: ' + result.error;
    showToast('Error al descargar ' + currentConsole.emulator + ': ' + result.error, 'error');
    return;
  }
  if (!result.installed) {
    statusEl.textContent = `Se descargó y descomprimió en emulators/${currentConsole.id}/, pero no se encontró el ejecutable esperado — revisa la carpeta.`;
    showToast('Descarga completada, pero no se encontró el ejecutable esperado.', 'error');
    return;
  }
  showToast(`${currentConsole.emulator} instalado correctamente.`, 'success');
  updateStandaloneEmulatorControls(currentConsole);
});

document.getElementById('retro-open-standalone-btn').addEventListener('click', async () => {
  if (!currentConsole) return;
  const status = await window.megahub.retroGetEmulatorStatus({ id: currentConsole.id, name: currentConsole.name, emulator: currentConsole.emulator });
  if (status && status.exePath) window.megahub.retroOpenEmulator(status.exePath);
});

function applyRetroFilters() {
  let list_ = retroCatalog;
  if (retroOwnedFilterMode === 'owned') list_ = list_.filter(e => e.owned);
  if (retroSearchTerm) list_ = list_.filter(e => e.title.toLowerCase().includes(retroSearchTerm));
  retroFilteredCatalog = list_;
  retroCountEl.textContent = `${list_.length} juegos`;
  renderRetroGameGrid();
}

// Igual que dock/lista: reutiliza los nodos ya creados (con su <img> cargada)
// en vez de reconstruir todo en cada tecla de búsqueda/filtro — evita el
// parpadeo y, sobre todo, usa el mismo pipeline con fallback de syncCoverSlot
// en vez de un <img> crudo sin manejo de error (esa era la causa real de los
// iconos de "imagen rota" en el catálogo).
function buildRetroGameCard(entry) {
  const card = document.createElement('div');
  card.className = 'retro-game-card';
  card.dataset.title = entry.title;

  const cover = document.createElement('div');
  cover.className = 'rg-cover';
  card.appendChild(cover);

  const title = document.createElement('div');
  title.className = 'rg-title';
  card.appendChild(title);

  card.addEventListener('click', () => {
    const idx = retroFilteredCatalog.indexOf(entry);
    if (idx === -1) return;
    retroSelectedIndex = idx;
    updateRetroSelectionStyles();
    renderRetroGameDetails(entry);
  });

  updateRetroGameCard(card, entry);
  return card;
}

function updateRetroGameCard(card, entry) {
  const cover = card.querySelector('.rg-cover');
  // El orden importa: syncCoverSlot puede vaciar y reconstruir cover.innerHTML
  // (renderCoverInto) cuando llega una portada nueva — si las insignias se
  // añaden antes, esa reconstrucción las borra. Por eso van después.
  syncCoverSlot(cover, entry);

  let ownedBadge = cover.querySelector('.rg-owned');
  if (entry.owned && !ownedBadge) {
    ownedBadge = document.createElement('span');
    ownedBadge.className = 'rg-owned';
    ownedBadge.textContent = 'Obtenido';
    cover.appendChild(ownedBadge);
  } else if (!entry.owned && ownedBadge) {
    ownedBadge.remove();
  }
  let rereleaseBadge = cover.querySelector('.rg-rerelease');
  if (entry.rerelease && !rereleaseBadge) {
    rereleaseBadge = document.createElement('span');
    rereleaseBadge.className = 'rg-rerelease';
    rereleaseBadge.textContent = 'Relanzamiento';
    cover.appendChild(rereleaseBadge);
  } else if (!entry.rerelease && rereleaseBadge) {
    rereleaseBadge.remove();
  }
  updateTextureHdBadge(cover, entry);
  card.querySelector('.rg-title').innerHTML = highlightMatch(entry.title, retroSearchTerm);
}

// "Texturas HD disponibles" en la portada de juegos que el usuario NO tiene
// (para eso está el catálogo: que sepa de antemano cuáles ya tienen pack
// esperando en GameBanana). Solo tiene sentido en las 3 consolas donde el
// emulador soporta reemplazo de texturas — ver TEXTURE_PACK_CONSOLES.
// entry._textureHd: undefined = sin consultar todavía, true/false = resuelto
// (una vez resuelto queda pegado al objeto — sobrevive a re-renders del
// mismo filtro sin volver a golpear la API).
const textureHdQueue = [];
let textureHdWorkers = 0;
const TEXTURE_HD_CONCURRENCY = 3;

function runTextureHdQueue() {
  while (textureHdWorkers < TEXTURE_HD_CONCURRENCY && textureHdQueue.length) {
    const { entry, consoleId } = textureHdQueue.shift();
    textureHdWorkers++;
    window.megahub.textureCheckAvailability(entry.title).then((available) => {
      entry._textureHd = available;
      // El usuario pudo cambiar de consola o de filtro mientras esto corría.
      if (currentConsole && currentConsole.id === consoleId) {
        const card = retroGameEls.get(entry.title);
        if (card) updateTextureHdBadge(card.querySelector('.rg-cover'), entry);
      }
    }).catch(() => { entry._textureHd = false; })
      .finally(() => { textureHdWorkers--; runTextureHdQueue(); });
  }
}

function updateTextureHdBadge(cover, entry) {
  let badge = cover.querySelector('.rg-texture-hd');
  const applies = !entry.owned && currentConsole && TEXTURE_PACK_CONSOLES.includes(currentConsole.id);
  // Sin el flag _textureHdQueued, cada tecla escrita en el buscador
  // re-renderiza el resultado (más ancho a mitad de escritura) y volvía a
  // encolar los MISMOS juegos una y otra vez — con catálogos de miles de
  // juegos, la cola crecía a cientos de peticiones duplicadas y el juego que
  // el usuario realmente estaba viendo terminaba esperando su turno detrás
  // de todo ese backlog viejo. unshift (en vez de push) además prioriza lo
  // que se está viendo AHORA sobre encolados previos ya irrelevantes.
  if (applies && entry._textureHd === undefined && !entry._textureHdQueued) {
    entry._textureHdQueued = true;
    textureHdQueue.unshift({ entry, consoleId: currentConsole.id });
    runTextureHdQueue();
  }
  const show = applies && entry._textureHd === true;
  if (show && !badge) {
    badge = document.createElement('span');
    badge.className = 'rg-texture-hd';
    badge.textContent = 'Texturas HD disponibles';
    cover.appendChild(badge);
  } else if (!show && badge) {
    badge.remove();
  }
}

function updateRetroSelectionStyles() {
  [...retroGameGrid.children].forEach((c, i) => c.classList.toggle('selected', i === retroSelectedIndex));
}

function renderRetroGameGrid() {
  // Limpia los placeholders de skeletonCardsHtml() del estado "cargando" —
  // no están trackeados en retroGameEls (se inyectaron como HTML crudo antes
  // de tener catálogo real), así que sin esto quedaban pegados para siempre
  // mezclados con las cartas reales. Mucho más visible en catálogos grandes
  // (ej. NAOMI con 100+ juegos) que en uno chico donde por suerte el índice
  // de las cartas reales tapaba a casi todos los placeholders.
  retroGameGrid.querySelectorAll('.skeleton-card').forEach(el => el.remove());
  if (!retroFilteredCatalog.length) {
    retroGameEls.forEach(el => el.remove());
    retroGameEls.clear();
    retroGameGrid.innerHTML = '<div class="empty">Sin resultados con estos filtros.</div>';
    return;
  }
  const emptyDiv = retroGameGrid.querySelector('.empty');
  if (emptyDiv) emptyDiv.remove();

  const seen = new Set();
  retroFilteredCatalog.forEach((entry, i) => {
    seen.add(entry.title);
    let card = retroGameEls.get(entry.title);
    if (!card) { card = buildRetroGameCard(entry); retroGameEls.set(entry.title, card); }
    else updateRetroGameCard(card, entry);
    if (retroGameGrid.children[i] !== card) retroGameGrid.insertBefore(card, retroGameGrid.children[i] || null);
  });
  for (const [title, el] of retroGameEls) {
    if (!seen.has(title)) { el.remove(); retroGameEls.delete(title); }
  }
  updateRetroSelectionStyles();
}

// Repurposa el panel de detalles de la derecha (el mismo de la biblioteca
// principal) para mostrar la ficha de un juego del catálogo retro.
async function renderRetroGameDetails(entry) {
  const empty = document.getElementById('details-empty');
  const content = document.getElementById('details-content');
  const videoBox = document.getElementById('d-video');
  empty.hidden = true; content.hidden = false;
  videoBox.hidden = true; videoBox.innerHTML = '';

  document.getElementById('d-title').textContent = entry.title;
  const cover = document.getElementById('d-cover');
  cover.style.backgroundImage = entry.coverUrl ? `url("${entry.coverUrl}")` : '';
  document.getElementById('d-badges').innerHTML =
    `<span class="d-badge plat">${escapeHtml(currentConsole.name)}</span>` +
    (entry.rerelease ? `<span class="d-badge not-installed">${icon('refresh')} Relanzamiento digital (versión mejorada)</span>` : '') +
    (entry.owned
      ? `<span class="d-badge installed">${icon('check')} Obtenido</span>`
      : '<span class="d-badge not-installed">— ROM no detectada</span>');
  document.getElementById('d-desc').innerHTML = skeletonLinesHtml(['long', 'medium']);
  document.getElementById('d-meta').innerHTML = '';
  // "¿Lo mueve tu PC?" no aplica a ROMs de consola, solo a juegos de PC actuales.
  document.getElementById('d-reqs').hidden = true;

  const actions = document.getElementById('d-actions');
  actions.innerHTML = '';
  const canPlay = entry.owned && (entry.ownedGame || entry.romPath);
  const btn = document.createElement('button');
  if (canPlay) {
    btn.className = 'action-btn play-ready';
    btn.innerHTML = `${icon('play')} Jugar`;
    btn.onclick = () => {
      if (entry.ownedGame) launchGame(entry.ownedGame);
      else launchLocalRom(entry);
    };
  } else {
    btn.className = 'action-btn play-missing';
    btn.innerHTML = `${icon('lock')} Falta la ROM`;
    btn.disabled = true;
  }
  actions.appendChild(btn);
  actions.appendChild(buildDerivaSearchButton(entry.title));
  // Texturas HD solo tiene sentido en las 3 consolas donde el emulador de
  // verdad soporta reemplazo de texturas (Dolphin en GC/Wii, PPSSPP en PSP
  // vía RetroArch) — ver textureDownload.js. RPCS3/Xenia/Xemu no aparecen
  // porque no tienen esa función (investigación previa, no un descuido).
  if (canPlay && entry.romPath && TEXTURE_PACK_CONSOLES.includes(currentConsole.id)) {
    actions.appendChild(buildTexturePackButton(entry, currentConsole.id));
  }
  if (!canPlay) {
    const hint = document.createElement('div');
    hint.id = 'd-play-hint';
    hint.textContent = `Agrega tu copia de "${entry.title}" en la carpeta de ROMs de ${currentConsole.name} para poder jugarlo.`;
    actions.appendChild(hint);
  }

  // Peso del archivo — solo tiene sentido para ROMs que el usuario ya tiene en
  // disco (no para el resto del catálogo, que ni siquiera existe localmente).
  const sizeBytes = entry.owned ? (entry.ownedGame ? entry.ownedGame.sizeBytes : entry.sizeBytes) : null;
  const sizeRow = sizeBytes != null ? `<b>Tamaño:</b> ${formatBytes(sizeBytes)}` : '';

  const info = await window.megahub.getRetroGameInfo(entry.title);
  // El usuario pudo haber seleccionado otro juego mientras esto cargaba
  if (!retroFilteredCatalog[retroSelectedIndex] || retroFilteredCatalog[retroSelectedIndex].title !== entry.title) return;
  if (info) {
    document.getElementById('d-desc').textContent = info.overview || '';
    const rows = sizeRow ? [sizeRow] : [];
    if (info.genres && info.genres.length) rows.push(`<b>Género:</b> ${escapeHtml(info.genres.join(', '))}`);
    if (info.developers && info.developers.length) rows.push(`<b>Desarrollador:</b> ${escapeHtml(info.developers.join(', '))}`);
    if (info.releaseDate) rows.push(`<b>Lanzamiento:</b> ${escapeHtml(info.releaseDate)}`);
    document.getElementById('d-meta').innerHTML = rows.join('<br>');
  } else {
    document.getElementById('d-desc').textContent = '';
    document.getElementById('d-meta').innerHTML = (sizeRow ? sizeRow + '<br>' : '') +
      '<span style="font-size:11.5px;opacity:0.75">Ficha completa (género, desarrollador, descripción) disponible agregando una clave gratuita de TheGamesDB en Ajustes → Modo Retro.</span>';
  }
}

/* ================= Panel de detalles ================= */

let detailsToken = 0;

// URL pública de la webapp de DERIVA — MISMA constante que usa DERIVA
// Companion (companion-desktop/lib/config.js, DERIVA_URL). Botón inverso del
// plan "Deriva MegaHUB" Fase 4: abre el buscador de DERIVA ya con el título
// puesto (ver el ?buscar= que consume src/App.jsx del lado de DERIVA).
const DERIVA_URL = 'https://deriva-webapp.vercel.app';
function buildDerivaSearchButton(title) {
  const btn = document.createElement('button');
  btn.className = 'action-btn deriva-search';
  btn.innerHTML = `${icon('link')} Buscar en DERIVA`;
  btn.title = 'Abre la búsqueda de contenido de DERIVA para este juego';
  btn.onclick = () => window.open(`${DERIVA_URL}/?buscar=${encodeURIComponent(title)}`, '_blank');
  return btn;
}

// Único hub con API pública real y genérica para packs de texturas HD (ver
// textureDownload.js) — funciona para cualquier juego de estas 3 consolas,
// no una lista fija.
const TEXTURE_PACK_CONSOLES = ['gamecube', 'wii', 'psp'];

function buildTexturePackButton(entry, consoleId) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.innerHTML = `${icon('image')} Buscar texturas HD`;
  btn.title = 'Busca paquetes de texturas HD para este juego en GameBanana';
  btn.onclick = () => toggleTexturePackPanel(btn, entry, consoleId);
  return btn;
}

async function toggleTexturePackPanel(btn, entry, consoleId) {
  const actions = document.getElementById('d-actions');
  const existing = document.getElementById('d-texture-panel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'd-texture-panel';
  panel.style.marginTop = '10px';
  panel.textContent = 'Buscando en GameBanana…';
  actions.appendChild(panel);

  const games = await window.megahub.textureSearchGame(entry.title);
  if (!document.getElementById('d-actions').contains(panel)) return; // el usuario cambió de juego mientras cargaba
  if (!games || !games.length) {
    panel.textContent = `GameBanana no tiene ninguna página de juego que coincida con "${entry.title}".`;
    return;
  }
  // NameMatch ya viene ordenado por relevancia — se usa el primero sin pedir
  // que el usuario elija, para no meter un paso extra la mayoría de las veces.
  const game = games[0];
  panel.textContent = `Buscando mods de "${game.name}"…`;

  const { mods } = await window.megahub.textureListMods({ gameId: game.id });
  if (!document.getElementById('d-actions').contains(panel)) return;
  const relevant = mods.filter(m => /textur|effect|hd|remaster|repaint/i.test(m.name + ' ' + (m.category || '')));
  const list = relevant.length ? relevant : mods;
  if (!list.length) {
    panel.textContent = `"${game.name}" está en GameBanana pero no tiene mods todavía.`;
    return;
  }

  panel.innerHTML = `<div style="font-size:11px;opacity:0.75;margin-bottom:6px">Mods de "${escapeHtml(game.name)}" en GameBanana${relevant.length ? '' : ' (sin filtrar por texturas — revisa la categoría de cada uno)'}:</div>`;
  const listEl = document.createElement('div');
  listEl.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto';
  panel.appendChild(listEl);

  for (const mod of list) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;padding:6px;background:rgba(127,127,127,0.08);border-radius:6px';
    row.innerHTML = `
      ${mod.thumbUrl ? `<img src="${mod.thumbUrl}" style="width:44px;height:44px;object-fit:cover;border-radius:4px;flex-shrink:0">` : ''}
      <div style="flex:1;min-width:0">
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(mod.name)}</div>
        <div style="opacity:0.65">${escapeHtml(mod.category || '')} · ${mod.likes} 👍</div>
      </div>`;
    const installBtn = document.createElement('button');
    installBtn.className = 'action-btn';
    installBtn.style.flexShrink = '0';
    installBtn.textContent = 'Instalar';
    installBtn.onclick = async () => {
      installBtn.disabled = true;
      installBtn.textContent = 'Consultando…';
      const info = await window.megahub.textureGetDownloadInfo(mod.id);
      if (!info) {
        showToast('No se pudo obtener el archivo de descarga de este mod.', 'error');
        installBtn.disabled = false;
        installBtn.textContent = 'Instalar';
        return;
      }
      const confirmed = window.confirm(
        `¿Descargar "${info.fileName}" (${info.sizeMb} MB) desde GameBanana e instalarlo para ${entry.title}?\n\n` +
        `Si el .zip trae los archivos dentro de una subcarpeta, puede que después tengas que moverlos un nivel hacia afuera a mano.`
      );
      if (!confirmed) { installBtn.disabled = false; installBtn.textContent = 'Instalar'; return; }

      installBtn.textContent = 'Descargando…';
      const result = await window.megahub.textureDownloadInstall({ consoleId, romPath: entry.romPath, modId: mod.id });
      installBtn.disabled = false;
      installBtn.textContent = 'Instalar';
      if (result && result.error) { showToast(result.error, 'error', 7000); return; }
      showToast(`"${info.fileName}" instalado en ${result.destDir}`, 'success', 6000);
    };
    row.appendChild(installBtn);
    listEl.appendChild(row);
  }
}

// Botón "MULTIJUGADOR" del sidebar izquierdo (junto al resto de controles del
// emulador de esta consola) — solo se muestra si esta consola tiene online
// real (ver MULTIPLAYER_KEY) y abre el LEEME.txt con las instrucciones
// concretas de cómo activarlo en ESE emulador (main.js resuelve la clave
// contra un whitelist fijo, no un nombre de archivo suelto).
function updateMultiplayerControls(consoleInfo) {
  const btn = document.getElementById('retro-multiplayer-btn');
  const key = MULTIPLAYER_KEY[consoleInfo.id];
  btn.hidden = !key;
  if (!key) return;
  btn.onclick = async () => {
    const res = await window.megahub.openMultiplayerReadme(key);
    if (res && res.error) showToast(res.error, 'error');
  };
}

async function renderDetails(game) {
  const empty = document.getElementById('details-empty');
  const content = document.getElementById('details-content');
  const videoBox = document.getElementById('d-video');
  if (!game) { empty.hidden = false; content.hidden = true; videoBox.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  videoBox.hidden = true; videoBox.innerHTML = '';

  const token = ++detailsToken;
  document.getElementById('d-title').textContent = game.title;
  const cover = document.getElementById('d-cover');
  cover.style.backgroundImage = (game.heroUrl || game.coverUrl) ? `url("${game.heroUrl || game.coverUrl}")` : '';

  document.getElementById('d-badges').innerHTML =
    `<span class="d-badge plat">${PLAT_LABEL[game.platform]}</span>` +
    (game.installed
      ? `<span class="d-badge installed">${icon('check')} Instalado</span>`
      : `<span class="d-badge not-installed">${icon('download')} En biblioteca</span>`);

  document.getElementById('d-desc').textContent = '';
  document.getElementById('d-meta').innerHTML = '';
  document.getElementById('d-reqs').hidden = false;
  document.getElementById('d-reqs-body').innerHTML = skeletonLinesHtml(['medium', 'short']);

  const actions = document.getElementById('d-actions');
  actions.innerHTML = '';
  if (game.installed) {
    const btn = document.createElement('button');
    btn.className = 'action-btn play';
    btn.innerHTML = `${icon('play')} Jugar`;
    btn.onclick = () => launchGame(game);
    actions.appendChild(btn);
  } else {
    const btn = document.createElement('button');
    btn.className = 'action-btn install';
    btn.innerHTML = `${icon('download')} Instalar / ver en tienda`;
    btn.onclick = () => window.megahub.installGame(game);
    actions.appendChild(btn);
  }
  actions.appendChild(buildDerivaSearchButton(game.title));

  // Tamaño de instalación: inmediato si el scanner ya lo trae (Steam/Epic/
  // Battle.net/Ubisoft/EA/Rockstar leen un campo ya calculado del manifiesto o
  // registro); para GOG/Xbox (sin ese dato) se calcula bajo demanda recorriendo
  // la carpeta, solo al abrir esta ficha — nunca durante el escaneo completo.
  let sizeRow = '';
  if (game.installed) {
    if (game.installSizeBytes != null) sizeRow = `<b>Tamaño:</b> ${formatBytes(game.installSizeBytes)}`;
    else if (game.installDir || game.workDir) sizeRow = `<b>Tamaño:</b> <span id="d-size-pending">calculando…</span>`;
  }

  const meta = await window.megahub.getMeta(game);
  if (token !== detailsToken) return;
  const rows = sizeRow ? [sizeRow] : [];
  if (meta) {
    metaById[game.id] = meta;
    rebuildGenreChips();
    if (meta.shortDesc) document.getElementById('d-desc').textContent = meta.shortDesc;
    if (meta.genres && meta.genres.length) rows.push(`<b>Género:</b> ${escapeHtml(meta.genres.join(', '))}`);
    if (meta.releaseDate) rows.push(`<b>Lanzamiento:</b> ${escapeHtml(meta.releaseDate)}`);

    // El gameplay solo se muestra en modo Lista Y si el usuario clicó de verdad
    // el juego (no al navegarlo con flechas) — así no se carga video de más.
    if (viewMode === 'list' && videoAllowedFor === game.id && meta.trailerUrl) {
      videoBox.innerHTML = `<video src="${meta.trailerUrl}" ${meta.trailerPoster ? `poster="${meta.trailerPoster}"` : ''} controls muted loop></video>`;
      videoBox.hidden = false;
    }
  } else if (game.genre) {
    rows.push(`<b>Género:</b> ${escapeHtml(game.genre)}`);
  }
  document.getElementById('d-meta').innerHTML = rows.join('<br>');

  if (game.installed && game.installSizeBytes == null && (game.installDir || game.workDir)) {
    window.megahub.getInstallSize(game.installDir || game.workDir).then((bytes) => {
      if (token !== detailsToken) return;
      const el = document.getElementById('d-size-pending');
      if (el) el.textContent = bytes ? formatBytes(bytes) : 'desconocido';
    });
  }

  const analysis = await window.megahub.analyzeGame(game);
  if (token !== detailsToken) return;
  renderRequirements(analysis);
}

function pctClass(p) { return p >= 150 ? 'great' : p >= 100 ? 'ok' : p >= 75 ? 'warn' : 'bad'; }
function pctColor(p) { return p >= 150 ? 'var(--great)' : p >= 100 ? 'var(--ok)' : p >= 75 ? 'var(--warn)' : 'var(--bad)'; }

function renderRequirements(a) {
  const body = document.getElementById('d-reqs-body');
  if (!a || a.unsupported) { body.textContent = '—'; return; }
  if (a.noMatch) { body.innerHTML = '<span style="font-size:11.5px">No encontramos este juego en Steam para comparar requisitos.</span>'; return; }
  if (a.noData) {
    body.innerHTML = `<span style="font-size:11.5px">${a.viaMatch ? `"${escapeHtml(a.viaMatch.title)}" (Steam) no` : 'Este juego no'} publica requisitos${a.viaMatch ? '' : ' en Steam'}.</span>`;
    return;
  }
  if (a.noSpecs) { body.innerHTML = '<span style="font-size:11.5px">No se pudo detectar tu hardware</span>'; return; }

  const tier = (t, label) => {
    if (!t || t.overall == null) return '';
    const comps = ['gpu', 'cpu', 'ram'].map(k => {
      const c = t.components[k];
      if (!c || c.pct == null) return '';
      return `<div class="req-row"><span>${k.toUpperCase()}</span><span class="val ${pctClass(c.pct)}">${c.pct}%</span></div>`;
    }).join('');
    return `<div class="req-tier">
      <div class="req-tier-title">${label}</div>
      <div class="req-overall">
        <div class="req-bar"><div style="width:${Math.min(100, t.overall)}%;background:${pctColor(t.overall)}"></div></div>
        <span class="${pctClass(t.overall)}">${t.overall}%</span>
      </div>
      ${comps}
    </div>`;
  };

  const verdictText = {
    'recommended-met': {
      excelente: '✔ Tu PC lo mueve sobrado, muy por encima de lo recomendado',
      sobrado: '✔ Tu PC va sobrado, por encima de lo recomendado',
      cumple: '✔ Cumple los requisitos recomendados',
    },
    'below-recommended': {
      cumple: '~ Cumple los mínimos con margen, pero no llega a lo recomendado',
    },
    'minimum-only': {
      excelente: '✔ Muy por encima de los mínimos (el juego no publica recomendados)',
      sobrado: '✔ Sobra margen sobre los mínimos (sin datos de recomendados)',
      cumple: '~ Cumple los mínimos (el juego no publica recomendados)',
      justo: '⚠ Justo en el límite de los mínimos',
      insuficiente: '✘ Por debajo de los requisitos mínimos',
    },
    minimum: {
      justo: '⚠ Por debajo de lo recomendado y justo en el límite de los mínimos',
      insuficiente: '✘ Por debajo incluso de los requisitos mínimos',
    },
  };
  const verdictMsg = (verdictText[a.verdictBasis] || {})[a.verdict];
  const matchNote = a.viaMatch
    ? `<div style="font-size:10.5px;margin-top:4px;opacity:0.7">Requisitos de la ficha de Steam "${escapeHtml(a.viaMatch.title)}"${a.viaMatch.exact ? '' : ' (coincidencia aproximada)'} — este juego no es de Steam.</div>`
    : '';
  body.innerHTML =
    tier(a.minimum, 'Requisitos mínimos') +
    tier(a.recommended, 'Recomendados') +
    (verdictMsg ? `<div class="verdict ${a.verdict}">${verdictMsg}</div>` : '') +
    '<div style="font-size:10.5px;margin-top:6px;opacity:0.7">Estimación heurística comparando componentes, no un benchmark real.</div>' +
    matchNote;
}

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

// El buscador de la barra superior es contextual: filtra la biblioteca normal,
// o — si estás en modo retro — busca consolas (sin elegir ninguna aún) o juegos
// dentro del catálogo de la consola abierta. Nunca ambos a la vez.
searchInput.addEventListener('input', () => {
  const term = searchInput.value.trim();
  if (viewMode === 'retro') {
    if (currentConsole) {
      retroSearchTerm = term.toLowerCase();
      applyRetroFilters();
    } else {
      filterConsoleGridByName(term);
    }
    return;
  }
  filters.search = term;
  selectedIndex = 0;
  render();
});

/* ---- Cuentas ---- */

function markConnected(platform, count) {
  const btn = document.querySelector(`.account-btn[data-account="${platform}"]`);
  if (!btn) return;
  btn.classList.add('connected');
  btn.querySelector('.account-state').textContent = count == null ? 'conectado' : `${count} juegos`;
}

document.querySelectorAll('.account-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('disabled')) return;
    const platform = btn.dataset.account;
    btn.querySelector('.account-state').textContent = 'conectando…';
    const res = await window.megahub.connectAccount(platform);
    if (res.ok) {
      markConnected(platform, res.count);
      showToast(`${PLAT_LABEL[platform] || platform} conectado — ${res.count ?? 0} juegos.`, 'success');
      await rescan();
    } else {
      btn.querySelector('.account-state').textContent = 'conectar';
      showToast(`No se pudo conectar con ${PLAT_LABEL[platform] || platform}.`, 'error');
    }
  });
});

/* ---- SteamGridDB (portadas) ---- */

async function initSgdb() {
  const has = await window.megahub.sgdbHasKey();
  if (has) {
    sgdbSaveBtn.textContent = 'Guardada ✓';
    sgdbSaveBtn.classList.add('saved');
    sgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  }
}
sgdbSaveBtn.addEventListener('click', async () => {
  const key = sgdbInput.value.trim();
  if (!key) return;
  await window.megahub.sgdbSetKey(key);
  sgdbInput.value = '';
  sgdbSaveBtn.textContent = 'Guardada ✓';
  sgdbSaveBtn.classList.add('saved');
  sgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  enrichCovers();
});

const tgdbInput = document.getElementById('tgdb-key');
const tgdbSaveBtn = document.getElementById('tgdb-save');
async function initTgdb() {
  const has = await window.megahub.tgdbHasKey();
  if (has) {
    tgdbSaveBtn.textContent = 'Guardada ✓';
    tgdbSaveBtn.classList.add('saved');
    tgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
  }
}
tgdbSaveBtn.addEventListener('click', async () => {
  const key = tgdbInput.value.trim();
  if (!key) return;
  await window.megahub.tgdbSetKey(key);
  tgdbInput.value = '';
  tgdbSaveBtn.textContent = 'Guardada ✓';
  tgdbSaveBtn.classList.add('saved');
  tgdbInput.placeholder = 'Clave guardada (rellena para cambiarla)';
});

/* ---- Respaldo (exportar/importar ajustes en .json) ---- */

const BACKUP_LOCALSTORAGE_KEYS = [
  'megahub-view', 'megahub-disabled-platforms', 'megahub-retro-enabled',
  'megahub-retro-console-sort', 'megahub-hidden-games',
];
function collectLocalStorageSnapshot() {
  const out = {};
  for (const key of BACKUP_LOCALSTORAGE_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) out[key] = v;
  }
  return out;
}

const backupStatusEl = document.getElementById('backup-status');

document.getElementById('backup-export-btn').addEventListener('click', async () => {
  backupStatusEl.textContent = 'Exportando…';
  const res = await window.megahub.backupExport(collectLocalStorageSnapshot());
  if (res && res.canceled) { backupStatusEl.textContent = ''; return; }
  if (res && res.error) { backupStatusEl.textContent = `Error: ${res.error}`; return; }
  backupStatusEl.textContent = `Guardado en ${res.path}`;
  showToast('Ajustes exportados.', 'success');
});

document.getElementById('backup-import-btn').addEventListener('click', async () => {
  backupStatusEl.textContent = 'Importando…';
  const res = await window.megahub.backupImport();
  if (res && res.canceled) { backupStatusEl.textContent = ''; return; }
  if (res && res.error) { backupStatusEl.textContent = `Error: ${res.error}`; return; }
  for (const [key, value] of Object.entries(res.localStorage || {})) localStorage.setItem(key, value);
  backupStatusEl.textContent = `Importado desde ${res.path} — reinicia MegaHUB para aplicar todos los cambios.`;
  showToast('Ajustes importados — reinicia MegaHUB para verlos aplicados.', 'success', 7000);
});

function applyCoverToElements(game) {
  const icon = dockEls.get(game.id);
  if (icon) updateDockIcon(icon, game);
  const row = listEls.get(game.id);
  if (row) updateListRow(row, game);
  // Entradas del catálogo retro (sin `.id`, solo `.title`) no viven en
  // dockEls/listEls — sin esto, una portada de respaldo (Wikipedia/SGDB) que
  // llegaba tarde por un 404 inicial del thumbnail nunca se reflejaba en la
  // tarjeta de la grilla (quedaba pegada al placeholder), aunque el panel de
  // detalle sí la mostrara bien al abrirlo después (ese se repinta de cero
  // leyendo el dato ya actualizado en cada clic).
  if (game.id === undefined && game.title) {
    const retroCard = retroGameEls.get(game.title);
    if (retroCard) updateRetroGameCard(retroCard, game);
    if (viewMode === 'retro' && retroFilteredCatalog[retroSelectedIndex] === game) renderRetroGameDetails(game);
  }
}

// Primero SteamGridDB si el usuario puso su key (mejor calidad, carátula
// vertical dedicada), y Wikipedia como respaldo sin key.
async function fetchExternalCover(game, hasSgdb) {
  try {
    if (hasSgdb) {
      const url = await window.megahub.getCover(game);
      if (url) return url;
    }
    return await window.megahub.getWikipediaCover(game.title);
  } catch { return null; }
}

async function enrichCovers() {
  // Juegos de RetroArch: portada gratis vía libretro-thumbnails, sin key.
  const retroTargets = allGames.filter(g => g.platform === 'retroarch' && !g.coverUrl && g.system).slice(0, 300);
  for (const g of retroTargets) {
    try {
      const url = await window.megahub.getRetroCover({ system: g.system, title: g.title });
      if (url) { g.coverUrl = url; applyCoverToElements(g); }
    } catch {}
  }

  // El resto (Battle.net, Riot, Rockstar, Ubisoft, EA...): estos arrancan sin
  // coverUrl, así que se enriquecen acá de una. Steam en cambio SIEMPRE
  // arranca con una URL "predicha" (steamcdn-a.akamaihd.net/.../library_600x900.jpg)
  // aunque no exista de verdad todavía — lanzamientos nuevos o juegos "coming
  // soon" (ej. Resident Evil Requiem, o cualquier título sin cápsula vertical
  // publicada aún) no la tienen — por eso Steam NO entra en este filtro
  // `!g.coverUrl` y se resuelve en cambio desde retryCoverViaExternalFallback()
  // cuando el <img> real confirma que esa URL falla (ver renderCoverInto).
  const hasSgdb = await window.megahub.sgdbHasKey();
  const targets = allGames.filter(g => g.platform !== 'retroarch' && g.platform !== 'steam' && !g.coverUrl).slice(0, 150);
  for (const g of targets) {
    g.gridFallbackAttempted = true;
    const url = await fetchExternalCover(g, hasSgdb);
    if (url) { g.coverUrl = url; applyCoverToElements(g); }
  }
}

// Cuando un juego de Steam agota su portada predicha Y el respaldo
// header_image (ambos fallaron de verdad, confirmado por el <img> del DOM,
// no solo "no tenía URL"), se intenta UNA vez más vía SteamGridDB/Wikipedia
// — el mismo respaldo que ya reciben el resto de plataformas, para que un
// juego recién salido no se quede con el placeholder para siempre.
async function retryCoverViaExternalFallback(game) {
  if (game.gridFallbackAttempted) return;
  game.gridFallbackAttempted = true;
  const hasSgdb = await window.megahub.sgdbHasKey();
  const url = await fetchExternalCover(game, hasSgdb);
  if (url) {
    game.coverUrl = url;
    game.coverFailed = false;
    applyCoverToElements(game);
  }
}

/* ================= Ajustes (Launchers + Modo Retro) ================= */

function saveDisabledPlatforms() {
  localStorage.setItem('megahub-disabled-platforms', JSON.stringify([...disabledPlatforms]));
}

function buildLauncherSettings() {
  const box = document.getElementById('launcher-list');
  box.innerHTML = '';
  for (const l of LAUNCHER_REGISTRY) {
    const row = document.createElement('div');
    row.className = 'launcher-row';
    const implemented = l.status === 'implemented';
    row.innerHTML = `
      <span class="launcher-name">${escapeHtml(l.label)}</span>
      <span class="launcher-tag ${l.tier}">${l.tier}</span>
      ${implemented ? '' : '<span class="launcher-status planned">próximamente</span>'}
    `;
    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch' + (implemented ? '' : ' disabled');
    if (implemented && !disabledPlatforms.has(l.id)) toggle.classList.add('on');
    if (implemented) {
      toggle.addEventListener('click', () => {
        if (disabledPlatforms.has(l.id)) disabledPlatforms.delete(l.id);
        else disabledPlatforms.add(l.id);
        toggle.classList.toggle('on');
        saveDisabledPlatforms();
        buildPlatformChips();
        render();
      });
    }
    row.appendChild(toggle);
    box.appendChild(row);
  }
}

let retroTabWired = false;

function renderConsoleGuide() {
  const box = document.getElementById('console-guide');
  if (box.childElementCount) return; // contenido estático: se arma una sola vez
  for (const group of CONSOLE_EMULATOR_GUIDE) {
    const section = document.createElement('div');
    section.className = 'gen-group';
    const title = document.createElement('div');
    title.className = 'gen-title';
    title.textContent = group.gen;
    section.appendChild(title);
    for (const item of group.items) {
      const row = document.createElement('div');
      row.className = 'console-row';
      row.innerHTML = `
        <span class="console-name">${escapeHtml(item.console)}</span>
        <span class="console-emu"><b>${escapeHtml(item.emu)}</b>${item.note ? ' — ' + escapeHtml(item.note) : ''}</span>
        <span class="console-src ${item.src}">${item.src === 'core' ? 'core RetroArch' : 'standalone'}</span>
      `;
      section.appendChild(row);
    }
    box.appendChild(section);
  }
}

const MENU_DRIVER_LABEL = { xmb: 'XMB', rgui: 'RGUI' };

async function renderSkinsList() {
  const box = document.getElementById('retro-skins-list');
  box.innerHTML = skeletonLinesHtml(['long', 'medium']) + skeletonLinesHtml(['long', 'medium']);
  const skins = await window.megahub.retroGetSkins();
  box.innerHTML = '';
  for (const skin of skins) {
    const card = document.createElement('div');
    card.className = 'skin-card' + (skin.installed ? ' installed' : '');
    card.dataset.skinId = skin.id;
    card.innerHTML = `
      <div class="skin-card-body">
        <div class="skin-card-title">${escapeHtml(skin.name)} <span class="skin-card-driver">${MENU_DRIVER_LABEL[skin.menuDriver] || skin.menuDriver}</span></div>
        <div class="skin-card-desc">${escapeHtml(skin.description)}</div>
        <div class="skin-card-credit">Por <a href="${skin.creatorUrl}" target="_blank" rel="noopener">${escapeHtml(skin.creator)}</a> · <a href="${skin.sourceUrl}" target="_blank" rel="noopener">código fuente</a> · ~${skin.sizeMb} MB</div>
      </div>
      <div class="skin-card-actions">
        ${skin.installed
          ? `<span class="skin-card-installed-badge">${icon('check')} Instalada</span>
             <button class="account-btn skin-install-btn" data-action="install">Reinstalar</button>
             ${skin.slot ? `<button class="account-btn skin-restore-btn" data-action="restore">Restaurar original</button>` : ''}`
          : `<button class="account-btn skin-install-btn" data-action="install">${icon('download')} Instalar</button>`}
        <div class="skin-card-status"></div>
      </div>
    `;
    box.appendChild(card);
  }

  box.querySelectorAll('.skin-install-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.skin-card');
      const id = card.dataset.skinId;
      const skin = skins.find(s => s.id === id);
      const confirmed = window.confirm(
        `¿Instalar "${skin.name}" de ${skin.creator} (~${skin.sizeMb} MB)?\n\n` +
        (skin.slot ? `Reemplaza la ranura de tema "${skin.slot}" en RetroArch — se respalda el original antes de sobreescribir.` : 'Se agrega junto a tus presets de RGUI existentes, sin reemplazar nada.')
      );
      if (!confirmed) return;
      const statusEl = card.querySelector('.skin-card-status');
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      statusEl.textContent = 'Descargando e instalando…';
      const result = await window.megahub.retroInstallSkin(id);
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      if (result && result.error) {
        statusEl.textContent = 'Error: ' + result.error;
        showToast(`Error instalando "${skin.name}": ${result.error}`, 'error');
        return;
      }
      statusEl.textContent = '';
      showToast(`"${skin.name}" instalada. Actívala en RetroArch → Ajustes → Apariencia.`, 'success');
      renderSkinsList();
    });
  });
  box.querySelectorAll('.skin-restore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.skin-card');
      const id = card.dataset.skinId;
      const skin = skins.find(s => s.id === id);
      if (!window.confirm(`¿Restaurar el tema original de la ranura "${skin.slot}" (quitar "${skin.name}")?`)) return;
      const statusEl = card.querySelector('.skin-card-status');
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      statusEl.textContent = 'Restaurando…';
      const result = await window.megahub.retroRestoreSkinSlot(id);
      card.querySelectorAll('button').forEach(b => b.disabled = false);
      if (result && result.error) {
        statusEl.textContent = 'Error: ' + result.error;
        showToast('Error al restaurar: ' + result.error, 'error');
        return;
      }
      showToast(`Tema original restaurado.`, 'success');
      renderSkinsList();
    });
  });
}

function setupRetroTab() {
  const toggle = document.getElementById('retro-toggle');
  const status = document.getElementById('retro-status');
  toggle.classList.toggle('on', retroEnabled);
  if (!retroTabWired) {
    retroTabWired = true;
    toggle.addEventListener('click', () => {
      retroEnabled = !retroEnabled;
      toggle.classList.toggle('on', retroEnabled);
      localStorage.setItem('megahub-retro-enabled', retroEnabled ? 'on' : 'off');
      if (retroEnabled) disabledPlatforms.delete('retroarch');
      else disabledPlatforms.add('retroarch');
      saveDisabledPlatforms();
      buildPlatformChips();
      buildLauncherSettings();
      render();
    });
  }
  renderConsoleGuide();
  renderSkinsList();
  const retroGames = allGames.filter(g => g.platform === 'retroarch');
  if (retroGames.length) {
    const systems = new Set(retroGames.map(g => g.system).filter(Boolean));
    status.innerHTML = `<b>RetroArch detectado.</b> ${retroGames.length} ROMs indexadas en ${systems.size} sistema(s).`;
  } else {
    status.innerHTML = 'No se detectó RetroArch instalado (o no tiene playlists con ROMs indexadas todavía).';
  }
}

/* ---- Apariencia (temas de color) ----
   Cada tema solo redefine variables CSS (ver :root/body[data-theme] en
   app.css) — el resto de la hoja de estilos ya está escrito en términos de
   esas variables, así que agregar un tema acá es solo declarar su paleta,
   no tocar selectores. "aurora" (DERIVA) es la paleta por defecto de
   :root, sin atributo — por eso su id de tema es cadena vacía. */
const THEME_REGISTRY = [
  { id: '',              name: 'Violeta',   colors: ['#0b0d12', '#6d5df0', '#22d3ee'] },
  { id: 'arcade',        name: 'Rosa',      colors: ['#0a0510', '#ff2f92', '#33e6ff'] },
  { id: 'retrolight',    name: 'Lavanda',   colors: ['#eeece6', '#8683b8', '#7a5ea8'] },
  { id: 'xbox',          name: 'Verde',     colors: ['#060706', '#107c10', '#7ec418'] },
  { id: 'steam',         name: 'Celeste',   colors: ['#1b2838', '#66c0f4', '#a3cf06'] },
  { id: 'atari',         name: 'Rojo',      colors: ['#1c130d', '#e0392f', '#e8a33d'] },
  { id: 'sega',          name: 'Azul',      colors: ['#06182c', '#1e9be9', '#ff6a1a'] },
  { id: 'arcadepremium', name: 'Dorado',    colors: ['#050506', '#d4af37', '#ff2fa0'] },
  { id: 'rgb',           name: 'Arcoíris',  colors: ['#07080d', '#5cd8ff', '#b07dff'] },
];
const THEME_STORAGE_KEY = 'megahub-theme';

function applyTheme(id, persist) {
  if (id) document.body.dataset.theme = id;
  else delete document.body.dataset.theme;
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, id || '');
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.themeId === id);
  });
}

function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid || grid.dataset.built === '1') return;
  grid.dataset.built = '1';
  const current = localStorage.getItem(THEME_STORAGE_KEY) || '';
  grid.innerHTML = THEME_REGISTRY.map((t) => {
    // Un solo gradiente con paradas duras (no 3 <span> hijos en flex) — más
    // a prueba de balas: el color de cada franja no depende de que el hijo
    // reciba su ancho de flex correctamente, es un solo background-image.
    const n = t.colors.length;
    const stops = t.colors.map((c, i) => `${c} ${Math.round((i / n) * 100)}%, ${c} ${Math.round(((i + 1) / n) * 100)}%`).join(', ');
    return `
    <button type="button" class="theme-card${t.id === current ? ' active' : ''}" data-theme-id="${t.id}">
      <span class="theme-swatch" style="background: linear-gradient(90deg, ${stops})"></span>
      <span class="theme-name">${t.name}</span>
    </button>
  `;
  }).join('');
  grid.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => applyTheme(card.dataset.themeId, true));
  });
}

// Aplica el tema guardado ANTES de construir la grilla (y lo antes posible
// en el arranque, no solo al abrir Ajustes) para que no haya un parpadeo
// de la paleta por defecto al cargar con un tema distinto ya elegido.
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || '', false);

const settingsTabIndicator = document.getElementById('settings-tab-indicator');
function moveSettingsIndicator(tab) {
  if (!tab) return;
  settingsTabIndicator.style.left = tab.offsetLeft + 'px';
  settingsTabIndicator.style.width = tab.offsetWidth + 'px';
}

function openSettings() {
  document.getElementById('settings-overlay').hidden = false;
  buildLauncherSettings();
  setupRetroTab();
  renderThemeGrid();
  // El modal recién se hace visible: el layout de las pestañas todavía no
  // existía en el frame anterior, así que offsetLeft/offsetWidth se leen
  // recién en el próximo frame para que el indicador arranque bien posicionado.
  requestAnimationFrame(() => moveSettingsIndicator(document.querySelector('.settings-tab.active')));
}
document.getElementById('settings-open').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-overlay').hidden = true;
});
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'settings-overlay') document.getElementById('settings-overlay').hidden = true;
});
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.settings-panel').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    moveSettingsIndicator(tab);
  });
});
window.addEventListener('resize', () => {
  if (!document.getElementById('settings-overlay').hidden) moveSettingsIndicator(document.querySelector('.settings-tab.active'));
});

/* ================= Specs ================= */

async function loadSpecs() {
  const s = await window.megahub.getSpecs();
  const el = document.getElementById('specs-content');
  if (!s) { el.textContent = 'No se pudo detectar'; return; }
  el.innerHTML = `<b>${escapeHtml(s.cpuName)}</b><br>${s.cores}c/${s.threads}t · ${s.ramGb} GB RAM<br><b>${escapeHtml(s.gpuName)}</b>`;
}

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

/* ================= Gamepad ================= */

const padState = { lastMove: 0, buttons: {} };
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = [...pads].find(p => p && p.connected);
  padStatusLabel.textContent = pad ? pad.id.slice(0, 22) : 'sin mando';
  padStatus.classList.toggle('on', !!pad);
  if (pad) {
    const now = performance.now();
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const dx = (ax < -0.5 || pad.buttons[14]?.pressed) ? -1 : (ax > 0.5 || pad.buttons[15]?.pressed) ? 1 : 0;
    const dy = (ay < -0.5 || pad.buttons[12]?.pressed) ? -1 : (ay > 0.5 || pad.buttons[13]?.pressed) ? 1 : 0;
    // Aislado igual que el teclado: en modo retro el mando mueve el grid de
    // retro, nunca la biblioteca de PC oculta detrás.
    const inRetro = viewMode === 'retro';
    if ((dx || dy) && now - padState.lastMove > 180) {
      if (inRetro) moveRetro(dx, dy); else move(dx, dy);
      padState.lastMove = now;
    }
    const edge = (idx) => {
      const pressed = pad.buttons[idx]?.pressed;
      const was = padState.buttons[idx];
      padState.buttons[idx] = pressed;
      return pressed && !was;
    };
    if (edge(0)) { if (inRetro) retroPrimaryAction(); else primaryAction(); }
    if (!inRetro) {
      if (edge(4)) cyclePlatform(-1);
      if (edge(5)) cyclePlatform(1);
    }
  }
  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);

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

/* ================= Logros ================= */
// Dos fuentes independientes en la misma pestaña 🏆 LOGROS:
//  - "mh" → motor propio de MegaHUB (global + Steam por horas reales +
//           Retro por juego/consola con sesiones medidas por MegaHUB).
//  - "ra" → RetroAchievements.

let achSource = 'mh'; // mh | ra | consolas
let achSourcesLoaded = new Set(); // para no re-pedir datos al solo cambiar de pestaña

async function initAchievementsView() {
  document.querySelectorAll('#ach-source-tabs .chip').forEach(c => c.classList.toggle('active', c.dataset.achSource === achSource));
  document.getElementById('ach-source-mh').hidden = achSource !== 'mh';
  document.getElementById('ach-source-ra').hidden = achSource !== 'ra';
  document.getElementById('ach-source-consolas').hidden = achSource !== 'consolas';

  if (achSource === 'mh' && !achSourcesLoaded.has('mh')) { achSourcesLoaded.add('mh'); await loadMhDashboard(); }
  else if (achSource === 'ra' && !achSourcesLoaded.has('ra')) { achSourcesLoaded.add('ra'); await initRaSourcePanel(); }
  else if (achSource === 'consolas' && !achSourcesLoaded.has('consolas')) { achSourcesLoaded.add('consolas'); await loadConsolasDashboard(); }
}

document.getElementById('ach-source-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-ach-source]');
  if (!btn) return;
  achSource = btn.dataset.achSource;
  initAchievementsView();
});

/* ---- Motor propio de MegaHUB ---- */

let mhAchCache = [];
let mhTab = 'global';

async function loadMhDashboard() {
  const panel = document.getElementById('mh-panel');
  panel.innerHTML = Array.from({ length: 6 }, () =>
    `<div class="ach-card">${skeletonLinesHtml(['medium'])}${skeletonLinesHtml(['long', 'short'])}</div>`
  ).join('');
  const consoles = CONSOLE_REGISTRY.map(c => ({ id: c.id, name: c.name }));
  const consoleNames = Object.fromEntries(consoles.map(c => [c.id, c.name]));
  mhAchCache = await window.megahub.mhAchGetProgress({ libraryGamesCount: allGames.length, consoleNames, consoles });
  if (mhAchCache && mhAchCache.error) {
    panel.innerHTML = `<div class="empty">Error: ${escapeHtml(mhAchCache.error)}</div>`;
    return;
  }
  renderMhPanel();
}

document.getElementById('mh-refresh-btn').addEventListener('click', loadMhDashboard);

document.getElementById('mh-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-mh-tab]');
  if (!btn) return;
  mhTab = btn.dataset.mhTab;
  document.querySelectorAll('#mh-tabs .chip').forEach(c => c.classList.toggle('active', c === btn));
  renderMhPanel();
});

// Logro desbloqueado en los últimos 5 minutos: se destaca con un destello de
// borde + una cinta "Nuevo" en vez de quedar visualmente igual que uno
// ganado hace meses.
function isRecentlyEarned(a) {
  return a.earned && a.earnedAt && (Date.now() - a.earnedAt) < 5 * 60 * 1000;
}

function pctOf(current, target) {
  if (!target) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function renderMhPanel() {
  const panel = document.getElementById('mh-panel');
  const items = (mhAchCache || []).filter(a => a.scope === mhTab);
  if (!items.length) {
    panel.innerHTML = '<div class="empty">Nada por aquí todavía — sigue jugando para desbloquear logros en esta categoría.</div>';
    return;
  }
  if (mhTab === 'steamgame' || mhTab === 'retrogame') {
    renderMhGameList(panel, items);
    return;
  }
  panel.className = 'ach-grid';
  // Ganados primero, y entre empatados el más cercano a completarse.
  const sorted = [...items].sort((a, b) => (b.earned - a.earned) || (pctOf(b.progressCurrent, b.progressTarget) - pctOf(a.progressCurrent, a.progressTarget)));
  panel.innerHTML = sorted.map(a => {
    const pct = pctOf(a.progressCurrent, a.progressTarget);
    const sub = mhTab === 'retroconsole' ? consoleNameLookup(a.consoleId) : '';
    return `
      <div class="ach-card${a.earned ? ' earned' : ''}${isRecentlyEarned(a) ? ' recent' : ''}">
        ${isRecentlyEarned(a) ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
        <div class="ach-title">${a.earned ? icon('check') : ''}${escapeHtml(a.title)}</div>
        ${sub ? `<div class="ach-sub">${escapeHtml(sub)}</div>` : ''}
        <div class="ach-desc">${escapeHtml(a.description)}</div>
        <div class="ra-progress-bar${a.earned ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
        <div class="ra-progress-label"><span>${a.progressCurrent}/${a.progressTarget}</span><span>${pct}%</span></div>
      </div>
    `;
  }).join('');
}

// "Por juego (Steam)" y "Por juego (Retro)": en vez de mezclar los logros de
// todos los juegos en una sola parrilla, se agrupan por juego — una fila
// resumen por título, con sus propios logros como desplegable al hacer clic.
function renderMhGameList(panel, items) {
  panel.className = 'ach-game-list';
  const groupKey = (a) => (a.scope === 'steamgame' ? a.appid : a.gameKey);
  const groups = new Map();
  for (const a of items) {
    const key = groupKey(a);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  const rows = [...groups.entries()].map(([key, achs]) => {
    const first = achs[0];
    const earnedCount = achs.filter(a => a.earned).length;
    const gameTitle = first.gameTitle || key.split('::').pop();
    const gameIconUrl = first.scope === 'steamgame' ? first.gameIcon : null;
    const sub = first.scope === 'retrogame' ? consoleNameLookup(first.consoleId) : '';
    const monogramSeed = first.scope === 'retrogame' ? (first.consoleId || gameTitle) : gameTitle;
    // Dentro del desplegable: el logro más avanzado (o el ganado más alto) primero.
    const sortedAchs = [...achs].sort((a, b) => (b.earned - a.earned) || (b.progressTarget - a.progressTarget));
    const maxTarget = Math.max(...achs.map(a => a.progressTarget || 0));
    const pct = pctOf(first.progressCurrent, maxTarget);
    return `
      <div class="ach-game-row">
        <button class="ach-game-row-head" data-key="${escapeHtml(String(key))}">
          ${gameIconUrl ? `<img class="ach-game-icon" src="${gameIconUrl}">` : `<div class="ach-game-icon ach-game-icon-mono" style="background:linear-gradient(155deg, hsl(${hueFromString(monogramSeed)} 50% 28%), hsl(${(hueFromString(monogramSeed) + 35) % 360} 50% 16%));">${escapeHtml(consoleMonogram(gameTitle))}</div>`}
          <div class="ach-game-row-info">
            <div class="ach-game-row-title">${escapeHtml(gameTitle)}${sub ? ` <span class="ach-sub">— ${escapeHtml(sub)}</span>` : ''}</div>
            <div class="ra-progress-bar${earnedCount === achs.length ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
            <div class="ra-progress-label"><span>${earnedCount}/${achs.length} logros</span><span>${first.progressCurrent}h</span></div>
          </div>
          <span class="ach-game-row-chevron">${icon('chevron')}</span>
        </button>
        <div class="ach-game-row-body" hidden>
          ${sortedAchs.map(a => `
              <div class="ach-card small${a.earned ? ' earned' : ''}${isRecentlyEarned(a) ? ' recent' : ''}">
                ${isRecentlyEarned(a) ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
                <div class="ach-title">${a.earned ? icon('check') : ''}${escapeHtml(a.title)}</div>
                <div class="ach-desc">${escapeHtml(a.description)}</div>
                <div class="ra-progress-bar${a.earned ? ' mastered' : ''}"><div style="width:${pctOf(a.progressCurrent, a.progressTarget)}%"></div></div>
                <div class="ra-progress-label"><span>${a.progressCurrent}/${a.progressTarget}h</span><span>${pctOf(a.progressCurrent, a.progressTarget)}%</span></div>
              </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  // Con más logros ganados primero, para que lo más relevante quede arriba.
  panel.innerHTML = rows.join('');
  panel.querySelectorAll('.ach-game-row-head').forEach(head => {
    head.addEventListener('click', () => {
      const body = head.nextElementSibling;
      body.hidden = !body.hidden;
      head.querySelector('.ach-game-row-chevron').classList.toggle('open', !body.hidden);
    });
  });
}

function consoleNameLookup(consoleId) {
  const c = CONSOLE_REGISTRY.find(x => x.id === consoleId);
  return c ? c.name : consoleId;
}


/* ---- RetroAchievements ---- */

let raCompletionCache = null; // lista de juegos con progreso, recargada al entrar/actualizar
let raTab = 'games'; // games | recent

async function initRaSourcePanel() {
  const emptyState = document.getElementById('ra-empty-state');
  const dashboard = document.getElementById('ra-dashboard');
  const gameDetail = document.getElementById('ra-game-detail');
  gameDetail.hidden = true;

  await refreshCheevosStatusUi();

  const has = await window.megahub.raHasAccount();
  if (!has) {
    emptyState.hidden = false;
    dashboard.hidden = true;
    return;
  }
  emptyState.hidden = true;
  dashboard.hidden = false;
  await loadAchievementsDashboard();
}

async function refreshCheevosStatusUi() {
  const statusEl = document.getElementById('ra-cheevos-status');
  const btn = document.getElementById('ra-enable-cheevos-btn');
  const openBtn = document.getElementById('ra-open-retroarch-btn');
  const status = await window.megahub.raGetCheevosStatus();
  if (!status.installed) {
    statusEl.textContent = 'RetroArch no se detectó instalado — instálalo primero para poder jugar con logros activos.';
    btn.hidden = true;
    openBtn.hidden = true;
    return;
  }
  // Iniciar sesión (usuario + contraseña reales) se hace SIEMPRE dentro de
  // RetroArch mismo (Ajustes > Logros) — MegaHUB no la pide ni la guarda,
  // por eso el botón solo abre la app, no rellena nada.
  openBtn.hidden = false;
  if (status.enabled) {
    statusEl.textContent = '✔ Los logros ya están activados en RetroArch — si aún no iniciaste sesión, hazlo en Ajustes > Logros.';
    btn.hidden = true;
  } else {
    statusEl.textContent = 'RetroArch detectado, pero los logros todavía no están activados.';
    btn.hidden = false;
  }
}

document.getElementById('ra-open-retroarch-btn').addEventListener('click', () => {
  window.megahub.retroOpenRetroArch();
});

document.getElementById('ra-enable-cheevos-btn').addEventListener('click', async () => {
  const btn = document.getElementById('ra-enable-cheevos-btn');
  btn.disabled = true;
  const result = await window.megahub.raEnableCheevos();
  btn.disabled = false;
  const statusEl = document.getElementById('ra-cheevos-status');
  statusEl.textContent = result.error ? 'Error: ' + result.error : result.message;
  if (result.ok) btn.hidden = true;
});

document.getElementById('ra-connect-btn').addEventListener('click', async () => {
  const username = document.getElementById('ra-username-input').value.trim();
  const apiKey = document.getElementById('ra-key-input').value.trim();
  if (!username || !apiKey) return;
  const btn = document.getElementById('ra-connect-btn');
  btn.disabled = true;
  btn.textContent = 'Conectando…';
  await window.megahub.raSetAccount({ username, apiKey });
  const summary = await window.megahub.raGetSummary();
  btn.disabled = false;
  btn.textContent = 'Conectar';
  if (summary && summary.error) {
    alert('No se pudo conectar: ' + summary.error + '\n\nRevisa que el usuario y la API key sean correctos.');
    await window.megahub.raSetAccount({ username: null, apiKey: null });
    return;
  }
  await initRaSourcePanel();
});

document.getElementById('ra-disconnect-btn').addEventListener('click', async () => {
  if (!confirm('¿Desconectar tu cuenta de RetroAchievements de MegaHUB? (esto no borra tu progreso en retroachievements.org, solo el acceso desde aquí)')) return;
  await window.megahub.raSetAccount({ username: null, apiKey: null });
  await initRaSourcePanel();
});

document.getElementById('ra-refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('ra-refresh-btn');
  btn.disabled = true;
  await loadAchievementsDashboard(true);
  btn.disabled = false;
});

document.getElementById('ra-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip[data-ra-tab]');
  if (!btn) return;
  raTab = btn.dataset.raTab;
  document.querySelectorAll('#ra-tabs .chip').forEach(c => c.classList.toggle('active', c === btn));
  document.getElementById('ra-panel-games').hidden = raTab !== 'games';
  document.getElementById('ra-panel-recent').hidden = raTab !== 'recent';
  if (raTab === 'recent') renderRaHistory();
});

document.getElementById('ra-game-back').addEventListener('click', () => {
  document.getElementById('ra-game-detail').hidden = true;
  document.getElementById('ra-dashboard').hidden = false;
});

async function loadAchievementsDashboard(forceRefreshHistory) {
  const usernameLabel = document.getElementById('ra-username-label');
  const statsEl = document.getElementById('ra-stats');
  usernameLabel.innerHTML = '<span class="skeleton skeleton-line short" style="width:160px;"></span>';
  statsEl.innerHTML = '<span class="skeleton skeleton-pill"></span><span class="skeleton skeleton-pill"></span><span class="skeleton skeleton-pill"></span>';

  const [summary, progress] = await Promise.all([
    window.megahub.raGetSummary(),
    window.megahub.raGetCompletionProgress(),
  ]);

  if (summary && summary.error) {
    usernameLabel.textContent = 'Error al cargar el perfil';
    statsEl.innerHTML = `<span class="ra-stat-pill">${escapeHtml(summary.error)}</span>`;
    return;
  }

  usernameLabel.textContent = summary.username || '';
  const masteredCount = (progress || []).filter(g => g.highestAwardKind === 'mastered' || g.highestAwardKind === 'completed').length;
  statsEl.innerHTML = `
    <span class="ra-stat-pill ra-points"><b>${summary.points ?? 0}</b> puntos</span>
    <span class="ra-stat-pill"><b>${summary.truePoints ?? 0}</b> puntos hardcore</span>
    ${summary.rank ? `<span class="ra-stat-pill">Rank <b>#${summary.rank}</b></span>` : ''}
    <span class="ra-stat-pill"><b>${(progress || []).length}</b> juegos jugados</span>
    <span class="ra-stat-pill ra-points"><b>${masteredCount}</b> masterizados</span>
  `;

  raCompletionCache = (progress && !progress.error) ? progress : [];
  renderRaGames();

  if (forceRefreshHistory) await window.megahub.raRefreshHistory();
  else window.megahub.raRefreshHistory(); // refresco en segundo plano, no bloquea el dashboard
  if (raTab === 'recent') renderRaHistory();
}

function renderRaGames() {
  const grid = document.getElementById('ra-panel-games');
  const games = raCompletionCache || [];
  if (!games.length) {
    grid.innerHTML = '<div class="empty">Todavía no hay progreso registrado — juega algo con los logros activados en RetroArch.</div>';
    return;
  }
  // Más reciente jugado primero.
  const sorted = [...games].sort((a, b) => new Date(b.mostRecentAwardedDate || 0) - new Date(a.mostRecentAwardedDate || 0));
  grid.innerHTML = sorted.map(g => {
    const pct = g.maxPossible ? Math.round((g.numAwarded / g.maxPossible) * 100) : 0;
    const mastered = g.highestAwardKind === 'mastered' || g.highestAwardKind === 'completed';
    return `
      <div class="ra-game-card" data-game-id="${g.gameId}">
        ${g.icon ? `<img class="ra-icon" src="${g.icon}">` : '<div class="ra-icon"></div>'}
        <div class="ra-game-info">
          <div class="ra-game-title">${escapeHtml(g.title)} ${mastered ? `<span class="ra-mastery-badge">${icon('trophy')}${escapeHtml(g.highestAwardKind)}</span>` : ''}</div>
          <div class="ra-game-console">${escapeHtml(g.consoleName || '')}</div>
          <div class="ra-progress-bar${mastered ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
          <div class="ra-progress-label"><span>${g.numAwarded}/${g.maxPossible}</span><span>${pct}%</span></div>
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.ra-game-card').forEach(card => {
    card.addEventListener('click', () => openRaGameDetail(card.dataset.gameId));
  });
}

async function renderRaHistory() {
  const panel = document.getElementById('ra-panel-recent');
  panel.innerHTML = Array.from({ length: 5 }, () =>
    `<div class="ra-history-item"><div class="skeleton" style="width:40px;height:40px;border-radius:6px;flex-shrink:0;"></div>
      <div class="ra-hist-main">${skeletonLinesHtml(['medium', 'short'])}</div></div>`
  ).join('');
  const history = await window.megahub.raGetHistory();
  if (!history.length) {
    panel.innerHTML = '<div class="empty">Sin logros registrados todavía — se van acumulando aquí cada vez que abres esta pestaña.</div>';
    return;
  }
  panel.innerHTML = history.map(h => `
    <div class="ra-history-item">
      ${h.badgeUrl ? `<img src="${h.badgeUrl}">` : ''}
      <div class="ra-hist-main">
        <div class="ra-hist-title">${escapeHtml(h.title)} — <span style="color:var(--dim);font-weight:500;">${escapeHtml(h.gameTitle || '')}</span></div>
        <div class="ra-hist-meta">${escapeHtml(h.description || '')} · ${new Date(h.date).toLocaleString()}${h.hardcore ? ' · Hardcore' : ''}</div>
      </div>
      <div class="ra-hist-points">${h.points} pts</div>
    </div>
  `).join('');
}

async function openRaGameDetail(gameId) {
  document.getElementById('ra-dashboard').hidden = true;
  const detail = document.getElementById('ra-game-detail');
  detail.hidden = false;
  document.getElementById('ra-game-detail-header').innerHTML =
    `<div class="skeleton" style="width:64px;height:64px;border-radius:10px;flex-shrink:0;"></div><div style="flex:1;">${skeletonLinesHtml(['medium', 'short'])}</div>`;
  document.getElementById('ra-game-detail-grid').innerHTML = Array.from({ length: 6 }, () =>
    `<div class="ra-ach-card"><div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
      <div style="flex:1;">${skeletonLinesHtml(['medium', 'long', 'short'])}</div></div>`
  ).join('');

  const game = await window.megahub.raGetGameProgress(gameId);
  if (game.error) {
    document.getElementById('ra-game-detail-header').innerHTML = `<div>Error: ${escapeHtml(game.error)}</div>`;
    return;
  }
  document.getElementById('ra-game-detail-header').innerHTML = `
    ${game.icon ? `<img src="${game.icon}">` : ''}
    <div>
      <h2>${escapeHtml(game.title)}</h2>
      <div class="side-note">${escapeHtml(game.consoleName || '')} · ${game.achievements.filter(a => a.earned).length}/${game.numAchievements} logros${game.userCompletion ? ` · ${game.userCompletion}` : ''}</div>
    </div>
  `;
  document.getElementById('ra-game-detail-grid').innerHTML = game.achievements.map(a => {
    const recent = a.earned && a.dateEarned && (Date.now() - new Date(a.dateEarned).getTime()) < 5 * 60 * 1000;
    return `
    <div class="ra-ach-card${a.earned ? '' : ' locked'}${recent ? ' recent' : ''}">
      ${recent ? '<span class="ach-new-ribbon">Nuevo</span>' : ''}
      ${a.badgeUrl ? `<img src="${a.badgeUrl}">` : ''}
      <div>
        <div class="ra-ach-title">${escapeHtml(a.title)}</div>
        <div class="ra-ach-desc">${escapeHtml(a.description || '')}</div>
        <div class="ra-ach-points">${a.points} pts${a.earnedHardcore ? ' · Hardcore' : ''}</div>
      </div>
    </div>
  `;
  }).join('');
}

/* ---- Xenia (Xbox 360) / RPCS3 (PS3) — logros y trofeos 100% locales ---- */

let consolasCache = []; // [{ key, source: 'xenia'|'rpcs3', title, iconDataUrl, earnedCount, totalCount, unknownStatus, items }]

async function loadConsolasDashboard() {
  const grid = document.getElementById('consolas-panel-games');
  grid.innerHTML = Array.from({ length: 3 }, () =>
    `<div class="ra-game-card"><div class="skeleton" style="width:64px;height:64px;border-radius:8px;flex-shrink:0;"></div>
      <div class="ra-game-info">${skeletonLinesHtml(['medium', 'short'])}</div></div>`
  ).join('');

  // Nunca dejar el esqueleto pegado en silencio: si algo revienta acá (IPC no
  // registrado todavía por una ventana vieja, un .gpd/TROPUSR corrupto, lo que
  // sea), se muestra el error en vez de quedarse cargando para siempre.
  let xenia, rpcs3;
  try {
    [xenia, rpcs3] = await Promise.all([window.megahub.xeniaGetAchievements(), window.megahub.rpcs3GetTrophies()]);
  } catch (e) {
    grid.innerHTML = `<div class="empty">No se pudo cargar Xenia/RPCS3: ${escapeHtml(String(e.message || e))}<br>Si acabas de actualizar MegaHUB, cierra la app por completo (no solo recargues) y vuelve a abrirla.</div>`;
    return;
  }
  const games = [];
  const errors = [];
  if (xenia && xenia.error) errors.push(`Xenia: ${xenia.error}`);
  if (rpcs3 && rpcs3.error) errors.push(`RPCS3: ${rpcs3.error}`);

  try {
  if (xenia && !xenia.error && xenia.installed) {
    for (const profile of xenia.profiles || []) {
      for (const g of profile.games || []) {
        games.push({
          key: `xenia:${profile.profileId}:${g.titleId}`,
          source: 'xenia',
          title: g.title,
          iconDataUrl: g.iconDataUrl,
          earnedCount: g.achievements.filter(a => a.earned).length,
          totalCount: g.achievements.length,
          unknownStatus: false,
          items: g.achievements.map(a => ({
            id: a.id, name: a.name, description: a.description, earned: a.earned,
            iconDataUrl: a.iconDataUrl, meta: `${a.gamerscore}g`,
          })),
        });
      }
    }
  }
  if (rpcs3 && !rpcs3.error && rpcs3.installed) {
    for (const g of rpcs3.games || []) {
      games.push({
        key: `rpcs3:${g.npcommid}`,
        source: 'rpcs3',
        title: g.title,
        iconDataUrl: g.iconDataUrl,
        earnedCount: 0,
        totalCount: g.trophies.length,
        unknownStatus: true, // ver limitación TROPUSR.DAT en rpcs3Trophies.js
        items: g.trophies.map(t => ({
          id: t.id, name: t.hidden ? '???' : t.name, description: t.hidden ? 'Trofeo oculto hasta desbloquearlo.' : t.description,
          earned: null, iconDataUrl: t.iconDataUrl, meta: t.typeLabel,
        })),
      });
    }
  }

  } catch (e) {
    errors.push(`Error mostrando los datos: ${e.message || e}`);
  }

  consolasCache = games;
  if (!games.length) {
    grid.innerHTML = errors.length
      ? `<div class="empty">${errors.map(escapeHtml).join('<br>')}</div>`
      : '<div class="empty">Nada todavía — instala Xenia o RPCS3 desde Modo Retro y juega algo con logros/trofeos.</div>';
    return;
  }
  if (errors.length) showToast(errors.join(' · '), 'error', 8000);
  renderConsolasGames();
}

document.getElementById('consolas-refresh-btn').addEventListener('click', loadConsolasDashboard);

function renderConsolasGames() {
  const grid = document.getElementById('consolas-panel-games');
  grid.innerHTML = consolasCache.map(g => {
    const pct = g.unknownStatus ? 0 : (g.totalCount ? Math.round((g.earnedCount / g.totalCount) * 100) : 0);
    return `
      <div class="ra-game-card" data-key="${escapeHtml(g.key)}">
        ${g.iconDataUrl ? `<img class="ra-icon" src="${g.iconDataUrl}">` : '<div class="ra-icon"></div>'}
        <div class="ra-game-info">
          <div class="ra-game-title">${escapeHtml(g.title)} <span class="ra-mastery-badge">${g.source === 'xenia' ? 'Xenia · Xbox 360' : 'RPCS3 · PS3'}</span></div>
          ${g.unknownStatus
            ? `<div class="ra-game-console">${g.totalCount} trofeos — estado de desbloqueo no disponible todavía</div>`
            : `<div class="ra-progress-bar${pct === 100 ? ' mastered' : ''}"><div style="width:${pct}%"></div></div>
               <div class="ra-progress-label"><span>${g.earnedCount}/${g.totalCount}</span><span>${pct}%</span></div>`}
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.ra-game-card').forEach(card => {
    card.addEventListener('click', () => openConsolasGameDetail(card.dataset.key));
  });
}

function openConsolasGameDetail(key) {
  const g = consolasCache.find(x => x.key === key);
  if (!g) return;
  document.getElementById('consolas-dashboard').hidden = true;
  document.getElementById('consolas-game-detail').hidden = false;
  document.getElementById('consolas-game-detail-header').innerHTML = `
    ${g.iconDataUrl ? `<img src="${g.iconDataUrl}">` : ''}
    <div>
      <h2>${escapeHtml(g.title)}</h2>
      <div class="side-note">${g.source === 'xenia' ? 'Xenia · Xbox 360' : 'RPCS3 · PS3'} · ${g.unknownStatus ? `${g.totalCount} trofeos` : `${g.earnedCount}/${g.totalCount} logros`}</div>
    </div>
  `;
  document.getElementById('consolas-game-detail-grid').innerHTML = g.items.map(a => `
    <div class="ra-ach-card${a.earned ? '' : ' locked'}">
      ${a.iconDataUrl ? `<img src="${a.iconDataUrl}">` : ''}
      <div>
        <div class="ra-ach-title">${escapeHtml(a.name)}</div>
        <div class="ra-ach-desc">${escapeHtml(a.description || '')}</div>
        <div class="ra-ach-points">${escapeHtml(a.meta)}${a.earned === null ? ' · estado desconocido' : ''}</div>
      </div>
    </div>
  `).join('');
}

document.getElementById('consolas-game-back').addEventListener('click', () => {
  document.getElementById('consolas-game-detail').hidden = true;
  document.getElementById('consolas-dashboard').hidden = false;
});

/* ================= Init ================= */

async function rescan() {
  const { games, accounts } = await window.megahub.scanGames();
  allGames = games;
  if (accounts.gog) markConnected('gog');
  if (accounts.epic) markConnected('epic');
  buildPlatformChips();
  rebuildGenreChips();
  render();
}

// Aviso asíncrono desde main.js cuando un emulador lanzado se cierra casi
// enseguida (crash) — la respuesta de retroLaunchRom ya volvió {ok:true} en
// ese momento (el proceso sí arrancó), así que sin esto un crash instantáneo
// no dejaba ningún rastro visible.
window.megahub.onRetroLaunchIssue(({ message }) => showToast(message, 'error', 9000));

(async () => {
  await rescan();
  loadSpecs();
  initSgdb();
  initTgdb();
  if (viewMode === 'retro') refreshConsoleOwnedCounts();
  enrichMetadata();
  enrichCovers();
})();
