"use server";

import { revalidatePath } from "next/cache";
import { getSuperadmin, isSuperadmin } from "@/lib/superadmin";
import { audit } from "@/lib/audit";
import { createMedusaProduct, deleteMedusaProduct } from "@/lib/medusa-catalog";
import { normalizeColorImages } from "@/lib/product-colors";
import { COLORS, PRODUCTS } from "@/lib/catalog";
import { CatalogProduct, HiddenProduct, connectMongo } from "@/lib/mongo";
import { readProductColors } from "@/lib/product-colors";

export async function addProduct(_: { error: string; success: string }, data: FormData) {
  const session = await getSuperadmin();
  if (!session) return { error: "Superadmin access required.", success: "" };
  const text = (key: string) => String(data.get(key) ?? "").trim();
  const slug = text("slug"), title = text("title"), category = text("category"), description = text("description");
  const price = Number(text("price")), minBulk = Number(text("minBulk")), productionDays = Number(text("productionDays"));
  let colorData: ReturnType<typeof readProductColors>;
  try { colorData = readProductColors(data, COLORS, process.env.CLOUDINARY_CLOUD_NAME); }
  catch (error) { return { error: (error as Error).message, success: "" }; }
  const { originalColor, colors, colorImages } = colorData;
  const sizes = [...new Set(text("sizes").split(",").map((s) => s.trim()).filter(Boolean))];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || !title || title.length > 150 || !category || category.length > 60 || !description || description.length > 5000 || !text("price") || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(minBulk) || minBulk < 1 || !Number.isSafeInteger(productionDays) || productionDays < 1 || !sizes.length || sizes.length > 20 || sizes.some((s) => s.length > 20) || !COLORS.some((c) => c.id === originalColor)) return { error: "Check the product details. Price must be nonnegative; quantities and days must be positive whole numbers.", success: "" };
  if (PRODUCTS.some((p) => p.slug === slug)) return { error: "This slug already exists.", success: "" };
  // Create it in Medusa first so it shows under Products & stock and can be bought; if saving the
  // shop listing then fails, the Medusa product is removed again so the two never disagree
  try {
    await createMedusaProduct(session.token, { slug, title, category, description, price, sizes, colors, originalColor, minBulk, imageUrl: colorImages[originalColor], colorImages });
  } catch (error) {
    console.error("Medusa product creation failed", error instanceof Error ? error.message : "Unknown error");
    return { error: `Could not create the product in Medusa${error instanceof Error ? `: ${error.message}` : ""}. Nothing was saved.`, success: "" };
  }
  try {
    await connectMongo();
    await CatalogProduct.create({ slug, title, category, description, price, currency: "INR", sizes, originalColor, colors, colorImages, minBulk, productionDays, imageUrl: colorImages[originalColor], livePreview: false, customColor: data.get("customColor") === "on", printOnDemand: data.get("printOnDemand") === "on", express: data.get("express") === "on", promo: data.get("promo") === "on" });
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/studio");
    revalidatePath("/superadmin/products");
    await audit(session, "product.added", slug, title);
    return { error: "", success: `Added ${title}. It is in the shop and under Products & stock.` };
  } catch (error) {
    await deleteMedusaProduct(session.token, slug).catch(() => {});
    if ((error as { code?: number }).code === 11000) return { error: "This slug already exists.", success: "" };
    console.error("Product creation failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not save the product. Check the MongoDB connection and try again.", success: "" };
  }
}

const refresh = (slug: string) => {
  for (const path of ["/", "/products", `/products/${slug}`, "/studio", "/cart", "/superadmin/products"]) revalidatePath(path);
};

/** Takes a product off the shop: products added here are deleted, built-in ones are hidden (and can be restored) */
export async function removeProduct(slug: string) {
  const session = await getSuperadmin();
  if (!session) return { error: "Superadmin access required." };
  try {
    await connectMongo();
    if (PRODUCTS.some((p) => p.slug === slug)) await HiddenProduct.updateOne({ slug }, { slug }, { upsert: true });
    else {
      await deleteMedusaProduct(session.token, slug);
      await CatalogProduct.deleteOne({ slug });
    }
    refresh(slug);
    await audit(session, "product.removed", slug);
    return { error: "" };
  } catch (error) {
    console.error("Product removal failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not remove the product." };
  }
}

export async function restoreProduct(slug: string) {
  const session = await getSuperadmin();
  if (!session) return { error: "Superadmin access required." };
  try {
    await connectMongo();
    await HiddenProduct.deleteOne({ slug });
    refresh(slug);
    await audit(session, "product.restored", slug);
    return { error: "" };
  } catch (error) {
    console.error("Product restore failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not restore the product." };
  }
}

/**
 * Creates shop products that Medusa doesn't have yet (ones added before the two were linked), so they
 * appear under Products & stock and can be bought. Each product is reported separately.
 */
export async function syncProductsToMedusa(slugs: string[]) {
  const session = await getSuperadmin();
  if (!session) return { synced: 0, failed: [{ slug: "", error: "Superadmin access required." }] };
  const failed: { slug: string; error: string }[] = [];
  let synced = 0;
  await connectMongo();
  for (const slug of slugs) {
    try {
      const p = await CatalogProduct.findOne({ slug }).lean();
      if (!p) throw new Error("Not found in the shop catalogue");
      const colorImages = normalizeColorImages(p.colorImages);
      const colors = (p.colors as string[] | undefined)?.length ? (p.colors as string[]) : [String(p.originalColor)];
      await createMedusaProduct(session.token, {
        slug,
        title: String(p.title),
        category: String(p.category),
        description: String(p.description),
        price: Number(p.price),
        sizes: p.sizes as string[],
        colors,
        originalColor: String(p.originalColor),
        minBulk: Number(p.minBulk ?? 1),
        imageUrl: p.imageUrl ? String(p.imageUrl) : colorImages[String(p.originalColor)],
        colorImages,
      });
      synced++;
      await audit(session, "product.synced", slug);
    } catch (error) {
      failed.push({ slug, error: error instanceof Error ? error.message : "Failed" });
    }
  }
  for (const path of ["/superadmin/products", "/admin/products", "/cart"]) revalidatePath(path);
  return { synced, failed };
}
