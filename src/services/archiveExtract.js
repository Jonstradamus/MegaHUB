// Descompresión genérica compartida por emulatorDownload.js/textureDownload.js
// (y usable por cualquier otro flujo futuro que baje un archivo comprimido):
// zip, 7z y rar, elegido según la extensión real del archivo.
//
// - .zip -> Expand-Archive de PowerShell (viene con Windows, sin dependencias).
// - .7z  -> 7zip-min (envuelve el 7za.exe portable de 7zip-bin).
// - .rar -> node-unrar-js: extrae en JavaScript/WASM puro (compilado del propio
//   unrar oficial), SIN binario nativo que ejecutar — evita el problema que
//   tuvo 7zip-bin de depender de que electron-builder desempaque el .exe
//   correcto del asar (ver commit del fix de ENOENT), y funciona igual en
//   cualquier plataforma sin binarios por arquitectura.
const path = require('path');
const { execFile } = require('child_process');
const sevenZip = require('7zip-min');
const { createExtractorFromFile } = require('node-unrar-js');

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`,
    ], (err) => (err ? reject(err) : resolve()));
  });
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
