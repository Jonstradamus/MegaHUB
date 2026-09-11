// ─── util/store.js — persistencia JSON con escritura atómica (M12) ────────────
// Cubre lo que motivó el fix: un `writeFileSync` interrumpido a media escritura
// dejaba el .json truncado y la siguiente lectura lo consideraba corrupto y
// perdía todo (biblioteca, sesión). La escritura real pasa por un `.tmp` +
// rename atómico; acá se verifica el resultado observable (load/save/fallback/
// cuarentena de JSON corrupto), no la implementación interna del rename.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { mockElectronUserData, unmockElectronUserData } from './testUtils/cjsMock.mjs';

let tmpDir;
let userDataDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'megahub-store-test-'));
  userDataDir = tmpDir;
  mockElectronUserData(() => userDataDir);
  vi.resetModules();
});

afterEach(() => {
  unmockElectronUserData();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('store.load', () => {
  it('devuelve el fallback si el archivo no existe todavía', async () => {
    const store = await import('../util/store.js');
    expect(store.load('no-existe', { a: 1 })).toEqual({ a: 1 });
    expect(store.load('no-existe')).toBeNull(); // fallback por defecto
  });

  it('lee de vuelta exactamente lo que guardó save()', async () => {
    const store = await import('../util/store.js');
    const data = { juegos: ['a', 'b'], version: 3 };
    store.save('biblioteca', data);
    expect(store.load('biblioteca')).toEqual(data);
  });

  it('JSON corrupto: lo aparta con timestamp y devuelve el fallback (no lo pisa)', async () => {
    const store = await import('../util/store.js');
    const file = path.join(tmpDir, 'ach-unlocked.json');
    fs.writeFileSync(file, '{"roto": '); // truncado, JSON inválido a propósito

    const result = store.load('ach-unlocked', {});
    expect(result).toEqual({});
    // El archivo original ya no está donde estaba (se renombró para diagnóstico)
    expect(fs.existsSync(file)).toBe(false);
    const quarantined = fs.readdirSync(tmpDir).filter(f => f.startsWith('ach-unlocked.json.corrupt-'));
    expect(quarantined.length).toBe(1);
    expect(fs.readFileSync(path.join(tmpDir, quarantined[0]), 'utf8')).toBe('{"roto": ');
  });
});

describe('store.save — escritura atómica', () => {
  it('crea el directorio destino si no existe', async () => {
    userDataDir = path.join(tmpDir, 'sub', 'dir');
    const store = await import('../util/store.js');
    store.save('config', { ok: true });
    expect(store.load('config')).toEqual({ ok: true });
  });

  it('no deja un .tmp huérfano tras un save exitoso', async () => {
    const store = await import('../util/store.js');
    store.save('deals-cache', { top: null });
    const leftovers = fs.readdirSync(tmpDir).filter(f => f.includes('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('un save sucesivo reemplaza el contenido anterior por completo', async () => {
    const store = await import('../util/store.js');
    store.save('perfil', { nombre: 'uno' });
    store.save('perfil', { nombre: 'dos' });
    expect(store.load('perfil')).toEqual({ nombre: 'dos' });
  });
});
