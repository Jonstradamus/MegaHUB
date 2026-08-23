// ─── Genera el ícono "Píldora + Puntos" de MegaHUB (rebranding naranja) ─────
// Reemplaza el ícono "Rombo + Capas" por la marca corta actual: una píldora
// (cápsula) con dos puntos adentro, dentro de un cuadro redondeado — mismo
// trazo que el ícono del sidebar (ver #logo-mark en ui/index.html/app.css).
// El trazo de la píldora es naranja fijo acá: el hover a violeta→cian solo
// existe en la UI en vivo (SVG + CSS), un .ico/.png estático no puede tener
// estado. Los dos puntos SÍ tienen color fijo siempre (violeta + magenta,
// no participan del hover ni en la UI en vivo — son la "marca" del ícono en
// sí). Dibujado a pixel con funciones de distancia con signo (mismo enfoque
// que companion-desktop/tools/make-icon.cjs) — sin dependencias de imagen
// externas. Genera:
//   ui/brand/megahub-icon-<size>.png     (16..512, fondo transparente)
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

// ── Paleta (mismos tokens que ui/app.css: --megahub-orange / --megahub-orange2) ──
const ORANGE1 = [255, 176, 32];
const ORANGE2 = [255, 90, 31];
// Puntos internos — color fijo, tomado directo del arte de referencia (no
// son un token de tema, ver comentario de cabecera).
const DOT_VIOLET = [95, 42, 199];
const DOT_MAGENTA = [204, 14, 104];

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

  // ── Geometría "Píldora + Puntos" (coordenadas normalizadas 0..1, origen
  // arriba-izq) — mismo trazado que el SVG #logo-mark del sidebar
  // (ui/index.html), reescalado de un viewBox de 200 a 0..1 (÷200). Medido
  // pixel a pixel sobre el arte de referencia (píldora tipo "stadium", radio
  // = mitad de su alto; dos puntos internos cerca del extremo derecho). ──
  const border = { cx: 0.5, cy: 0.5, hw: 0.406, hh: 0.406, r: 0.12, strokeHalf: 0.02 };
  const pill = { cx: 0.5, cy: 0.5, hw: 0.35, hh: 0.165, r: 0.165, strokeHalf: 0.0175 };
  const dot1 = { cx: 0.56, cy: 0.5, r: 0.0575 };
  const dot2 = { cx: 0.715, cy: 0.5, r: 0.0575 };

  for (let py8 = 0; py8 < size; py8++) {
    for (let px8 = 0; px8 < size; px8++) {
      const px = (px8 + 0.5) / size, py = (py8 + 0.5) / size;
      const i = (py8 * size + px8) * 4;

      // Degradado diagonal naranja, misma dirección que el linearGradient
      // (x1,y1)=(0,0) a (x2,y2)=(1,1) del SVG en vivo.
      const gradColor = mix(ORANGE1, ORANGE2, px * 0.55 + py * 0.45);

      let col = [0, 0, 0], a = 0;

      // -- Cuadro redondeado (solo el anillo del trazo) --
      const distBorder = sdRoundedRect(px, py, border.cx, border.cy, border.hw, border.hh, border.r);
      const borderA = edgeAlpha(Math.abs(distBorder) - border.strokeHalf, aa);
      ({ color: col, a } = over(gradColor, clamp01(borderA), col, a));

      // -- Píldora (solo el anillo del trazo, radio = mitad del alto) --
      const distPill = sdRoundedRect(px, py, pill.cx, pill.cy, pill.hw, pill.hh, pill.r);
      const pillA = edgeAlpha(Math.abs(distPill) - pill.strokeHalf, aa);
      ({ color: col, a } = over(gradColor, clamp01(pillA), col, a));

      // -- Dos puntos rellenos, color fijo (no siguen el degradado naranja) --
      const dot1A = edgeAlpha(sdCircle(px, py, dot1.cx, dot1.cy, dot1.r), aa);
      ({ color: col, a } = over(DOT_VIOLET, clamp01(dot1A), col, a));
      const dot2A = edgeAlpha(sdCircle(px, py, dot2.cx, dot2.cy, dot2.r), aa);
      ({ color: col, a } = over(DOT_MAGENTA, clamp01(dot2A), col, a));

      buf[i] = Math.round(col[0]);
      buf[i + 1] = Math.round(col[1]);
      buf[i + 2] = Math.round(col[2]);
      buf[i + 3] = Math.round(clamp01(a) * 255);
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
  fs.writeFileSync(path.join(BRAND_DIR, `megahub-icon-${size}.png`), png);
  console.log(`ui/brand/megahub-icon-${size}.png (${png.length} bytes)`);
}

// Íconos de marcas/nombres viejos que ya no se usan — se borran en vez de
// dejarlos huérfanos en el repo (rebranding "Rombo + Capas" naranja).
for (const stale of fs.readdirSync(BRAND_DIR)) {
  if (stale.startsWith('deriva-') || stale.startsWith('gamevault-icon-')) fs.unlinkSync(path.join(BRAND_DIR, stale));
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
