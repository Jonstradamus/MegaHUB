# Dev notes

Notas de desarrollo por tema — el porqué de una decisión, no solo el qué (eso
ya lo dice el código). Se completan a medida que cada área pasa por una
revisión a fondo. Mismo espíritu que las dev-notes de Deriva (repo hermano).

- [testing.md](testing.md) — Bloque G parte 1: infraestructura de tests (Vitest) que no existía, el mock de `electron` y qué queda cubierto.
- [app-js-split.md](app-js-split.md) — Bloque G parte 2: `ui/app.js` (5033 L) dividido en 21 archivos, cómo se hizo y por qué quedaron 16 warnings de lint nuevos (no son bugs).
- [electron-titlebar-regression.md](electron-titlebar-regression.md) — por qué `electron` está fijado en `44.0.0` exacto (sin `^`): a partir de algún parche entre 44.0.0 y `^44.3.0` los botones de la titlebar propia (minimizar/maximizar/cerrar) y el plegado del modo widget dejan de responder a clics reales de mouse. Confirmado por bisección binaria (33→38→41→42→43→44.0.0, todos bien; `^44.3.0` mal).
