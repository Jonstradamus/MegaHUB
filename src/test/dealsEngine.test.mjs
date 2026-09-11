// ─── dealsEngine.js — ofertas de CheapShark + recomendación por microgénero ────
// fetch se mockea por completo (sin red real en tests). La persistencia usa
// util/store.js real, con electron.app.getPath mockeado — así se cubre
// también el cacheo de 6h tal cual lo usa la app. steamPlaytime se mockea
// para no pegarle al registro de Windows (ver achievementEngine.test.mjs).
/* global URL, fetch */
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
let fakePlaytimes;

// Deal "crudo" con la forma exacta que devuelve CheapShark /deals?storeID=.
function rawDeal({ dealID, title, storeID, salePrice, normalPrice, savings = 50, dealRating = 8 }) {
  return {
    dealID, title, storeID: String(storeID), salePrice: String(salePrice), normalPrice: String(normalPrice),
    savings: String(savings), thumb: 'https://example.com/thumb.jpg', steamAppID: null,
    releaseDate: '0', metacriticScore: '0', steamRatingCount: '0', steamRatingPercent: '0', dealRating: String(dealRating),
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'megahub-deals-test-'));
  mockElectronUserData(() => tmpDir);
  fakePlaytimes = {};
  mockCjsModule(steamPlaytimePath, { getAllPlaytimes: async () => fakePlaytimes });
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  unmockElectronUserData();
  unmockCjsModule(steamPlaytimePath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

function storeIdFrom(url) {
  return new URL(url).searchParams.get('storeID');
}

describe('getTopDeals', () => {
  it('agrupa por tienda (steam/gog/epic/other) y descarta savings < 5%', async () => {
    fetch.mockImplementation(async (url) => {
      const id = storeIdFrom(url);
      let deals = [];
      if (id === '1') deals = [rawDeal({ dealID: 'a', title: 'Hollow Knight', storeID: 1, salePrice: 5, normalPrice: 15, savings: 66 })];
      if (id === '7') deals = [rawDeal({ dealID: 'b', title: 'Disco Elysium', storeID: 7, salePrice: 19, normalPrice: 20, savings: 4 })]; // < 5%, se filtra
      return { ok: true, json: async () => deals };
    });

    const { getTopDeals } = await import('../services/dealsEngine.js');
    const result = await getTopDeals({ force: true });

    expect(result.steam).toHaveLength(1);
    expect(result.steam[0]).toMatchObject({ title: 'Hollow Knight', storeName: 'Steam', salePrice: 5, savings: 66 });
    expect(result.gog).toHaveLength(0); // el único deal de GOG tenía savings < 5%
    expect(result.errors).toEqual([]);
  });

  it('deduplica por título, quedándose con el precio más bajo', async () => {
    fetch.mockImplementation(async (url) => {
      const id = storeIdFrom(url);
      if (id !== '1') return { ok: true, json: async () => [] };
      return {
        ok: true, json: async () => [
          rawDeal({ dealID: 'x1', title: 'Hades', storeID: 1, salePrice: 15, dealRating: 5 }),
          rawDeal({ dealID: 'x2', title: 'hades', storeID: 1, salePrice: 10, dealRating: 9 }), // mismo título, minúsculas
        ],
      };
    });
    const { getTopDeals } = await import('../services/dealsEngine.js');
    const result = await getTopDeals({ force: true });
    expect(result.steam).toHaveLength(1);
    expect(result.steam[0].salePrice).toBe(10);
  });

  it('usa la caché de 6h en vez de pegarle a la red de nuevo', async () => {
    fetch.mockImplementation(async () => ({ ok: true, json: async () => [] }));
    const { getTopDeals } = await import('../services/dealsEngine.js');
    await getTopDeals({ force: true });
    const callsAfterFirst = fetch.mock.calls.length;
    await getTopDeals(); // sin force → debería usar caché, cero fetch nuevos
    expect(fetch.mock.calls.length).toBe(callsAfterFirst);
  });

  it('si una tienda falla, reporta el error y conserva el resto', async () => {
    fetch.mockImplementation(async (url) => {
      const id = storeIdFrom(url);
      if (id === '1') throw new Error('network down');
      return { ok: true, json: async () => [] };
    });
    const { getTopDeals } = await import('../services/dealsEngine.js');
    const result = await getTopDeals({ force: true });
    expect(result.errors).toContain('Steam');
    expect(result.gog).toEqual([]);
  });
});

describe('getRecommendations', () => {
  it('sin playtime de Steam registrado, no hay microgénero dominante → null', async () => {
    const { getRecommendations } = await import('../services/dealsEngine.js');
    const result = await getRecommendations({ force: true });
    expect(result).toBeNull();
  });
});
