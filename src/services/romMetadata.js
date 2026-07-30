// Detecta el título REAL de una ROM/ISO leyendo su propia cabecera interna
// (donde el formato la tiene) — en vez de depender del nombre de archivo o
// carpeta, que puede venir mal puesto, en otro idioma, o ser directamente el
// nombre genérico de la estructura de disco (ej. "PS3_GAME"). Verificado
// byte a byte contra archivos reales del usuario: SNES (header LoROM/HiROM),
// PS3 (PARAM.SFO real: dio "Demon's Souls" donde la carpeta decía
// "PS3_GAME") y PSP (PARAM.SFO dentro del propio .iso, vía el lector
// ISO9660 de abajo: dio "Midnight Club L.A. Remix").
//
// El resto de formatos (GB/GBC, GBA, N64, NDS, Genesis) usan offsets fijos
// de cabecera ampliamente documentados y estables (GBATEK, Pan Docs, wikis
// de desarrollo de cada consola) — no se pudieron probar contra un archivo
// real de esas consolas en este equipo, a diferencia de SNES/PS3/PSP.
//
// Fuera de alcance por ahora: PS2/Xbox/Xbox 360 no guardan el título en
// texto plano en su cabecera (dan un ID de serie/certificado que habría que
// cruzar contra una base de datos externa) — y NES no tiene ningún campo de
// título en su formato, solo se podría reconocer por hash contra una base
// de datos tipo No-Intro.
const fs = require('fs');

const SECTOR = 2048;

/* ---------------- Lector mínimo de ISO9660 ---------------- */
// Solo lo necesario para bajar por un puñado de carpetas y sacar un archivo
// puntual (ej. PSP_GAME/PARAM.SFO) sin cargar el .iso completo en memoria.

function readSectors(fd, lba, count) {
  const buf = Buffer.alloc(count * SECTOR);
  fs.readSync(fd, buf, 0, buf.length, lba * SECTOR);
  return buf;
}

function parseDirRecords(buf) {
  const entries = [];
  let i = 0;
  while (i < buf.length) {
    const len = buf[i];
    if (len === 0) { i++; continue; }
    const extentLba = buf.readUInt32LE(i + 2);
    const dataLen = buf.readUInt32LE(i + 10);
    const flags = buf[i + 25];
    const nameLen = buf[i + 32];
    let name = buf.toString('latin1', i + 33, i + 33 + nameLen).replace(/;\d+$/, '');
    entries.push({ name, extentLba, dataLen, isDir: !!(flags & 2) });
    i += len;
  }
  return entries;
}

function findInDir(fd, dirLba, dirLen, targetName) {
  const entries = parseDirRecords(readSectors(fd, dirLba, Math.ceil(dirLen / SECTOR)));
  return entries.find(e => e.name.toUpperCase() === targetName.toUpperCase());
}

// pathParts: ej. ['PSP_GAME', 'PARAM.SFO']. Devuelve el Buffer del archivo o null.
function readIso9660File(isoPath, pathParts) {
  let fd;
  try { fd = fs.openSync(isoPath, 'r'); } catch { return null; }
  try {
    const pvd = readSectors(fd, 16, 1);
    if (pvd.toString('latin1', 1, 6) !== 'CD001') return null;
    let curLba = pvd.readUInt32LE(156 + 2);
    let curLen = pvd.readUInt32LE(156 + 10);
    for (let p = 0; p < pathParts.length; p++) {
      const entry = findInDir(fd, curLba, curLen, pathParts[p]);
      if (!entry) return null;
      if (p === pathParts.length - 1) {
        return readSectors(fd, entry.extentLba, Math.ceil(entry.dataLen / SECTOR)).slice(0, entry.dataLen);
      }
      curLba = entry.extentLba;
      curLen = entry.dataLen;
    }
  } catch { return null; }
  finally { fs.closeSync(fd); }
  return null;
}

/* ---------------- PARAM.SFO (PS3/PSP/Vita) ---------------- */

function parseParamSfo(buf) {
  if (!buf || buf.length < 20 || buf.toString('latin1', 0, 4) !== '\0PSF') return null;
  const keyTableOffset = buf.readUInt32LE(8);
  const dataTableOffset = buf.readUInt32LE(12);
  const entries = buf.readUInt32LE(16);
  const out = {};
  for (let i = 0; i < entries; i++) {
    const base = 20 + i * 16;
    if (base + 16 > buf.length) break;
    const keyOffset = buf.readUInt16LE(base);
    const dataFmt = buf.readUInt16LE(base + 2);
    const dataLen = buf.readUInt32LE(base + 4);
    const dataOffset = buf.readUInt32LE(base + 12);
    const keyStart = keyTableOffset + keyOffset;
    let keyEnd = keyStart;
    while (keyEnd < buf.length && buf[keyEnd] !== 0) keyEnd++;
    const key = buf.toString('utf8', keyStart, keyEnd);
    const dStart = dataTableOffset + dataOffset;
    if (dataFmt === 0x0204 || dataFmt === 0x0004) { // utf8/string
      let end = dStart;
      while (end < dStart + dataLen && buf[end] !== 0) end++;
      out[key] = buf.toString('utf8', dStart, end);
    } else if (dataFmt === 0x0404) { // int32
      out[key] = buf.readInt32LE(dStart);
    }
  }
  return out;
}

/* ---------------- Utilidad: texto de cabecera "limpio" ---------------- */

function cleanHeaderString(buf, offset, maxLen) {
  if (offset + maxLen > buf.length) return null;
  const slice = buf.slice(offset, offset + maxLen);
  let end = 0;
  while (end < slice.length && slice[end] >= 0x20 && slice[end] < 0x7f) end++;
  if (end < 3) return null; // muy corto para ser un título de verdad
  const text = slice.toString('latin1', 0, end).trim();
  return text.length >= 3 ? text : null;
}

function printableRatio(buf, offset, len) {
  if (offset + len > buf.length) return 0;
  let printable = 0;
  for (let i = offset; i < offset + len; i++) if (buf[i] >= 0x20 && buf[i] < 0x7f) printable++;
  return printable / len;
}

/* ---------------- Por consola ---------------- */

function detectSnes(buf) {
  const candidates = [0x7FC0, 0xFFC0, 0x7FC0 + 512, 0xFFC0 + 512];
  let best = null, bestRatio = 0;
  for (const off of candidates) {
    const ratio = printableRatio(buf, off, 21);
    if (ratio > bestRatio) { bestRatio = ratio; best = off; }
  }
  if (bestRatio < 0.9 || best === null) return null;
  return cleanHeaderString(buf, best, 21);
}

function detectGenesis(buf) {
  // Nombre "overseas" (inglés) primero, si viene vacío/basura cae al "domestic".
  return cleanHeaderString(buf, 0x150, 48) || cleanHeaderString(buf, 0x120, 48);
}

function detectGameboy(buf) {
  return cleanHeaderString(buf, 0x134, 16);
}

function detectGba(buf) {
  return cleanHeaderString(buf, 0xA0, 12);
}

function detectNds(buf) {
  return cleanHeaderString(buf, 0x00, 12);
}

// El header de cabecera de N64 (título en 0x20) solo se lee derecho si el
// ROM está en orden nativo big-endian (.z64) — .v64/.n64 vienen con los
// bytes intercambiados y hay que revertirlo primero (magic number estándar
// documentado: 80 37 12 40 / 37 80 40 12 / 40 12 37 80).
function detectN64(buf) {
  if (buf.length < 0x40) return null;
  const magic = buf.readUInt32BE(0);
  let normalized = buf;
  if (magic === 0x37804012) { // .v64: swap de a pares de bytes
    normalized = Buffer.from(buf.slice(0, 0x40));
    for (let i = 0; i + 1 < normalized.length; i += 2) {
      const tmp = normalized[i]; normalized[i] = normalized[i + 1]; normalized[i + 1] = tmp;
    }
  } else if (magic === 0x40123780) { // .n64: orden de bytes invertido de a 4
    normalized = Buffer.from(buf.slice(0, 0x40));
    for (let i = 0; i + 3 < normalized.length; i += 4) {
      normalized[i] ^= normalized[i + 3]; normalized[i + 3] ^= normalized[i]; normalized[i] ^= normalized[i + 3];
      normalized[i + 1] ^= normalized[i + 2]; normalized[i + 2] ^= normalized[i + 1]; normalized[i + 1] ^= normalized[i + 2];
    }
  } else if (magic !== 0x80371240) {
    return null; // no es un header de N64 reconocible
  }
  return cleanHeaderString(normalized, 0x20, 20);
}

function readHead(filePath, bytes) {
  let fd;
  try { fd = fs.openSync(filePath, 'r'); } catch { return null; }
  try {
    const buf = Buffer.alloc(bytes);
    const read = fs.readSync(fd, buf, 0, bytes, 0);
    return buf.slice(0, read);
  } catch { return null; }
  finally { fs.closeSync(fd); }
}

// Devuelve el título detectado, o null si no se pudo (el llamador debe caer
// de vuelta al nombre de archivo en ese caso).
function detectTitle(consoleId, romPath) {
  try {
    const isDir = fs.statSync(romPath).isDirectory();

    if (consoleId === 'ps3') {
      const sfoPath = isDir ? `${romPath}\\PARAM.SFO` : romPath.replace(/[^\\/]+$/, 'PS3_GAME\\PARAM.SFO');
      if (!fs.existsSync(sfoPath)) return null;
      const sfo = parseParamSfo(fs.readFileSync(sfoPath));
      return (sfo && sfo.TITLE) || null;
    }

    if (consoleId === 'psp') {
      if (isDir) {
        for (const rel of ['PARAM.SFO', 'PSP_GAME\\PARAM.SFO']) {
          const p = `${romPath}\\${rel}`;
          if (fs.existsSync(p)) {
            const sfo = parseParamSfo(fs.readFileSync(p));
            if (sfo && sfo.TITLE) return sfo.TITLE;
          }
        }
        return null;
      }
      if (/\.iso$/i.test(romPath)) {
        const raw = readIso9660File(romPath, ['PSP_GAME', 'PARAM.SFO']) || readIso9660File(romPath, ['UMD_DATA.BIN']);
        const sfo = raw && parseParamSfo(raw);
        return (sfo && sfo.TITLE) || null;
      }
      return null;
    }

    if (isDir) return null; // el resto de formatos de abajo son archivo único
    // SNES necesita leer bastante más adentro (el header vive en 0x7FC0 o
    // 0xFFC0, hasta ~64KB) — el resto de formatos de abajo caben en los
    // primeros 512 bytes, pero leer de más no cuesta nada real.
    const head = readHead(romPath, consoleId === 'snes' ? 0x10200 : 0x200);
    if (!head) return null;

    if (consoleId === 'snes') return detectSnes(head);
    if (consoleId === 'genesis') return detectGenesis(head);
    if (consoleId === 'gb' || consoleId === 'gbc') return detectGameboy(head);
    if (consoleId === 'gba') return detectGba(head);
    if (consoleId === 'nds') return detectNds(head);
    if (consoleId === 'n64') return detectN64(head);
    return null;
  } catch {
    return null;
  }
}

module.exports = { detectTitle, parseParamSfo, readIso9660File };
