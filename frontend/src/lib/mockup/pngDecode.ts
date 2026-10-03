// Exact PNG decoding for the mannequin layers, without a canvas. A canvas stores pixels
// premultiplied by alpha, so reading them back (getImageData) changes the colour of every partly
// transparent pixel — the soft mannequin edges, and base.png's shading wherever its alpha < 255.
// This returns the file's own bytes (like sharp in Node), so browser and Node renders match.
//
// Supports 8-bit, non-interlaced PNGs: greyscale, RGB, palette (+ tRNS), grey+alpha and RGBA.

export type DecodedPng = { width: number; height: number; rgba: Uint8ClampedArray };

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decodePng(buf: ArrayBuffer): Promise<DecodedPng> {
  const b = new Uint8Array(buf);
  for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) throw new Error("not a PNG");
  const dv = new DataView(buf);
  let pos = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  let palette: Uint8Array | null = null, trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (pos < b.length) {
    const len = dv.getUint32(pos);
    const name = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (name === "IHDR") {
      width = dv.getUint32(pos + 8);
      height = dv.getUint32(pos + 12);
      depth = data[8];
      type = data[9];
      interlace = data[12];
    } else if (name === "PLTE") palette = data;
    else if (name === "tRNS") trns = data;
    else if (name === "IDAT") idat.push(data);
    else if (name === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`unsupported PNG (bit depth ${depth}, interlace ${interlace})`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error(`unsupported PNG colour type ${type}`);

  const joined = new Uint8Array(idat.reduce((n, d) => n + d.length, 0));
  let o = 0;
  for (const d of idat) joined.set(d, (o += d.length) - d.length);
  const raw = await inflate(joined);

  // Undo the per-row filters
  const stride = width * channels;
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride, prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[dst + x - channels] : 0;
      const up = y > 0 ? px[prev + x] : 0;
      const c = y > 0 && x >= channels ? px[prev + x - channels] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      px[dst + x] = v & 255;
    }
  }

  // To RGBA
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, d = i * 4;
    if (type === 6) {
      rgba[d] = px[s];
      rgba[d + 1] = px[s + 1];
      rgba[d + 2] = px[s + 2];
      rgba[d + 3] = px[s + 3];
    } else if (type === 2) {
      rgba[d] = px[s];
      rgba[d + 1] = px[s + 1];
      rgba[d + 2] = px[s + 2];
      rgba[d + 3] = 255;
    } else if (type === 0 || type === 4) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = px[s];
      rgba[d + 3] = type === 4 ? px[s + 1] : 255;
    } else {
      const k = px[s];
      rgba[d] = palette![k * 3];
      rgba[d + 1] = palette![k * 3 + 1];
      rgba[d + 2] = palette![k * 3 + 2];
      rgba[d + 3] = trns && k < trns.length ? trns[k] : 255;
    }
  }
  return { width, height, rgba };
}
