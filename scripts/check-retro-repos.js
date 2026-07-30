#!/usr/bin/env node
// Diagnóstico manual (no corre en producción): valida que los ~37 repos de
// libretro-thumbnails que usa el catálogo retro (ver CONSOLE_REGISTRY en
// ui/app.js) sigan existiendo, resuelvan por rama (master o main — ver el
// fallback real en src/services/retroThumbnails.js) y tengan portadas en
// Named_Boxarts/. Corridas manuales: antes de agregar una consola nueva, o
// cada tanto para pescar un repo renombrado/borrado antes de que lo note un
// usuario abriendo esa consola y viendo el catálogo vacío en silencio.
//
// Uso: node scripts/check-retro-repos.js
const UA = 'MegaHUB-RepoCheck/0.1 (mantenimiento local, sin despliegue público)';

// Copia deliberada (no importada) de los `repo` de CONSOLE_REGISTRY en
// ui/app.js — ese archivo es del renderer y no está pensado para requerirse
// desde Node; si se agrega/saca una consola ahí, actualizar esta lista.
const REPOS = [
  ['atari2600', 'Atari_-_2600'], ['arcade', 'FBNeo_-_Arcade_Games'],
  ['nes', 'Nintendo_-_Nintendo_Entertainment_System'], ['sms', 'Sega_-_Master_System_-_Mark_III'],
  ['pcengine', 'NEC_-_PC_Engine_-_TurboGrafx_16'], ['genesis', 'Sega_-_Mega_Drive_-_Genesis'],
  ['gb', 'Nintendo_-_Game_Boy'], ['snes', 'Nintendo_-_Super_Nintendo_Entertainment_System'],
  ['gamegear', 'Sega_-_Game_Gear'], ['neogeo', 'SNK_-_Neo_Geo'],
  ['segacd', 'Sega_-_Mega-CD_-_Sega_CD'], ['psx', 'Sony_-_PlayStation'],
  ['saturn', 'Sega_-_Saturn'], ['n64', 'Nintendo_-_Nintendo_64'],
  ['gbc', 'Nintendo_-_Game_Boy_Color'], ['dreamcast', 'Sega_-_Dreamcast'],
  ['naomi', 'Sega_-_Naomi'], ['ps2', 'Sony_-_PlayStation_2'],
  ['gba', 'Nintendo_-_Game_Boy_Advance'], ['gamecube', 'Nintendo_-_GameCube'],
  ['xbox', 'Microsoft_-_Xbox'], ['nds', 'Nintendo_-_Nintendo_DS'],
  ['psp', 'Sony_-_PlayStation_Portable'], ['xbox360', 'Microsoft_-_Xbox_360'],
  ['ps3', 'Sony_-_PlayStation_3'], ['wii', 'Nintendo_-_Wii'],
  ['intellivision', 'Mattel_-_Intellivision'], ['atari5200', 'Atari_-_5200'],
  ['colecovision', 'Coleco_-_ColecoVision'], ['vectrex', 'GCE_-_Vectrex'],
  ['msx', 'Microsoft_-_MSX'], ['atari7800', 'Atari_-_7800'],
  ['atarilynx', 'Atari_-_Lynx'], ['threedo', 'The_3DO_Company_-_3DO'],
  ['atarijaguar', 'Atari_-_Jaguar'], ['virtualboy', 'Nintendo_-_Virtual_Boy'],
  ['ngp', 'SNK_-_Neo_Geo_Pocket_Color'], ['wonderswan', 'Bandai_-_WonderSwan_Color'],
  ['n3ds', 'Nintendo_-_Nintendo_3DS'],
];

async function checkRepo(repo) {
  for (const branch of ['master', 'main']) {
    const res = await fetch(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { 'User-Agent': UA } });
    if (res.status === 404) continue;
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status} (rama ${branch})` };
    const json = await res.json();
    const count = (json.tree || []).filter(t => /^Named_Boxarts\//.test(t.path) && /\.(png|jpe?g)$/i.test(t.path)).length;
    if (!count) return { ok: false, reason: `rama ${branch} existe pero Named_Boxarts/ está vacío` };
    return { ok: true, branch, count };
  }
  return { ok: false, reason: 'ni master ni main responden (¿repo renombrado o borrado?)' };
}

(async () => {
  let fails = 0;
  for (const [id, repo] of REPOS) {
    const r = await checkRepo(repo);
    if (r.ok) {
      console.log(`[OK]   ${id.padEnd(14)} ${repo}  (${r.count} portadas, rama ${r.branch})`);
    } else {
      fails++;
      console.log(`[FAIL] ${id.padEnd(14)} ${repo}  — ${r.reason}`);
    }
    await new Promise((res) => setTimeout(res, 250)); // amable con el rate-limit sin auth de GitHub
  }
  console.log(`\n${REPOS.length - fails}/${REPOS.length} repos OK.`);
  if (fails) process.exitCode = 1;
})();
