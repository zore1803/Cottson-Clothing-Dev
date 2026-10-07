import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog-server";
import { DesignStudio } from "@/components/design-studio/design-studio";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Upload your logo, choose embroidery or print, place it on the garment and order.",
};

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const { product: slug, color } = await searchParams;
  const products = await listProducts();
  const product = products.find((p) => p.slug === slug) || products[0];
  const initialColor = typeof color === "string" && product.colors.includes(color) ? color : product.originalColor;
  return <DesignStudio key={product.slug} product={product} initialColor={initialColor} products={products} />;
}
