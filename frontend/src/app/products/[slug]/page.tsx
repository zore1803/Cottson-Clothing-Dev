import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/catalog";
import { EssentialPoloDetail } from "@/components/essential-polo-detail";

export const revalidate = 3600;
export const generateStaticParams = () => PRODUCTS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const p = getProduct((await params).slug);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[slug]">) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const { color } = await searchParams;
  const initialColor = typeof color === "string" && product.colors.includes(color) ? color : product.originalColor;
  return <EssentialPoloDetail product={product} initialColor={initialColor} />;
}
