// ESLint — modo solo-reporte, misma filosofía que youtrulette/eslint.config.js:
// hay una deuda de lint heredada que NO se limpia de golpe; `scripts/lint-ci.mjs`
// compara contra `.lint-baseline.json` y solo deja que el número BAJE.
//
// MegaHUB no usa framework: `src/` + `scripts/` + `retroFolders.js` son Node/Electron
// (CommonJS); `ui/app.js` es el renderer (browser vanilla, cargado por <script src>
// en ui/index.html y ui/dev.html). Los <script> inline de los .html no los ve ESLint.
//
// Este archivo es .mjs (no .js) porque megahub/package.json no declara "type": "module"
// y no puede — los `src/**/*.js` son CommonJS (`require`/`module.exports`).
import js from '@eslint/js';
import globals from 'globals';

const RULES = {
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  // catch {} vacío = guard defensivo deliberado, no deuda real.
  'no-empty': ['error', { allowEmptyCatch: true }],
};

export default [
  {
    // `roms/`, `emulators/`, `scratch/` están en .gitignore pero ESLint 9 flat no
    // lee .gitignore por defecto → hay que ignorarlos aquí explícitamente.
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'roms/**',
      'emulators/**',
      'scratch/**',
    ],
  },
  js.configs.recommended,
  {
    // Proceso Electron/Node (CommonJS): main, preload, scanners, services, library,
    // util y los scripts de tooling .js/.cjs.
    files: ['src/**/*.js', 'scripts/**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: RULES,
  },
  {
    // Tooling en ESM (scripts/lint-ci.mjs y futuros .mjs).
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: RULES,
  },
  {
    // Renderer (browser).
    files: ['ui/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: RULES,
  },
];
