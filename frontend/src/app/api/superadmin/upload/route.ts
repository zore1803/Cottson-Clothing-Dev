import { requireSuperadmin } from "@/lib/authz";
import { cloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/security";

// Product photo upload for the superadmin form: validates the file itself (type, size, real image
// bytes), stores it in Cloudinary and returns the URL to save with the product.
const MAX_BYTES = 8 * 1024 * 1024;
const MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function looksLike(mime: string, b: Buffer) {
  if (mime === "image/png") return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === "image/jpeg") return b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
}

export async function POST(req: Request) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  const limited = await rateLimit(req, "product-upload", 60, 10 * 60_000);
  if (limited) return limited;
  if (!cloudinaryConfigured()) return Response.json({ error: "Photo uploads are not configured (CLOUDINARY_* variables). Paste an ImageKit URL instead." }, { status: 503 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image to upload" }, { status: 400 });
  if (!MIME.has(file.type)) return Response.json({ error: "Use a PNG, JPEG or WebP image" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Images must be under 8 MB" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLike(file.type, bytes)) return Response.json({ error: "That file is not a valid image" }, { status: 400 });

  try {
    const stored = await uploadImage(`data:${file.type};base64,${bytes.toString("base64")}`, "cottson/products");
    return Response.json({ url: stored.url });
  } catch (e) {
    console.error("[product upload]", e);
    return Response.json({ error: "Could not store the image. Please try again." }, { status: 502 });
  }
}
