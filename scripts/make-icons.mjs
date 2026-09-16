/**
 * Generates the PWA icon set as real PNGs, with no image dependencies.
 *
 * Draws a house silhouette with a checkmark cut out of it, which is what the
 * app is: a checklist for houses. Run with `node scripts/make-icons.mjs`.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const GREEN = [28, 107, 82, 255];
const CREAM = [250, 249, 246, 255];

// ---------------------------------------------------------------- png writer

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- drawing

/** 4x supersampled canvas, so edges come out smooth without a graphics lib. */
function draw(size, { maskable }) {
  const SS = 4;
  const S = size * SS;
  const acc = new Float64Array(S * S * 4);

  const put = (x, y, [r, g, b, a]) => {
    const i = (y * S + x) * 4;
    const alpha = a / 255;
    // Simple source-over onto whatever is already there.
    acc[i] = acc[i] * (1 - alpha) + r * alpha;
    acc[i + 1] = acc[i + 1] * (1 - alpha) + g * alpha;
    acc[i + 2] = acc[i + 2] * (1 - alpha) + b * alpha;
    acc[i + 3] = Math.max(acc[i + 3], a);
  };

  const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };

  const inTriangle = (px, py, ax, ay, bx, by, cx2, cy2) => {
    const d = (bx - ax) * (cy2 - ay) - (cx2 - ax) * (by - ay);
    const s = ((px - ax) * (cy2 - ay) - (py - ay) * (cx2 - ax)) / d;
    const t = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / d;
    return s >= 0 && t >= 0 && s + t <= 1;
  };

  const nearSegment = (px, py, ax, ay, bx, by, halfWidth) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.min(1, Math.max(0, t));
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    return (px - qx) ** 2 + (py - qy) ** 2 <= halfWidth * halfWidth;
  };

  // Background: full bleed for maskable, rounded square otherwise.
  const bgRadius = maskable ? 0 : S * 0.22;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (maskable || inRoundRect(x, y, 0, 0, S - 1, S - 1, bgRadius)) put(x, y, GREEN);
    }
  }

  // Glyph geometry. Maskable keeps the glyph inside the safe circle.
  const pad = S * (maskable ? 0.26 : 0.19);
  const w = S - pad * 2;
  const apexX = S / 2;
  const apexY = pad;
  const eaveY = pad + w * 0.44;
  const bodyX0 = pad + w * 0.13;
  const bodyX1 = S - pad - w * 0.13;
  const bodyY1 = S - pad;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const inRoof = inTriangle(x, y, apexX, apexY, pad, eaveY, S - pad, eaveY);
      const inBody = x >= bodyX0 && x <= bodyX1 && y >= eaveY - 1 && y <= bodyY1;
      if (inRoof || inBody) put(x, y, CREAM);
    }
  }

  // Checkmark cut out of the body, in the background colour.
  const ckW = (bodyX1 - bodyX0) * 0.62;
  const ckX = (bodyX0 + bodyX1) / 2 - ckW / 2;
  const ckY = (eaveY + bodyY1) / 2;
  const half = w * 0.055;
  const a = [ckX, ckY];
  const b = [ckX + ckW * 0.36, ckY + ckW * 0.34];
  const c = [ckX + ckW, ckY - ckW * 0.42];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (
        nearSegment(x, y, a[0], a[1], b[0], b[1], half) ||
        nearSegment(x, y, b[0], b[1], c[0], c[1], half)
      ) {
        put(x, y, GREEN);
      }
    }
  }

  // Downsample the supersampled buffer.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b2 = 0;
      let al = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * S + (x * SS + sx)) * 4;
          r += acc[i];
          g += acc[i + 1];
          b2 += acc[i + 2];
          al += acc[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b2 / n);
      out[o + 3] = Math.round(al / n);
    }
  }
  return out;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1c6b52"/>
  <path d="M50 19 L81 63 L19 63 Z M31 61 h38 v20 h-38 Z" fill="#faf9f6"/>
  <path d="M40 71 l7 7 l14 -14" fill="none" stroke="#1c6b52" stroke-width="6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

mkdirSync(OUT, { recursive: true });

const targets = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
];

for (const [name, size, opts] of targets) {
  writeFileSync(resolve(OUT, name), encodePng(size, size, draw(size, opts)));
  console.log(`wrote ${name} (${size}x${size})`);
}

writeFileSync(resolve(OUT, 'favicon.svg'), SVG);
console.log('wrote favicon.svg');
