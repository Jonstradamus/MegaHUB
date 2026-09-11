// ─── achievementEngine.js — motor de logros propio (Steam + Retro + genérico) ──
// Cubre las piezas que persisten estado real (vía util/store.js, con
// electron.app.getPath mockeado — ver testUtils/cjsMock.mjs) y la lógica de
// rachas/tiers que alimenta evaluate(). steamPlaytime.getAllPlaytimes() se
// mockea aparte: en la máquina real hace una consulta al registro de Windows
// (HKCU\Software\Valve\Steam) — sin mockearlo, el test dependería de si HAY
// o no Steam instalado en quien lo corra (y en CI sería no-determinista).
/* global URL */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'node:url';
import {
  mockElectronUserData, unmockElectronUserData,
  mockCjsModule, unmockCjsModule,
} from './testUtils/cjsMock.mjs';

const steamPlaytimePath = fileURLToPath(new URL('../services/steamPlaytime.js', import.meta.url));

let tmpDir;
let fakePlaytimes = {};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'megahub-ach-test-'));
  mockElectronUserData(() => tmpDir);
  fakePlaytimes = {};
  mockCjsModule(steamPlaytimePath, { getAllPlaytimes: async () => fakePlaytimes });
  vi.resetModules();
  vi.useRealTimers();
});

afterEach(() => {
  unmockElectronUserData();
  unmockCjsModule(steamPlaytimePath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.useRealTimers();
});

describe('recordGenericLaunch', () => {
  it('cuenta lanzamientos, plataformas y días distintos', async () => {
    const engine = await import('../services/achievementEngine.js');
    engine.recordGenericLaunch('epic');
    engine.recordGenericLaunch('epic');
    engine.recordGenericLaunch('gog');
    const a = engine.getGenericActivity();
    expect(a.launchCount).toBe(3);
    expect(a.platformsUsed.sort()).toEqual(['epic', 'gog']);
    expect(a.daysPlayed.length).toBe(1); // mismo día, no duplica
    expect(a.firstLaunchAt).toBeTypeOf('number');
  });

  it('no pisa firstLaunchAt en lanzamientos posteriores', async () => {
    const engine = await import('../services/achievementEngine.js');
    engine.recordGenericLaunch('gog');
    const first = engine.getGenericActivity().firstLaunchAt;
    engine.recordGenericLaunch('gog');
    expect(engine.getGenericActivity().firstLaunchAt).toBe(first);
  });
});

describe('startRetroSession / endRetroSession', () => {
  it('acumula playtime y sesiones por consola y por juego', async () => {
    const engine = await import('../services/achievementEngine.js');
    const session = engine.startRetroSession('snes', 'C:/roms/snes/Chrono Trigger.smc', 'Chrono Trigger');
    vi.useFakeTimers();
    vi.setSystemTime(session.startedAt + 10 * 60 * 1000); // 10 min después
    engine.endRetroSession(session);
    vi.useRealTimers();

    const stats = engine.getRetroStats();
    expect(stats.byConsole.snes.sessions).toBe(1);
    expect(stats.byConsole.snes.playtimeMs).toBeGreaterThanOrEqual(10 * 60 * 1000 - 100);
    expect(stats.byConsole.snes.gamesPlayed).toContain(session.key);

    const g = stats.byGame[session.key];
    expect(g.title).toBe('Chrono Trigger');
    expect(g.sessions).toBe(1);
  });

  it('descarta sesiones de menos de 5 segundos (crash al abrir)', async () => {
    const engine = await import('../services/achievementEngine.js');
    const session = engine.startRetroSession('nds', 'C:/roms/nds/game.nds', 'Juego');
    engine.endRetroSession(session); // termina casi al instante
    const stats = engine.getRetroStats();
    expect(stats.byConsole.nds).toBeUndefined();
  });

  it('ignora un session null/undefined sin lanzar', async () => {
    const engine = await import('../services/achievementEngine.js');
    expect(() => engine.endRetroSession(null)).not.toThrow();
  });

  it('la MISMA rom jugada dos veces suma sesiones, no duplica gamesPlayed', async () => {
    const engine = await import('../services/achievementEngine.js');
    const romPath = 'C:/roms/gba/Fire Emblem.gba';
    for (let i = 0; i < 2; i++) {
      const session = engine.startRetroSession('gba', romPath, 'Fire Emblem');
      vi.useFakeTimers();
      vi.setSystemTime(session.startedAt + 6000);
      engine.endRetroSession(session);
      vi.useRealTimers();
    }
    const stats = engine.getRetroStats();
    expect(stats.byConsole.gba.sessions).toBe(2);
    expect(stats.byConsole.gba.gamesPlayed.length).toBe(1);
    expect(stats.byGame[engine.startRetroSession('gba', romPath, 'Fire Emblem').key].sessions).toBe(2);
  });
});

describe('evaluate — smoke test', () => {
  it('devuelve una lista de logros y desbloquea "Primeros pasos" tras un lanzamiento', async () => {
    const engine = await import('../services/achievementEngine.js');
    engine.recordGenericLaunch('steam');
    const list = await engine.evaluate({});
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    const firstLaunch = list.find(a => a.id === 'global:first_launch');
    expect(firstLaunch).toBeDefined();
    expect(firstLaunch.earned).toBe(true);
  });

  it('sin ninguna actividad, "Primeros pasos" no está desbloqueado', async () => {
    const engine = await import('../services/achievementEngine.js');
    const list = await engine.evaluate({});
    const firstLaunch = list.find(a => a.id === 'global:first_launch');
    expect(firstLaunch.earned).toBe(false);
  });

  it('usa las horas de Steam mockeadas para los tiers globales de playtime', async () => {
    fakePlaytimes = { '440': { playtimeMinutes: 120, lastPlayed: Date.now() } }; // 2h
    const engine = await import('../services/achievementEngine.js');
    const list = await engine.evaluate({});
    const tier1h = list.find(a => a.id === 'global:playtime_1h');
    const tier5h = list.find(a => a.id === 'global:playtime_5h');
    expect(tier1h.earned).toBe(true);  // 2h >= 1h
    expect(tier5h.earned).toBe(false); // 2h < 5h
  });
});
