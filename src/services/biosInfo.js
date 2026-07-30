// Detección de BIOS/firmware faltante por consola — verificado contra la
// documentación oficial de cada core de libretro (docs.libretro.com). MegaHUB
// NUNCA descarga ni distribuye BIOS: son firmware con copyright, hay que
// extraerlos tú mismo de tu propia consola (dumping). Esto solo detecta si ya
// los tienes puestos en el sitio correcto, para avisar cuando falten.
const fs = require('fs');
const path = require('path');

// location: "system" = carpeta system/ de RetroArch (opcionalmente con
// subcarpeta); "roms" = junto a las ROMs de esa consola (caso de Neo Geo, cuya
// "bios" es en realidad un romset compartido, no un archivo de firmware).
// anyOf: true = basta con tener UNO de los archivos listados (suele ser uno
// por región); false = hacen falta TODOS.
const BIOS_REQUIRED = {
  psx: { location: 'system', files: ['scph5500.bin', 'scph5501.bin', 'scph5502.bin'], anyOf: true },
  saturn: { location: 'system', files: ['sega_101.bin', 'mpr-17933.bin'], anyOf: true },
  segacd: { location: 'system', files: ['bios_CD_U.bin', 'bios_CD_E.bin', 'bios_CD_J.bin'], anyOf: true },
  dreamcast: { location: 'system', subfolder: 'dc', files: ['dc_boot.bin', 'dc_flash.bin'], anyOf: false },
  // NAOMI y Atomiswave son dos placas distintas con BIOS distinta (naomi.zip
  // vs awbios.zip), pero comparten la misma entrada de consola y la misma
  // carpeta system/dc/ que usa Flycast — anyOf:true porque un usuario puede
  // tener solo una de las dos y aun así jugar los juegos de ESA placa.
  naomi: { location: 'system', subfolder: 'dc', files: ['naomi.zip', 'awbios.zip'], anyOf: true },
  neogeo: { location: 'roms', files: ['neogeo.zip'], anyOf: false },
  threedo: {
    location: 'system',
    files: ['panafz1.bin', 'panafz10.bin', 'panafz10-norsa.bin', 'panafz10e-anvil.bin', 'panafz10e-anvil-norsa.bin', 'panafz1j.bin', 'panafz1j-norsa.bin', 'goldstar.bin', 'sanyotry.bin', '3do_arcade_saot.bin'],
    anyOf: true,
  },
  colecovision: { location: 'system', files: ['colecovision.rom'], anyOf: false },
  intellivision: { location: 'system', files: ['exec.bin', 'grom.bin'], anyOf: false },
};

function checkBiosStatus(consoleId, retroarchSystemDir, romDir) {
  const info = BIOS_REQUIRED[consoleId];
  if (!info) return { required: false };
  const baseDir = info.location === 'roms' ? romDir : path.join(retroarchSystemDir, info.subfolder || '');
  const present = info.files.filter(f => fs.existsSync(path.join(baseDir, f)));
  const satisfied = info.anyOf ? present.length > 0 : present.length === info.files.length;
  return { required: true, satisfied, expectedFiles: info.files, anyOf: info.anyOf, checkedDir: baseDir, location: info.location };
}

module.exports = { BIOS_REQUIRED, checkBiosStatus };
