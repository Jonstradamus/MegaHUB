// ─── steamPlaytime.js — horas reales leídas de localconfig.vdf ────────────────
// El parsing de VDF (buscar el bloque "apps" y separar cada "<appid>{...}"
// respetando llaves anidadas) es la parte frágil — se prueba con un
// localconfig.vdf sintético pero con la MISMA forma que el real (incluye un
// sub-bloque anidado tipo "cloud" para confirmar que el conteo de llaves no
// se confunde con contenido interno). getSteamPath() se mockea: en la máquina
// real hace una consulta al registro de Windows, no determinista en CI.
/* global URL */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'node:url';
import { mockCjsModule, unmockCjsModule } from './testUtils/cjsMock.mjs';

const scanSteamPath = fileURLToPath(new URL('../scanners/steam.js', import.meta.url));

let tmpDir;
let steamPath;

function vdfWithApps(appsEntries) {
  return `"UserLocalConfigStore"\n{\n\t"Software"\n\t{\n\t\t"Valve"\n\t\t{\n\t\t\t"Steam"\n\t\t\t{\n\t\t\t\t"apps"\n\t\t\t\t{\n${appsEntries}\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n`;
}

function appBlock(appid, { playtime, lastPlayed, withCloudBlock = false } = {}) {
  const cloud = withCloudBlock ? '\t\t\t\t\t\t"cloud"\n\t\t\t\t\t\t{\n\t\t\t\t\t\t\t"last_sync_state"\t\t"1"\n\t\t\t\t\t\t}\n' : '';
  const pt = playtime !== undefined ? `\t\t\t\t\t\t"Playtime"\t\t"${playtime}"\n` : '';
  const lp = lastPlayed !== undefined ? `\t\t\t\t\t\t"LastPlayed"\t\t"${lastPlayed}"\n` : '';
  return `\t\t\t\t\t"${appid}"\n\t\t\t\t\t{\n${cloud}${pt}${lp}\t\t\t\t\t}\n`;
}

function writeLocalconfig(account, vdfText) {
  const cfgDir = path.join(steamPath, 'userdata', account, 'config');
  fs.mkdirSync(cfgDir, { recursive: true });
  fs.writeFileSync(path.join(cfgDir, 'localconfig.vdf'), vdfText);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'megahub-steam-test-'));
  steamPath = path.join(tmpDir, 'Steam');
  mockCjsModule(scanSteamPath, { getSteamPath: async () => steamPath });
  vi.resetModules();
});

afterEach(() => {
  unmockCjsModule(scanSteamPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getAllPlaytimes', () => {
  it('lee Playtime y LastPlayed de cada appid, respetando bloques anidados (cloud)', async () => {
    const { getAllPlaytimes } = await import('../services/steamPlaytime.js');
    writeLocalconfig('1000', vdfWithApps(
      appBlock('440', { playtime: '120', lastPlayed: '1700000000', withCloudBlock: true }) +
      appBlock('570', { playtime: '6000' }),
    ));
    const result = await getAllPlaytimes();
    expect(result['440']).toEqual({ playtimeMinutes: 120, lastPlayed: 1700000000 * 1000 });
    expect(result['570']).toEqual({ playtimeMinutes: 6000, lastPlayed: null });
  });

  it('ignora appids sin campo Playtime', async () => {
    const { getAllPlaytimes } = await import('../services/steamPlaytime.js');
    writeLocalconfig('1000', vdfWithApps(appBlock('7')));  // sin Playtime (Steam sin ficha)
    const result = await getAllPlaytimes();
    expect(result['7']).toBeUndefined();
  });

  it('con varias cuentas locales, se queda con el playtime MÁS ALTO por juego', async () => {
    const { getAllPlaytimes } = await import('../services/steamPlaytime.js');
    writeLocalconfig('1000', vdfWithApps(appBlock('440', { playtime: '50' })));
    writeLocalconfig('2000', vdfWithApps(appBlock('440', { playtime: '300' })));
    const result = await getAllPlaytimes();
    expect(result['440'].playtimeMinutes).toBe(300);
  });

  it('sin carpeta userdata (Steam recién instalado) → objeto vacío, no revienta', async () => {
    const { getAllPlaytimes } = await import('../services/steamPlaytime.js');
    // steamPath existe pero sin 'userdata' — fs.readdirSync falla, cae al catch
    fs.mkdirSync(steamPath, { recursive: true });
    expect(await getAllPlaytimes()).toEqual({});
  });

  it('sin instalación de Steam (getSteamPath → null) → objeto vacío', async () => {
    unmockCjsModule(scanSteamPath);
    mockCjsModule(scanSteamPath, { getSteamPath: async () => null });
    const { getAllPlaytimes } = await import('../services/steamPlaytime.js');
    expect(await getAllPlaytimes()).toEqual({});
  });
});
