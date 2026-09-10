// Descompresión genérica compartida por emulatorDownload.js/textureDownload.js
// (y usable por cualquier otro flujo futuro que baje un archivo comprimido):
// zip, 7z y rar, elegido según la extensión real del archivo.
//
// - .zip -> adm-zip: descomprime en JavaScript puro, SIN shell. Antes esto era
//   `Expand-Archive` de PowerShell con las rutas interpoladas dentro del string
//   de `-Command` — un nombre de archivo del catálogo remoto con una comilla
//   cerraba el argumento e inyectaba PowerShell arbitrario. adm-zip recibe la
//   ruta como valor, no como texto de shell, así que esa clase de bug desaparece
//   (y de paso queda igual de portable que `.rar`, sin depender de Windows).
// - .7z  -> 7zip-min (envuelve el 7za.exe portable de 7zip-bin).
// - .rar -> node-unrar-js: extrae en JavaScript/WASM puro (compilado del propio
//   unrar oficial), SIN binario nativo que ejecutar — evita el problema que
//   tuvo 7zip-bin de depender de que electron-builder desempaque el .exe
//   correcto del asar (ver commit del fix de ENOENT), y funciona igual en
//   cualquier plataforma sin binarios por arquitectura.
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const sevenZip = require('7zip-min');
const { createExtractorFromFile } = require('node-unrar-js');

// NO se usa `AdmZip#extractAllTo`: sigue symlinks del propio archivo al escribir
// (GHSA-vwc7-r8mq-g2x9, sin corregir en 0.6.x) y no valida zip-slip. Se recorre
// entrada por entrada:
//  - la ruta resuelta de cada entrada tiene que quedar DENTRO de destDir (si no,
//    se aborta — zip-slip);
//  - `entry.getData()` devuelve el CONTENIDO de la entrada; al escribirlo con
//    `fs.writeFileSync` se crea siempre un archivo normal, nunca un symlink, así
//    que un archivo con una entrada tipo enlace no puede redirigir escrituras
//    posteriores fuera de la carpeta.
async function extractZip(zipPath, destDir) {
  const root = path.resolve(destDir);
  fs.mkdirSync(root, { recursive: true });
  for (const entry of new AdmZip(zipPath).getEntries()) {
    const target = path.resolve(root, entry.entryName);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`ZIP inseguro: "${entry.entryName}" apunta fuera de la carpeta destino.`);
    }
    if (entry.isDirectory) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
  }
}

function extract7z(archivePath, destDir) {
  return new Promise((resolve, reject) => {
    sevenZip.unpack(archivePath, destDir, (err) => (err ? reject(err) : resolve()));
  });
}

async function extractRar(archivePath, destDir) {
  const extractor = await createExtractorFromFile({ filepath: archivePath, targetPath: destDir });
  const extracted = extractor.extract();
  // Los iteradores son "lazy" — si no se recorren hasta el final, el objeto
  // C++ de la librería no se destruye (fuga de memoria), según la propia
  // documentación de node-unrar-js. Recorrerlo también es lo que de verdad
  // dispara la extracción de cada archivo a disco.
  [...extracted.files];
}

// true si la extensión es una que MegaHUB sabe descomprimir.
function isSupportedArchive(fileName) {
  return /\.(zip|7z|rar)$/i.test(fileName);
}

async function extractArchive(archivePath, destDir) {
  const ext = path.extname(archivePath).toLowerCase();
  if (ext === '.zip') return extractZip(archivePath, destDir);
  if (ext === '.7z') return extract7z(archivePath, destDir);
  if (ext === '.rar') return extractRar(archivePath, destDir);
  throw new Error(`Formato de archivo no soportado: "${ext || archivePath}" (solo .zip, .7z y .rar).`);
}

module.exports = { extractArchive, isSupportedArchive };
