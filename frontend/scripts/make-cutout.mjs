// One-off: cuts the person out of a product photo onto a transparent background.
//   node scripts/make-cutout.mjs <photo.jpg> <out.png>
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { pipeline, RawImage } from '@huggingface/transformers';

const [photoPath, outPath] = process.argv.slice(2);
if (!photoPath || !outPath) {
  console.error('Usage: node scripts/make-cutout.mjs <photo.jpg> <out.png>');
  process.exit(1);
}

const { data: rgb, info } = await sharp(photoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, n = W * H;
console.log(`Photo ${W}x${H}`);

console.log('Segmenting…');
const segment = await pipeline('image-segmentation', 'Xenova/segformer_b2_clothes');
const image = new RawImage(new Uint8ClampedArray(rgb), W, H, 3);
const results = await segment(image);

function dilate(m, r) {
  let cur = m;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (cur[p]) { next[p] = 1; continue; }
      const x = p % W;
      if ((x > 0 && cur[p - 1]) || (x < W - 1 && cur[p + 1]) || (p >= W && cur[p - W]) || (p < n - W && cur[p + W])) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}
function erode(m, r) {
  let cur = m;
  for (let i = 0; i < r; i++) {
    const next = new Uint8Array(n);
    for (let p = W; p < n - W; p++) {
      const x = p % W;
      if (cur[p] && x > 0 && x < W - 1 && cur[p - 1] && cur[p + 1] && cur[p - W] && cur[p + W]) next[p] = 1;
    }
    cur = next;
  }
  return cur;
}
const closeGaps = (m, r) => erode(dilate(m, r), r);

const m = new Uint8Array(n);
for (const r of results) {
  if (r.label === 'Background') continue;
  const mk = r.mask;
  for (let y = 0; y < H; y++) {
    const my = Math.min(mk.height - 1, Math.floor((y * mk.height) / H));
    for (let x = 0; x < W; x++) {
      const mx = Math.min(mk.width - 1, Math.floor((x * mk.width) / W));
      if (mk.data[my * mk.width + mx] > 127) m[y * W + x] = 1;
    }
  }
}
const person = closeGaps(m, 6);

const alphaRaw = Buffer.alloc(n);
for (let p = 0; p < n; p++) alphaRaw[p] = person[p] ? 255 : 0;
// .extractChannel(0) after .blur() works around a sharp/libvips bug where blurring a raw
// single-channel buffer directly produces horizontal striping in the output.
const alpha = await sharp(alphaRaw, { raw: { width: W, height: H, channels: 1 } }).blur(1.5).extractChannel(0).raw().toBuffer();

const out = Buffer.alloc(n * 4);
for (let p = 0; p < n; p++) {
  out[p * 4] = rgb[p * 3];
  out[p * 4 + 1] = rgb[p * 3 + 1];
  out[p * 4 + 2] = rgb[p * 3 + 2];
  out[p * 4 + 3] = alpha[p];
}
await fs.mkdir(path.dirname(outPath), { recursive: true });
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log('Wrote', outPath);
