// Config mínima del runner de tests (Bloque G — MegaHUB no tenía ninguno).
//
// Los tests son `.test.mjs` (no `.test.js`) a propósito: usan `import`/
// `export`, y el resto de `src/` es CommonJS puro (`package.json` no declara
// "type": "module", ver eslint.config.mjs) — con extensión `.mjs` ESLint los
// parsea como ESM por su propio default, sin tocar la config de lint (mismo
// motivo por el que `scripts/lint-ci.mjs` es `.mjs`).
//
// Los archivos que usan Electron (`require('electron')`, ej. util/store.js)
// se mockean a mano parcheando `require.cache` en el propio test — ver el
// comentario en src/test/testUtils/cjsMock.mjs: `vi.mock('electron', ...)` no
// intercepta el `require()` interno de un archivo CommonJS puro como los de
// este proyecto (solo funciona para `import`), así que no hace falta ninguna
// config especial acá para eso.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.mjs'],
  },
});
