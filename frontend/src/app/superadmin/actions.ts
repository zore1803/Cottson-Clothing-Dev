"use server";

import { revalidatePath } from "next/cache";
import { isSuperadmin } from "@/lib/superadmin";
import { COLORS, PRODUCTS } from "@/lib/catalog";
import { CatalogProduct, HiddenProduct, connectMongo } from "@/lib/mongo";
import { readProductColors } from "@/lib/product-colors";

export async function addProduct(_: { error: string; success: string }, data: FormData) {
  if (!await isSuperadmin()) return { error: "Superadmin access required.", success: "" };
  const text = (key: string) => String(data.get(key) ?? "").trim();
  const slug = text("slug"), title = text("title"), category = text("category"), description = text("description");
  const price = Number(text("price")), minBulk = Number(text("minBulk")), productionDays = Number(text("productionDays"));
  let colorData: ReturnType<typeof readProductColors>;
  try { colorData = readProductColors(data, COLORS); }
  catch (error) { return { error: (error as Error).message, success: "" }; }
  const { originalColor, colors, colorImages } = colorData;
  const sizes = [...new Set(text("sizes").split(",").map((s) => s.trim()).filter(Boolean))];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || !title || title.length > 150 || !category || category.length > 60 || !description || description.length > 5000 || !text("price") || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(minBulk) || minBulk < 1 || !Number.isSafeInteger(productionDays) || productionDays < 1 || !sizes.length || sizes.length > 20 || sizes.some((s) => s.length > 20) || !COLORS.some((c) => c.id === originalColor)) return { error: "Check the product details. Price must be nonnegative; quantities and days must be positive whole numbers.", success: "" };
  if (PRODUCTS.some((p) => p.slug === slug)) return { error: "This slug already exists.", success: "" };
  try {
    await connectMongo();
    await CatalogProduct.create({ slug, title, category, description, price, currency: "INR", sizes, originalColor, colors, colorImages, minBulk, productionDays, imageUrl: colorImages[originalColor], livePreview: false, customColor: data.get("customColor") === "on", printOnDemand: data.get("printOnDemand") === "on", express: data.get("express") === "on", promo: data.get("promo") === "on" });
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);
    revalidatePath("/studio");
    revalidatePath("/superadmin/products");
    return { error: "", success: `Added ${title}. It is now visible in the shop.` };
  } catch (error) {
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
  if (!await isSuperadmin()) return { error: "Superadmin access required." };
  try {
    await connectMongo();
    if (PRODUCTS.some((p) => p.slug === slug)) await HiddenProduct.updateOne({ slug }, { slug }, { upsert: true });
    else await CatalogProduct.deleteOne({ slug });
    refresh(slug);
    return { error: "" };
  } catch (error) {
    console.error("Product removal failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not remove the product." };
  }
}

export async function restoreProduct(slug: string) {
  if (!await isSuperadmin()) return { error: "Superadmin access required." };
  try {
    await connectMongo();
    await HiddenProduct.deleteOne({ slug });
    refresh(slug);
    return { error: "" };
  } catch (error) {
    console.error("Product restore failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not restore the product." };
  }
}
