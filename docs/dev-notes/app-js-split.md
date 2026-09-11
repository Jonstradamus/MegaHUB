# Split de `ui/app.js` (Bloque G, parte 2)

`ui/app.js` era un único archivo de **5033 líneas**, cargado como `<script src>`
clásico (sin `type="module"`) desde `ui/index.html` y `ui/dev.html`. Se dividió
en **21 archivos bajo `ui/app/`**, uno por sección — el propio archivo ya tenía
comentarios de sección (`/* ================= Nombre ================= */`)
que marcaban límites naturales y limpios, usados tal cual como cortes.

## Es un corte mecánico, no un rediseño

Cada archivo es exactamente el rango de líneas de su sección original, sin
tocar una sola línea de lógica. Se verificó **byte a byte**: concatenar los 21
archivos en orden reproduce `ui/app.js` original de forma idéntica (`cmp`/
`md5sum` antes de borrarlo). Cero cambio de comportamiento.

## Por qué NO son ES modules

Convertir a `<script type="module">` con `import`/`export` explícitos sería
el enfoque "de manual" — pero cambia semántica real: los módulos tienen su
propio scope (ya no un global compartido), se difieren automáticamente, y
corren en modo estricto. Verificar que nada dependa del scope global
compartido (¿algún handler inline? ¿algo que lea `window.nombreDeFunción`
desde fuera?) es un trabajo de auditoría mucho más grande que "dividir un
archivo", y esa clase de cambio de comportamiento no se hace sin aprobación
explícita del mantenedor.

Se mantuvo la arquitectura tal cual: **`<script src>` clásicos en secuencia**,
mismo scope global de siempre, mismo orden de carga que tenían las secciones
dentro del archivo único. El único requisito real es que **el orden de los
`<script>` en el HTML importe** (ver el comentario en `index.html`/`dev.html`)
— exactamente como importaba el orden de las secciones antes.

## La consecuencia: ESLint necesita que se le digan los cruces

Con todo en un solo archivo, ESLint veía todas las funciones/variables en el
mismo scope y nunca se quejaba de una referencia a algo definido más abajo o
más arriba. Al dividir, cada archivo se analiza por separado — **136 nombres**
se usan en un archivo distinto al que los define. Sin anotarlo, esto generó
777 errores `no-undef` falsos.

Se resolvió con las dos directivas estándar de ESLint para este caso exacto,
puestas a mano (mecánicamente, derivadas del propio output de ESLint — no a
ojo) al principio de cada archivo que las necesita:

- **`/* global nombre1, nombre2:writable */`** — "estos nombres existen, los
  define otro archivo". Sin `:writable` un nombre se asume de solo lectura
  (como `window`); los que el archivo REASIGNA (no solo lee) llevan
  `:writable`, si no ESLint tira `no-global-assign`.
- **`/* exported nombre1, nombre2 */`** — en el archivo que SÍ define el
  nombre, le dice a `no-unused-vars` que no lo marque como "nunca usado"
  aunque nada en ESE archivo lo llame.

## Los 16 warnings que quedaron (ver `.lint-baseline.json`)

`/* exported */` no cubre un caso: una variable que el archivo A **escribe**
(no define) y el archivo B **lee**. Ejemplo real: `01-icons.js` declara
`let videoAllowedFor = null`, pero quien la ESCRIBE es `04-toasts.js`
(`videoAllowedFor = id`) y quien la LEE es `07-details-panel.js`. Desde el
punto de vista aislado de `04-toasts.js`, esa asignación "nunca se lee" — no
existe un `/* exported */` para nombres declarados `/* global */`, solo para
los que el propio archivo define. Son 16 casos así, documentados en
`.lint-baseline.json` (`_actualizado`), y no revelan ningún bug: es ruido de
análisis estático por archivo, no comportamiento roto.

## Si agregás una sección nueva o movés código entre archivos

1. Actualizá el orden en **ambos** HTML (`index.html` y `dev.html`) si movés
   algo que se define antes de donde se usa.
2. Corré `npx eslint ui/app/` — cualquier `no-undef`/`no-unused-vars` nuevo te
   dice exactamente qué `/* global */`/`/* exported */` falta ajustar.
3. No hace falta tocar `eslint.config.mjs` para nada de esto — estos
   directivas van por archivo, en comentario.

## Verificación hecha en esta sesión

- Reconstrucción byte-idéntica contra el `ui/app.js` original (`cmp`).
- `node --check` en los 21 archivos (sintaxis válida individualmente).
- `npx eslint ui/app/` limpio salvo los 16 warnings explicados arriba.
- Arranque real (`npx electron .`) verificado a ojo: biblioteca de 126 juegos,
  panel de detalles, logros, vista Retro (grid de consolas) y buscador — todo
  renderizando y respondiendo a clics con normalidad.
