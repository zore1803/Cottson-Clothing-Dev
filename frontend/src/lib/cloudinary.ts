import "server-only";
import { v2 as cloudinary } from "cloudinary";

// Image storage for customer artwork. Logos and design previews used to be saved inside MongoDB as
// base64 data URLs; they are uploaded here instead and only the URL is stored.

const cfg = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** False when the three CLOUDINARY_* variables are not all set; callers then keep the old behaviour */
export const cloudinaryConfigured = () => Object.values(cfg()).every(Boolean);

let ready = false;
function client() {
  if (!ready) {
    cloudinary.config({ ...cfg(), secure: true });
    ready = true;
  }
  return cloudinary;
}

export type StoredImage = { url: string; publicId: string; width: number; height: number; bytes: number };

/** Uploads a base64 data URL and returns where it now lives */
export async function uploadImage(dataUri: string, folder: string): Promise<StoredImage> {
  try {
    const r = await client().uploader.upload(dataUri, {
      folder,
      resource_type: "image",
      overwrite: false,
      unique_filename: true,
      use_filename: false,
      tags: ["cottson", "design"],
    });
    return { url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height, bytes: r.bytes };
  } catch (e) {
    const message = (e as { message?: string })?.message ?? "Upload failed";
    throw new Error(`Cloudinary: ${message}`);
  }
}

/** Whether a URL points at our own Cloudinary account (the only remote images a design may reference) */
export const isOwnAssetUrl = (u: string) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return !!cloud && u.startsWith(`https://res.cloudinary.com/${cloud}/`);
};

export async function deleteAsset(publicId: string) {
  await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
