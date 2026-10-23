import "server-only";
import { cloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import type { DesignInput } from "@/lib/designs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/;

/** Checks the file's own bytes match what the data URL claims, so a mislabelled upload is refused */
function looksLike(mime: string, bytes: Buffer) {
  switch (mime) {
    case "image/png":
      return bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case "image/jpeg":
      return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/webp":
      return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
    case "image/svg+xml":
      return /<svg[\s>]/i.test(bytes.subarray(0, 2048).toString("utf8"));
    default:
      return false;
  }
}

export class AssetError extends Error {}

/**
 * Moves a design's images out of the request and into Cloudinary: each logo's `src` and the preview
 * become URLs. With Cloudinary not configured the design is returned untouched (images stay inline).
 * The same logo used twice is uploaded once.
 */
export async function storeDesignAssets(design: DesignInput): Promise<DesignInput & { previewPublicId?: string }> {
  if (!cloudinaryConfigured()) {
    console.warn("[designs] Cloudinary is not configured; storing images inline in MongoDB");
    return design;
  }

  const uploads = new Map<string, Promise<{ url: string; publicId: string }>>();
  const store = (dataUrl: string, folder: string) => {
    const m = DATA_URL.exec(dataUrl);
    if (!m) throw new AssetError("Unsupported image");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_IMAGE_BYTES) throw new AssetError("Each image must be under 5 MB");
    if (!looksLike(m[1], bytes)) throw new AssetError("The image does not match its file type");
    const key = `${folder}:${dataUrl}`;
    if (!uploads.has(key)) uploads.set(key, uploadImage(dataUrl, folder));
    return uploads.get(key)!;
  };

  const elements = await Promise.all(
    design.elements.map(async (el) => {
      if (typeof el.src !== "string" || !el.src.startsWith("data:")) return el;
      const { url, publicId } = await store(el.src, "cottson/logos");
      return { ...el, src: url, publicId };
    })
  );

  let preview = design.preview;
  let previewPublicId: string | undefined;
  if (preview?.startsWith("data:")) {
    const stored = await store(preview, "cottson/previews");
    preview = stored.url;
    previewPublicId = stored.publicId;
  }

  return { ...design, elements, preview, previewPublicId };
}
