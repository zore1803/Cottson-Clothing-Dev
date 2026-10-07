/** Convert MongoDB photo maps into plain objects for client previews. */
export function normalizeColorImages(value: unknown): Record<string, string> {
  const entries = value instanceof Map
    ? [...value.entries()]
    : value && typeof value === "object" ? Object.entries(value) : [];
  return Object.fromEntries(entries.filter(([id, url]) => typeof id === "string" && typeof url === "string" && url.trim()).map(([id, url]) => [id, (url as string).trim()]));
}

/** Saved superadmin photos take precedence over the bundled product photos. */
export function resolveColorPhoto(
  colorId: string,
  colorName: string,
  saved: Record<string, string> = {},
  bundled: Record<string, string> = {},
) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const candidates = [normalize(colorId), normalize(colorName)];
  for (const images of [saved, bundled]) {
    for (const candidate of candidates) {
      const match = Object.entries(images).find(([key, url]) => normalize(key) === candidate && url.trim());
      if (match) return match[1].trim();
    }
  }
  return undefined;
}

/** Validate the complete colour/photo set before saving a catalog product. */
export function readProductColors(data: FormData, available: readonly { id: string; name: string }[]) {
  const colors = [...new Set(data.getAll("colors").map(String))];
  const originalColor = String(data.get("originalColor") ?? "").trim();
  if (!colors.length || colors.length > available.length || colors.some((id) => !available.some((c) => c.id === id)) || !colors.includes(originalColor)) {
    throw new Error("Select available colours and choose a default from those colours.");
  }
  const colorImages: Record<string, string> = {};
  for (const id of colors) {
    const imageUrl = String(data.get(`image-${id}`) ?? "").trim();
    try {
      const url = new URL(imageUrl);
      if (imageUrl.length > 2048 || url.protocol !== "https:" || url.hostname !== "ik.imagekit.io" || !url.pathname.startsWith("/qiap0iq38/") || url.username || url.password || url.port) throw new Error("Invalid photo URL");
      colorImages[id] = imageUrl;
    } catch {
      throw new Error(`Enter a valid ImageKit photo URL for ${available.find((c) => c.id === id)!.name}.`);
    }
  }
  return { colors, originalColor, colorImages };
}
