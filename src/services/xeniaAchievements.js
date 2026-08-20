// Logros de Xbox 360 vía Xenia: Xenia guarda el perfil del usuario como
// archivos .gpd (formato XDBF, el mismo que usaba el propio 360) dentro de
// content/<xuid>/FFFE07D1/00010000/<xuid>/<titleId>.gpd — uno por juego. Todo
// esto es 100% local, generado por el propio Xenia al jugar, sin red.
//
// El formato XDBF se verificó byte a byte contra archivos .gpd reales (no es
// una transcripción de memoria): encabezados/enteros en big-endian, cadenas
// en UTF-16BE terminadas en NUL. Estructura de cada logro (namespace
// ACHIEVEMENT=1), 28 bytes fijos + 3 cadenas (nombre, desc. desbloqueada,
// desc. bloqueada):
//   id:u32, imageId:u32, gamerscore:u32, flags:u32, unlockTime:u64, reserved:u32
// El bit 0x00020000 de "flags" marca el logro como conseguido — convención
// documentada desde hace años por herramientas de la escena de mods de 360
// (Le Fluffie, Horizon, JQE360) para este mismo formato GPD.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const emulatorDownload = require('./emulatorDownload');

const ENTRY_SIZE = 18; // namespace:u16 + id:u64 + offset:u32 + length:u32
const NS_ACHIEVEMENT = 1;
const NS_IMAGE = 2;
const NS_STRING = 5;
const TITLE_NAME_ID = 0x8000;
const TITLE_ICON_ID = 0x8000;
const ACHIEVED_FLAG = 0x00020000;

function readUtf16beZ(buf, offset) {
  let end = offset;
  while (end + 1 < buf.length && !(buf[end] === 0 && buf[end + 1] === 0)) end += 2;
  const raw = buf.slice(offset, end);
  const swapped = Buffer.alloc(raw.length);
  for (let i = 0; i + 1 < raw.length; i += 2) { swapped[i] = raw[i + 1]; swapped[i + 1] = raw[i]; }
  return { str: swapped.toString('utf16le'), next: Math.min(end + 2, buf.length) };
}

// FILETIME (100ns desde 1601-01-01) -> epoch ms. 0 = nunca desbloqueado.
function filetimeToMs(high, low) {
  const ticks = (BigInt(high) << 32n) | BigInt(low);
  if (ticks === 0n) return null;
  return Number(ticks / 10000n) - 11644473600000;
}

function parseXdbf(buf) {
  if (buf.length < 24 || buf.toString('ascii', 0, 4) !== 'XDBF') return null;
  const entryTableLen = buf.readUInt32BE(8);
  const entryCount = buf.readUInt32BE(12);
  const freeTableLen = buf.readUInt32BE(16);
  const dataStart = 24 + entryTableLen * ENTRY_SIZE + freeTableLen * 8;
  const entries = [];
  for (let i = 0; i < entryCount; i++) {
    const off = 24 + i * ENTRY_SIZE;
    if (off + ENTRY_SIZE > buf.length) break;
    entries.push({
      namespace: buf.readUInt16BE(off),
      idHigh: buf.readUInt32BE(off + 2),
      idLow: buf.readUInt32BE(off + 6),
      offset: dataStart + buf.readUInt32BE(off + 10),
      length: buf.readUInt32BE(off + 14),
    });
  }
  return { buf, entries };
}

function findEntry(xdbf, namespace, idLow, idHigh = 0) {
  return xdbf.entries.find(e => e.namespace === namespace && e.idLow === idLow && e.idHigh === idHigh);
}

function readString(xdbf, namespace, id) {
  const e = findEntry(xdbf, namespace, id);
  if (!e) return null;
  return readUtf16beZ(xdbf.buf, e.offset).str || null;
}

function readImageDataUrl(xdbf, id) {
  if (!id) return null;
  const e = findEntry(xdbf, NS_IMAGE, id);
  if (!e || !e.length) return null;
  const data = xdbf.buf.slice(e.offset, e.offset + e.length);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function parseAchievements(xdbf) {
  const list = [];
  for (const e of xdbf.entries) {
    if (e.namespace !== NS_ACHIEVEMENT) continue;
    const b = xdbf.buf;
    const abs = e.offset;
    if (abs + 28 > b.length) continue;
    const id = b.readUInt32BE(abs);
    const imageId = b.readUInt32BE(abs + 4);
    const gamerscore = b.readUInt32BE(abs + 8);
    const flags = b.readUInt32BE(abs + 12);
    const unlockHigh = b.readUInt32BE(abs + 16);
    const unlockLow = b.readUInt32BE(abs + 20);
    let p = abs + 28;
    const nameR = readUtf16beZ(b, p); p = nameR.next;
    const unlockedR = readUtf16beZ(b, p); p = unlockedR.next;
    const lockedR = readUtf16beZ(b, p); p = lockedR.next;
    const earned = (flags & ACHIEVED_FLAG) !== 0;
    list.push({
      id, gamerscore, earned,
      earnedAt: earned ? filetimeToMs(unlockHigh, unlockLow) : null,
      name: nameR.str || '(sin nombre)',
      description: earned ? (unlockedR.str || lockedR.str || '') : (lockedR.str || unlockedR.str || ''),
      iconDataUrl: readImageDataUrl(xdbf, imageId),
    });
  }
  return list.sort((a, b) => a.id - b.id);
}

async function getXeniaDir() {
  const status = await emulatorDownload.getEmulatorStatus('xbox360', 'Xbox 360', 'Xenia');
  if (!status || !status.emuDir || !fs.existsSync(status.emuDir)) return null;
  return status.emuDir;
}

// Dónde vive realmente el perfil (content/<xuid>/...) depende de si Xenia
// corre en modo portátil: Xenia Canary lo es POR DEFECTO (guarda junto al
// .exe, que es lo único que MegaHUB conoce como "emuDir"), pero un build de
// Xenia normal (no Canary) o uno sin el marcador portable.txt guarda en
// Documentos\xenia\content en su lugar — fuera de la carpeta que MegaHUB
// gestiona. Sin este segundo candidato, un usuario con Xenia normal (no
// Canary) instalado y jugado veía "nada todavía" aunque el emulador esté
// perfectamente detectado y funcionando (ver getXeniaDir arriba, que sí lo
// encuentra para lanzar juegos — es solo el perfil el que vive en otro lado).
function candidateContentDirs(emuDir) {
  const dirs = [path.join(emuDir, 'content')];
  const docsDir = path.join(app.getPath('documents'), 'xenia', 'content');
  if (!dirs.includes(docsDir)) dirs.push(docsDir);
  return dirs;
}

function listProfiles(contentDir) {
  if (!fs.existsSync(contentDir)) return [];
  return fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^[0-9A-Fa-f]{16}$/.test(e.name) && !/^0+$/.test(e.name))
    .map(e => e.name);
}

// Un juego por cada .gpd de logros que Xenia haya generado para ese perfil
// (se crea en cuanto se lanza el juego una vez, aunque no se haya desbloqueado
// nada todavía).
function listTitleGpds(contentDir, profileId) {
  const gpdDir = path.join(contentDir, profileId, 'FFFE07D1', '00010000', profileId);
  if (!fs.existsSync(gpdDir)) return [];
  return fs.readdirSync(gpdDir)
    .filter(f => /^[0-9A-Fa-f]{8}\.gpd$/.test(f) && f.toUpperCase() !== 'FFFE07D1.GPD')
    .map(f => ({ titleId: f.replace(/\.gpd$/i, '').toUpperCase(), file: path.join(gpdDir, f) }));
}

// Devuelve, por cada perfil local de Xenia, la lista de juegos con logros
// (título, ícono, gamerscore total/conseguido, lista completa de logros).
async function getProfilesAchievements() {
  const emuDir = await getXeniaDir();
  if (!emuDir) return { installed: false, profiles: [] };

  const profilesById = new Map();
  for (const contentDir of candidateContentDirs(emuDir)) {
    for (const profileId of listProfiles(contentDir)) {
      const games = profilesById.get(profileId) || [];
      for (const { titleId, file } of listTitleGpds(contentDir, profileId)) {
        // Un .gpd puntual corrupto/truncado (partida a medio escribir, disco
        // lleno, lo que sea) no debe tumbar el resto del perfil — se salta ese
        // juego nada más en vez de que toda la pestaña se quede sin cargar.
        try {
          const buf = fs.readFileSync(file);
          const xdbf = parseXdbf(buf);
          if (!xdbf) continue;
          const achievements = parseAchievements(xdbf);
          if (!achievements.length) continue;
          games.push({
            titleId,
            title: readString(xdbf, NS_STRING, TITLE_NAME_ID) || `Xbox 360 (${titleId})`,
            iconDataUrl: readImageDataUrl(xdbf, TITLE_ICON_ID),
            totalGamerscore: achievements.reduce((s, a) => s + a.gamerscore, 0),
            earnedGamerscore: achievements.filter(a => a.earned).reduce((s, a) => s + a.gamerscore, 0),
            achievements,
          });
        } catch { continue; }
      }
      if (games.length) profilesById.set(profileId, games);
    }
  }
  const profiles = Array.from(profilesById, ([profileId, games]) => ({ profileId, games }));
  return { installed: true, profiles };
}

module.exports = { getProfilesAchievements };
