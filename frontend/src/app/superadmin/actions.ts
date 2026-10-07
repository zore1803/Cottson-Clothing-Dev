"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, allowLoginAttempt, isSuperadmin, sameSecret, sessionToken } from "@/lib/superadmin";
import { COLORS, PRODUCTS } from "@/lib/catalog";
import { CatalogProduct, connectMongo } from "@/lib/mongo";
import { readProductColors } from "@/lib/product-colors";

export async function login(_: { error: string; authenticated?: boolean }, data: FormData) {
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!password) return { error: "Set SUPERADMIN_PASSWORD in .env.local to enable access." };
  if (!allowLoginAttempt()) return { error: "Too many sign-in attempts. Try again in a minute." };
  if (!sameSecret(String(data.get("password") ?? ""), password)) return { error: "Incorrect password." };
  const expiry = Date.now() + 8 * 60 * 60 * 1000;
  (await cookies()).set(ADMIN_COOKIE, sessionToken(expiry), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 28800 });
  return { error: "", authenticated: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/superadmin");
}

export async function addProduct(_: { error: string; success: string }, data: FormData) {
  if (!await isSuperadmin()) return { error: "Please sign in again.", success: "" };
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
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/panel");
    return { error: "", success: `Added ${title}. It is now visible in the shop.` };
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return { error: "This slug already exists.", success: "" };
    console.error("Product creation failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Could not save the product. Check the MongoDB connection and try again.", success: "" };
  }
}
