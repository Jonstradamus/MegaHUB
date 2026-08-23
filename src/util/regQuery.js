const { execFile } = require('child_process');

// Versión async de `reg query <clave> /s` — antes cada scanner (steam, gog,
// battlenet, ubisoft/ea/rockstar vía _regApps) usaba execFileSync, que
// bloquea TODO el proceso principal de Electron mientras Windows enumera el
// registro (cientos de ms a varios segundos con muchos programas instalados).
// Con 5-6 scanners haciendo esto en paralelo al arranque, el proceso
// principal quedaba sin poder responder IPC ni repintar la ventana — la
// causa raíz del arranque lento y de la pantalla en blanco al minimizar/
// restaurar. execFile (async) libera el hilo principal mientras `reg.exe`
// corre en su propio proceso.
function regQuery(key, extraArgs = ['/s']) {
  return new Promise((resolve) => {
    execFile('reg', ['query', key, ...extraArgs], {
      encoding: 'utf8', maxBuffer: 30 * 1024 * 1024, windowsHide: true,
    }, (err, stdout) => resolve(err ? '' : stdout));
  });
}

module.exports = { regQuery };
