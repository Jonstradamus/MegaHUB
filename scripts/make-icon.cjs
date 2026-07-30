// ─── Genera build/icon.ico a partir de los PNG oficiales de marca DERIVA ─────
// (ui/brand/deriva-icon-*.png, copiados de youtrulette/public/brand) — sin
// dependencias, empaquetando cada PNG ya existente como un frame del .ico
// (formato soportado desde Windows Vista). Reemplaza el icono por defecto de
// Electron en la barra de tareas / título de ventana / .exe empaquetado.
// Uso:  node scripts/make-icon.cjs   (desde megahub/)
const fs = require('fs');
const path = require('path');

const BRAND_DIR = path.join(__dirname, '..', 'ui', 'brand');
const OUT_DIR = path.join(__dirname, '..', 'build');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

function packIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const parts = [header, dir];
  images.forEach((im, i) => {
    const e = i * 16;
    dir.writeUInt8(im.size >= 256 ? 0 : im.size, e + 0);
    dir.writeUInt8(im.size >= 256 ? 0 : im.size, e + 1);
    dir.writeUInt16LE(1, e + 4);   // planes
    dir.writeUInt16LE(32, e + 6);  // bpp
    dir.writeUInt32LE(im.png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += im.png.length;
    parts.push(im.png);
  });
  return Buffer.concat(parts);
}

const images = SIZES.map((size) => {
  const file = path.join(BRAND_DIR, `deriva-icon-${size}.png`);
  return { size, png: fs.readFileSync(file) };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
const ico = packIco(images);
fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
console.log(`build/icon.ico (${SIZES.join('/')} px, ${ico.length} bytes)`);
