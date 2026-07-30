// ─── Genera el ícono "Mando Contorno" de GameVault (solo trazo) ─────────────
// Reemplaza el ícono prestado de DERIVA (deriva-icon-*.png) por una marca
// propia de la app, dibujada a pixel con funciones de distancia con signo
// (mismo enfoque que companion-desktop/tools/make-icon.cjs) — sin
// dependencias de imagen externas. Genera:
//   ui/brand/gamevault-icon-<size>.png   (16..512, fondo transparente)
//   build/icon.ico                        (16..256, empaquetado)
// Uso:  node scripts/make-brand.cjs   (desde megahub/)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC32 / PNG mínimo (idéntico al de companion-desktop) ──
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ── Paleta (mismos tokens que ui/app.css) ──
const VIOLET = [139, 92, 246];
const CYAN = [34, 211, 238];
const WHITE = [255, 255, 255];
const WELL = [14, 10, 24]; // hueco tallado en los botones/D-pad, casi --void

const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ── SDF helpers (Inigo Quilez) — distancia con signo, negativa = dentro ──
function sdRoundedRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - halfW + r;
  const qy = Math.abs(py - cy) - halfH + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
function sdCircle(px, py, cx, cy, r) { return Math.hypot(px - cx, py - cy) - r; }
// Blob elíptico de caída suave — mismo truco que ellipseA en companion-desktop,
// reutilizado acá para las puntas del destello (radios muy distintos = punta fina).
function ellipseBlob(px, py, cx, cy, rx, ry, k) {
  const v = 1 - (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2);
  return clamp01(v * k);
}
// dist -> alpha con un borde antialiaseado de ~1px (aa en unidades normalizadas)
function edgeAlpha(dist, aa) { return clamp01(0.5 - dist / aa); }
function over(topColor, topA, botColor, botA) {
  const outA = topA + botA * (1 - topA);
  if (outA <= 0) return { color: [0, 0, 0], a: 0 };
  const col = [0, 1, 2].map(i => (topColor[i] * topA + botColor[i] * botA * (1 - topA)) / outA);
  return { color: col, a: outA };
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const aa = 1.4 / size;
  const strokeHalf = 0.017;

  // ── Geometría del mando (coordenadas normalizadas 0..1, origen arriba-izq) ──
  // Diseño "Mando Contorno": la misma silueta pill + dos humps de Orbit Pad,
  // pero solo el trazo — sin relleno, sin D-pad/botones, sin arco ni destello.
  const bodyRect = { cx: 0.5, cy: 0.52, hw: 0.34, hh: 0.135, r: 0.10 };
  const humpL = { cx: 0.305, cy: 0.435, r: 0.185 };
  const humpR = { cx: 0.695, cy: 0.435, r: 0.185 };

  for (let py8 = 0; py8 < size; py8++) {
    for (let px8 = 0; px8 < size; px8++) {
      const px = (px8 + 0.5) / size, py = (py8 + 0.5) / size;
      const i = (py8 * size + px8) * 4;

      // -- Contorno: distancia a la unión pill + dos humps, solo el anillo del trazo --
      const distBody = Math.min(
        sdRoundedRect(px, py, bodyRect.cx, bodyRect.cy, bodyRect.hw, bodyRect.hh, bodyRect.r),
        sdCircle(px, py, humpL.cx, humpL.cy, humpL.r),
        sdCircle(px, py, humpR.cx, humpR.cy, humpR.r),
      );
      const strokeA = edgeAlpha(Math.abs(distBody) - strokeHalf, aa);
      // Degradado diagonal violeta→cian, igual dirección que el resto de la marca DERIVA
      const strokeColor = mix(VIOLET, CYAN, px * 0.55 + py * 0.45);

      buf[i] = Math.round(strokeColor[0]);
      buf[i + 1] = Math.round(strokeColor[1]);
      buf[i + 2] = Math.round(strokeColor[2]);
      buf[i + 3] = Math.round(clamp01(strokeA) * 255);
    }
  }
  return buf;
}

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];
const BRAND_DIR = path.join(__dirname, '..', 'ui', 'brand');
const BUILD_DIR = path.join(__dirname, '..', 'build');
fs.mkdirSync(BRAND_DIR, { recursive: true });
fs.mkdirSync(BUILD_DIR, { recursive: true });

const pngs = {};
for (const size of SIZES) {
  const png = encodePNG(size, size, render(size));
  pngs[size] = png;
  fs.writeFileSync(path.join(BRAND_DIR, `gamevault-icon-${size}.png`), png);
  console.log(`ui/brand/gamevault-icon-${size}.png (${png.length} bytes)`);
}

// Íconos DERIVA que ya no se usan como marca propia de la app — se borran en
// vez de dejarlos huérfanos en el repo (GameVault tiene su propia identidad).
for (const stale of fs.readdirSync(BRAND_DIR)) {
  if (stale.startsWith('deriva-')) fs.unlinkSync(path.join(BRAND_DIR, stale));
}

// ── .ico (hasta 256px, el máximo que soporta bien el formato) ──
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
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(im.png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += im.png.length;
    parts.push(im.png);
  });
  return Buffer.concat(parts);
}
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const ico = packIco(icoSizes.map((s) => ({ size: s, png: pngs[s] })));
fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico);
console.log(`build/icon.ico (${icoSizes.join('/')} px, ${ico.length} bytes)`);
