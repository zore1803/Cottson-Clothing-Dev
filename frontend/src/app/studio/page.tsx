import type { Metadata } from "next";
import { PRODUCTS, getProduct } from "@/lib/catalog";
import { DesignStudio } from "@/components/design-studio/design-studio";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Upload your logo, choose embroidery or print, place it on the garment and order.",
};

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const { product: slug, color } = await searchParams;
  const product = (typeof slug === "string" && getProduct(slug)) || PRODUCTS[0];
  const initialColor = typeof color === "string" && product.colors.includes(color) ? color : product.originalColor;
  return <DesignStudio key={product.slug} product={product} initialColor={initialColor} />;
}
