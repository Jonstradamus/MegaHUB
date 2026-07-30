// Tamaño de instalación cuando el launcher no lo declara en su manifiesto/registro
// (GOG, Xbox/UWP) — se recorre la carpeta a mano sumando el tamaño de cada
// archivo. Solo se usa como último recurso: es más lento que leer un campo ya
// calculado (Steam/Epic/Battle.net/Ubisoft/EA/Rockstar sí lo traen gratis).
const fs = require('fs');
const path = require('path');

async function dirSize(dir) {
  let total = 0;
  let entries;
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue; // evita ciclos/enlaces colgantes
    if (entry.isDirectory()) {
      total += await dirSize(full);
    } else if (entry.isFile()) {
      try { total += (await fs.promises.stat(full)).size; } catch {}
    }
  }
  return total;
}

// Para una ROM local: puede ser un archivo suelto (.iso, .zip…) o, en algunas
// consolas (PS3, PSP con estructura de disco), una carpeta — un fs.stat()
// simple en una carpeta no da el tamaño real de su contenido en Windows.
async function pathSize(target) {
  try {
    const st = await fs.promises.stat(target);
    if (st.isDirectory()) return dirSize(target);
    return st.size;
  } catch {
    return null;
  }
}

module.exports = { dirSize, pathSize };
