// ─── Helper de test: mockear require() de módulos CommonJS ─────────────────────
// `vi.mock(...)` de Vitest NO intercepta el `require(...)` interno de un
// archivo CommonJS puro (todo `src/` de MegaHUB, sin excepción) — solo
// funciona para sintaxis `import`. Confirmado con 'electron': fuera del
// proceso real de Electron, `require('electron')` devuelve un STRING (la ruta
// al .exe), no {app, BrowserWindow...}, y ni `vi.mock` ni `resolve.alias` de
// Vite logran sustituirlo para código que lo pide con `require`.
//
// La solución que sí funciona, sin importar cómo Vite haya cargado el
// archivo: parchear a mano el cache de módulos de Node (`require.cache`, el
// mismo objeto que usa `require` internamente — es el `Module._cache` real y
// global del proceso). Sirve para 'electron' (mockElectronUserData) y para
// cualquier otro módulo local pesado (I/O real, red, registro de Windows —
// mockCjsModule genérico).
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const electronPath = nodeRequire.resolve('electron');

export function mockElectronUserData(getDir) {
  nodeRequire.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: { app: { getPath: () => getDir() } },
  };
}

export function unmockElectronUserData() {
  delete nodeRequire.cache[electronPath];
}

// Mismo mecanismo, generalizado para cualquier módulo local (no solo
// 'electron'): útil para cortar una dependencia CommonJS pesada (I/O real,
// red, registro de Windows) sin poder usar `vi.mock` — ver el porqué arriba.
// `absolutePath` debe ser exactamente la ruta que Node resuelve internamente
// para el `require(...)` que se quiere interceptar (mismo directorio +
// extensión que ve el archivo que lo importa).
export function mockCjsModule(absolutePath, exportsObj) {
  nodeRequire.cache[absolutePath] = {
    id: absolutePath,
    filename: absolutePath,
    loaded: true,
    exports: exportsObj,
  };
}

export function unmockCjsModule(absolutePath) {
  delete nodeRequire.cache[absolutePath];
}
