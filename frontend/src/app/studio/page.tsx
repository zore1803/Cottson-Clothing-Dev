import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog-server";
import { DesignStudio } from "@/components/design-studio/design-studio";

export const metadata: Metadata = {
  title: "Design Studio · Add Your Logo to Custom Clothing",
  description: "Upload your logo, choose embroidery or print, position it on a polo, T-shirt or hoodie in any colour, preview it live and order from one piece upwards.",
  alternates: { canonical: "/studio" },
};

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const { product: slug, color } = await searchParams;
  const products = await listProducts();
  const product = products.find((p) => p.slug === slug) || products[0];
  const initialColor = typeof color === "string" && product.colors.includes(color) ? color : product.originalColor;
  return <DesignStudio key={product.slug} product={product} initialColor={initialColor} products={products} />;
}
