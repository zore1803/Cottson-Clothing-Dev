import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog-server";
import { PRODUCTS } from "@/lib/catalog";
import CartClient from "./cart-client";

// A personal page: no reason for it to appear in search results
export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function CartPage() {
  // Persisted item photos still work if the catalog database is unavailable.
  let products = PRODUCTS;
  try { products = await listProducts(); } catch { /* Use persisted cart photos and bundled products. */ }
  return <CartClient products={products} />;
}
