// Trofeos de PS3 vía RPCS3: cada juego con trofeos guarda su carpeta
// dev_hdd0/home/00000001/trophy/<NPCOMMID>/ con TROPCONF.SFM (el catálogo
// completo de trofeos: nombre, descripción, tipo, oculto — XML plano, sin
// encriptar) más los íconos TROPxxx.PNG (uno por trofeo, mismo índice que su
// id) y TROPUSR.DAT (el estado de progreso del usuario).
//
// Límite honesto: TROPUSR.DAT es un formato binario propietario de Sony sin
// documentación pública fiable (a diferencia del GPD de Xbox 360, que sí está
// bien documentado por la escena de mods). Se intentó extraer su estructura
// analizando bytes reales, pero sin un trofeo ya desbloqueado de referencia
// no hay forma de verificar qué campo marca "conseguido" sin arriesgarse a
// mostrar datos incorrectos — así que por ahora MegaHUB solo lista el
// catálogo real de trofeos de cada juego (nombre, descripción, tipo, ícono)
// y no afirma cuáles ya se desbloquearon. Se retomará si aparece una fuente
// fiable del formato de TROPUSR.DAT.
const fs = require('fs');
const path = require('path');
const emulatorDownload = require('./emulatorDownload');

const TYPE_LABEL = { P: 'Platino', G: 'Oro', S: 'Plata', B: 'Bronce' };

function parseTropconf(xml, npcommid) {
  const titleMatch = xml.match(/<title-name>([\s\S]*?)<\/title-name>/);
  const trophyRe = /<trophy id="(\d+)" hidden="(yes|no)" ttype="([PGSB])" pid="(-?\d+)">\s*<name>([\s\S]*?)<\/name>\s*<detail>([\s\S]*?)<\/detail>\s*<\/trophy>/g;
  const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
  const trophies = [];
  let m;
  while ((m = trophyRe.exec(xml))) {
    const [, id, hidden, ttype, pid] = m;
    trophies.push({
      id: Number(id),
      hidden: hidden === 'yes',
      type: ttype,
      typeLabel: TYPE_LABEL[ttype] || ttype,
      groupId: pid === '-1' ? null : pid,
      name: decode(m[5]),
      description: decode(m[6]),
    });
  }
  return {
    npcommid,
    title: titleMatch ? decode(titleMatch[1]) : npcommid,
    trophies: trophies.sort((a, b) => a.id - b.id),
  };
}

async function getRpcs3Dir() {
  const status = await emulatorDownload.getEmulatorStatus('ps3', 'PlayStation 3', 'RPCS3');
  if (!status || !status.emuDir || !fs.existsSync(status.emuDir)) return null;
  return status.emuDir;
}

function trophyDirs(rpcs3Dir) {
  const base = path.join(rpcs3Dir, 'dev_hdd0', 'home', '00000001', 'trophy');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(base, e.name));
}

function iconDataUrl(dir, trophyId) {
  const file = path.join(dir, `TROP${String(trophyId).padStart(3, '0')}.PNG`);
  if (!fs.existsSync(file)) return null;
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

// Devuelve el catálogo de trofeos de cada juego con datos en la carpeta de
// RPCS3. El estado "desbloqueado" no está disponible todavía (ver comentario
// de cabecera) — cada trofeo se entrega con earned:null para que el front lo
// distinga de "no conseguido" y lo muestre como "estado desconocido".
async function getTrophyCatalog() {
  const rpcs3Dir = await getRpcs3Dir();
  if (!rpcs3Dir) return { installed: false, games: [] };

  const games = [];
  for (const dir of trophyDirs(rpcs3Dir)) {
    // Un TROPCONF.SFM/ícono puntual roto no debe tumbar el resto de los
    // juegos con trofeos — se salta ese juego nada más.
    try {
      const npcommid = path.basename(dir);
      const sfmPath = path.join(dir, 'TROPCONF.SFM');
      if (!fs.existsSync(sfmPath)) continue;
      const xml = fs.readFileSync(sfmPath, 'utf8');
      const parsed = parseTropconf(xml, npcommid);
      if (!parsed.trophies.length) continue;
      const iconGamePath = path.join(dir, 'ICON0.PNG');
      games.push({
        npcommid: parsed.npcommid,
        title: parsed.title,
        iconDataUrl: fs.existsSync(iconGamePath) ? `data:image/png;base64,${fs.readFileSync(iconGamePath).toString('base64')}` : null,
        trophies: parsed.trophies.map(t => ({
          ...t,
          earned: null, // desconocido — ver limitación de TROPUSR.DAT arriba
          iconDataUrl: t.hidden ? null : iconDataUrl(dir, t.id),
        })),
      });
    } catch { continue; }
  }
  return { installed: true, games };
}

module.exports = { getTrophyCatalog };
