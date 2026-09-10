const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function storePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

// Escritura atómica: se escribe a un `.tmp` y se renombra encima del destino
// (rename es atómico dentro del mismo volumen). Si el proceso muere a media
// escritura, el `.json` de verdad queda intacto — antes un `writeFileSync`
// interrumpido dejaba el archivo truncado y la siguiente lectura lo daba por
// corrupto y devolvía el fallback (= "perdí toda la biblioteca / la sesión").
function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows puede dar EPERM/EBUSY si otro proceso tiene el archivo abierto.
    // Degradación = escritura directa, exactamente como antes (no peor).
    fs.writeFileSync(file, JSON.stringify(data));
    try { fs.unlinkSync(tmp); } catch { /* limpieza best-effort */ }
  }
}

exports.load = function (name, fallback = null) {
  const file = storePath(name);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return fallback; // no existe todavía (o no se puede leer) — caso normal
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    // El archivo existe pero no es JSON válido (corte a media escritura de una
    // versión vieja, disco con fallos...). Se aparta con timestamp para no
    // pisarlo en el próximo save y poder diagnosticar; se sigue con el fallback.
    try {
      const bad = `${file}.corrupt-${Date.now()}.json`;
      fs.renameSync(file, bad);
      console.error(`[store] "${name}.json" corrupto — apartado como ${path.basename(bad)} (${err.message})`);
    } catch { /* si ni se puede renombrar, igual devolvemos el fallback */ }
    return fallback;
  }
};

exports.save = function (name, data) {
  writeJsonAtomic(storePath(name), data);
};
