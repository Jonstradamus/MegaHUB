// ─────────────────────────────────────────────────────────────────────────────
// scripts/lint-ci.mjs — verja de lint para CI.
//
// ESLint está en modo solo-reporte (ver eslint.config.js): hay una línea base
// de problemas heredados que NO se limpia de golpe. Este script deja pasar esa
// base pero FALLA si el número SUBE — así el lint solo puede mejorar con el
// tiempo. Cuando arregles cosas, baja los números de .lint-baseline.json.
//
// Uso: `npm run lint:ci` (local o en GitHub Actions).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';

const baselinePath = new URL('../.lint-baseline.json', import.meta.url);
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const eslint = new ESLint();
const results = await eslint.lintFiles(['.']);

const problems = results.reduce((n, r) => n + r.errorCount + r.warningCount, 0);
const errors = results.reduce((n, r) => n + r.errorCount, 0);

console.log(`ESLint ahora: ${problems} problemas, ${errors} errores`);
console.log(`Baseline:     ${baseline.problems} problemas, ${baseline.errors} errores`);

if (problems > baseline.problems || errors > baseline.errors) {
  console.error(
    '\n✗ El lint EMPEORÓ respecto al baseline.\n' +
    '  Arregla los problemas nuevos que introdujo el cambio. Si de verdad son\n' +
    '  inevitables, sube los números en .lint-baseline.json a mano y explica por qué\n' +
    '  en el mensaje del commit.',
  );
  process.exit(1);
}

if (problems < baseline.problems || errors < baseline.errors) {
  console.log(
    `\n✓ El lint MEJORÓ (${baseline.problems - problems} problemas menos, ` +
    `${baseline.errors - errors} errores menos).\n` +
    '  Baja .lint-baseline.json a los números de arriba para fijar la mejora.',
  );
}

console.log('\n✓ Lint dentro del baseline.');
