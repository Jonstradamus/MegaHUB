// ─── romMetadata.js — título real leído de la cabecera del archivo ─────────────
// Formatos verificados byte a byte contra archivos reales por el autor
// original (ver comentario de cabecera del propio romMetadata.js) — sin CI que
// corra esos archivos reales, esto cubre el PARSING con buffers sintéticos
// construidos a mano con el layout exacto de cada formato, para que un futuro
// refactor de offsets no pueda romperlo en silencio. Todo pasa por la API
// pública (`detectTitle`/`parseParamSfo`/`readIso9660File`) con archivos
// temporales reales — sin exportar ni tocar ninguna función interna.
/* global Buffer */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectTitle, parseParamSfo } from '../services/romMetadata.js';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'megahub-rom-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeRom(name, buf) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, buf);
  return p;
}

// Construye un PARAM.SFO mínimo válido con un único campo string — mismo
// layout que lee parseParamSfo: header (20B) + tabla de índice (16B/entrada)
// + tabla de claves + tabla de datos.
function buildParamSfo(key, value) {
  const keyTable = Buffer.from(`${key}\0`, 'latin1');
  const dataTable = Buffer.from(`${value}\0`, 'utf8');
  const keyTableOffset = 20 + 16; // header + 1 entrada de índice
  const dataTableOffset = keyTableOffset + keyTable.length;
  const header = Buffer.alloc(20);
  header.write('\0PSF', 0, 'latin1');
  header.writeUInt32LE(keyTableOffset, 8);
  header.writeUInt32LE(dataTableOffset, 12);
  header.writeUInt32LE(1, 16); // 1 entrada
  const entry = Buffer.alloc(16);
  entry.writeUInt16LE(0, 0);       // keyOffset
  entry.writeUInt16LE(0x0204, 2);  // dataFmt: utf8 string
  entry.writeUInt32LE(Buffer.byteLength(value, 'utf8'), 4); // dataLen
  entry.writeUInt32LE(0, 12);      // dataOffset
  return Buffer.concat([header, entry, keyTable, dataTable]);
}

describe('parseParamSfo (PS3/PSP)', () => {
  it('lee el campo TITLE de un PARAM.SFO válido', () => {
    const sfo = buildParamSfo('TITLE', "Demon's Souls");
    expect(parseParamSfo(sfo)).toEqual({ TITLE: "Demon's Souls" });
  });

  it('devuelve null si falta la firma \\0PSF', () => {
    expect(parseParamSfo(Buffer.from('no es un sfo real y tiene largo'))).toBeNull();
  });

  it('devuelve null con un buffer demasiado corto', () => {
    expect(parseParamSfo(Buffer.alloc(10))).toBeNull();
  });
});

describe('detectTitle — PS3', () => {
  it('lee el título desde <carpeta>/PARAM.SFO', () => {
    const dir = path.join(tmpDir, 'DemonsSouls-PS3');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'PARAM.SFO'), buildParamSfo('TITLE', "Demon's Souls"));
    expect(detectTitle('ps3', dir)).toBe("Demon's Souls");
  });

  it('devuelve null si no hay PARAM.SFO en la carpeta', () => {
    const dir = path.join(tmpDir, 'SinSfo');
    fs.mkdirSync(dir);
    expect(detectTitle('ps3', dir)).toBeNull();
  });
});

describe('detectTitle — PSP (carpeta con PARAM.SFO)', () => {
  it('lee PARAM.SFO directo en la carpeta', () => {
    const dir = path.join(tmpDir, 'MidnightClub');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'PARAM.SFO'), buildParamSfo('TITLE', 'Midnight Club L.A. Remix'));
    expect(detectTitle('psp', dir)).toBe('Midnight Club L.A. Remix');
  });

  it('lee PARAM.SFO dentro de PSP_GAME/ si no está en la raíz', () => {
    const dir = path.join(tmpDir, 'OtroJuego');
    fs.mkdirSync(path.join(dir, 'PSP_GAME'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'PSP_GAME', 'PARAM.SFO'), buildParamSfo('TITLE', 'Otro Juego'));
    expect(detectTitle('psp', dir)).toBe('Otro Juego');
  });
});

describe('detectTitle — SNES (header en 0x7FC0)', () => {
  it('detecta el título LoROM', () => {
    const buf = Buffer.alloc(0x10200);
    buf.write('SUPER METROID        '.slice(0, 21), 0x7FC0, 'latin1');
    expect(detectTitle('snes', writeRom('smetroid.smc', buf))).toBe('SUPER METROID');
  });

  it('devuelve null si no hay texto imprimible en ningún candidato', () => {
    const buf = Buffer.alloc(0x10200); // todo ceros
    expect(detectTitle('snes', writeRom('vacio.smc', buf))).toBeNull();
  });
});

describe('detectTitle — Genesis (header overseas en 0x150)', () => {
  it('detecta el nombre overseas', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('SONIC THE HEDGEHOG 2'.padEnd(48, ' '), 0x150, 'latin1');
    expect(detectTitle('genesis', writeRom('sonic2.md', buf))).toBe('SONIC THE HEDGEHOG 2');
  });

  it('cae al nombre domestic (0x120) si overseas está vacío', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('SONIC 2 JP'.padEnd(48, ' '), 0x120, 'latin1');
    expect(detectTitle('genesis', writeRom('sonic2jp.md', buf))).toBe('SONIC 2 JP');
  });
});

describe('detectTitle — Game Boy / Color (header en 0x134)', () => {
  it('detecta el título', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('POKEMON RED', 0x134, 'latin1');
    expect(detectTitle('gb', writeRom('red.gb', buf))).toBe('POKEMON RED');
    expect(detectTitle('gbc', writeRom('red2.gbc', buf))).toBe('POKEMON RED');
  });
});

describe('detectTitle — GBA (header en 0xA0)', () => {
  it('detecta el título', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('FIRE EMBLEM', 0xA0, 'latin1');
    expect(detectTitle('gba', writeRom('fe.gba', buf))).toBe('FIRE EMBLEM');
  });
});

describe('detectTitle — NDS (header en 0x00, campo de 12 bytes)', () => {
  it('detecta el título', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('MARIOKART DS', 0x00, 'latin1'); // 12 chars exactos — el campo real es de 12 bytes
    expect(detectTitle('nds', writeRom('mkds.nds', buf))).toBe('MARIOKART DS');
  });

  it('un título más largo que el campo se trunca a 12 bytes (no revienta)', () => {
    const buf = Buffer.alloc(0x200);
    buf.write('MARIO KART DS', 0x00, 'latin1'); // 13 chars — 1 de más
    expect(detectTitle('nds', writeRom('mkds-largo.nds', buf))).toBe('MARIO KART D');
  });
});

describe('detectTitle — N64 (header en 0x20, 3 variantes de byte order)', () => {
  function buildZ64(title) {
    const buf = Buffer.alloc(0x200);
    buf.writeUInt32BE(0x80371240, 0); // magic .z64 nativo
    buf.write(title, 0x20, 'latin1');
    return buf;
  }

  it('.z64 (big-endian nativo)', () => {
    expect(detectTitle('n64', writeRom('game.z64', buildZ64('SUPER MARIO 64')))).toBe('SUPER MARIO 64');
  });

  it('.v64 (bytes intercambiados de a pares) se normaliza igual', () => {
    const z64 = buildZ64('ZELDA OCARINA');
    const v64 = Buffer.from(z64.slice(0, 0x40));
    for (let i = 0; i + 1 < v64.length; i += 2) {
      const tmp = v64[i]; v64[i] = v64[i + 1]; v64[i + 1] = tmp;
    }
    const full = Buffer.concat([v64, Buffer.alloc(0x200 - 0x40)]);
    expect(detectTitle('n64', writeRom('game.v64', full))).toBe('ZELDA OCARINA');
  });

  it('magic no reconocible → null (no revienta)', () => {
    const buf = Buffer.alloc(0x200);
    buf.writeUInt32BE(0xDEADBEEF, 0);
    expect(detectTitle('n64', writeRom('raro.n64', buf))).toBeNull();
  });
});

describe('detectTitle — casos borde', () => {
  it('consola desconocida → null', () => {
    expect(detectTitle('ps2', writeRom('juego.iso', Buffer.alloc(0x200)))).toBeNull();
  });

  it('archivo inexistente → null (no revienta)', () => {
    expect(detectTitle('snes', path.join(tmpDir, 'no-existe.smc'))).toBeNull();
  });

  it('SNES es el único formato que no acepta una carpeta', () => {
    const dir = path.join(tmpDir, 'carpeta-snes');
    fs.mkdirSync(dir);
    expect(detectTitle('snes', dir)).toBeNull();
  });
});
