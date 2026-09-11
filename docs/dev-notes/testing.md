# Testing (Bloque G)

MegaHUB no tenía **ningún** test hasta esta sesión (2026-09-10/11) — ni
runner, ni un solo archivo. Esta nota explica la infraestructura que se montó
y las trampas que ya se pisaron, para que no haya que redescubrirlas.

## Runner: Vitest

`npm test` (`vitest run`) / `npm run test:watch`. Config en `vitest.config.js`
(raíz del repo). `vitest` está en `devDependencies` — no se empaqueta en el
build (`electron-builder` solo mete `src/**` + `ui/**`, ver `package.json`
→ `build.files`).

## La trampa: `electron` bajo Node puro no es un objeto

`require('electron')` **fuera** del proceso real de Electron (o sea, siempre
que corren los tests) devuelve un **string** — la ruta al `.exe` — no
`{ app, BrowserWindow, ... }`. Cualquier archivo que haga
`const { app } = require('electron')` (hoy solo `src/util/store.js`) explota
con `Cannot read properties of undefined` en cuanto se llama.

`vi.mock('electron', factory)` de Vitest **no sirve acá**: solo intercepta
sintaxis `import`, no el `require()` interno de un archivo CommonJS — y **todo**
`src/` de MegaHUB es CommonJS (`package.json` no declara `"type": "module"`).
Tampoco lo resuelve un `resolve.alias` de Vite, ni forzar
`ssr.noExternal`/`deps.inline` — se probaron los tres antes de encontrar lo
que sí funciona.

**Lo que sí funciona:** parchear a mano `require.cache` (el mismo objeto que
usa `require` internamente — es el `Module._cache` real y global del
proceso), *antes* de importar el módulo bajo prueba. Ver
`src/test/testUtils/cjsMock.mjs` — expone `mockElectronUserData(getDir)` para
el caso de `electron` puntual, y `mockCjsModule(absolutePath, exports)`
genérico para cortar cualquier otra dependencia local pesada (I/O real, red,
registro de Windows) de la misma forma. Usalo así:

```js
import { mockElectronUserData, unmockElectronUserData } from './testUtils/cjsMock.mjs';

beforeEach(() => mockElectronUserData(() => tmpDir));
afterEach(unmockElectronUserData);
```

## Por qué los tests son `.test.mjs`, no `.test.js`

Los tests usan `import`/`export` (Vitest). El resto de `src/` es CommonJS
puro. `eslint.config.mjs` ya distingue CJS vs ESM por carpeta/extensión (ver
su propio comentario de cabecera) — pero **ese archivo está protegido por un
hook y no se puede tocar** para agregar un bloque nuevo. La salida limpia:
darle extensión `.mjs` a los tests, que ESLint 9 parsea como ES module **por
su propio default**, sin necesitar ningún bloque de config nuevo (mismo
motivo por el que `scripts/lint-ci.mjs` ya era `.mjs`).

Consecuencia práctica: si necesitás un global de Node que `js.configs.recommended`
no conoce (`Buffer`, `URL`, `fetch`, `process`...), declaralo con un comentario
`/* global Buffer */` al principio del archivo — no hay `globals.node` puesto
para `src/test/**` en la config compartida.

## Qué queda cubierto (46 tests, 5 archivos)

| Archivo | Cubre | Cómo |
|---|---|---|
| `store.test.mjs` | `util/store.js` — escritura atómica (M12), fallback, cuarentena de JSON corrupto | electron mockeado, tmpdir real |
| `romMetadata.test.mjs` | `services/romMetadata.js` — parsing de cabeceras SNES/Genesis/GB/GBA/NDS/N64 + PARAM.SFO (PS3/PSP) | archivos sintéticos reales, sin mocks — API pública nada más |
| `steamPlaytime.test.mjs` | `services/steamPlaytime.js` — parsing de `localconfig.vdf` (bloques anidados) | `localconfig.vdf` sintético, `scanners/steam.getSteamPath` mockeado |
| `achievementEngine.test.mjs` | `services/achievementEngine.js` — lanzamientos, sesiones retro, streaks, `evaluate()` | electron + `steamPlaytime` mockeados |
| `dealsEngine.test.mjs` | `services/dealsEngine.js` — `getTopDeals`/`getRecommendations`: dedup, caché 6h, manejo de errores por tienda | `fetch` global mockeado + electron + `steamPlaytime` |

Ningún test cambió comportamiento de producción — donde hizo falta acceso a
una función interna no exportada, se probó por la API pública con datos
sintéticos en vez de exportar algo nuevo.

## Lo que falta (Bloque G, parte 2)

- El resto de `src/services/*.js` sin cubrir (25+ archivos) — `resolutionPresets.js`,
  `processWatcher.js`, `retroFolders.js`, etc.
- `src/main.js` (1266 L, todo el proceso principal) y `src/preload.js` — sin tests,
  necesitan una estrategia distinta (mockear todo `electron` de verdad, no solo `app`).
- El split de `ui/app.js` (5033 L, vanilla JS cargado por `<script src>` sin
  módulos) — planificado por separado, ver `docs/tech-debt/` cuando exista esa nota.
