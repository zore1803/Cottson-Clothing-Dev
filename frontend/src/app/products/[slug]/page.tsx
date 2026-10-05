import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/catalog";
import { EssentialPoloDetail } from "@/components/essential-polo-detail";
import { ProductInfo } from "@/components/product-info";
import { FabricFeatures } from "@/components/fabric-features";
import { TeamShowcase } from "@/components/team-showcase";
import { SimilarProductsCarousel } from "@/components/similar-products-carousel";
import { WhatsappCta } from "@/components/whatsapp-cta";

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
  
  // Same category first; top up with other products so the carousel is never empty
  const others = PRODUCTS.filter((p) => p.slug !== product.slug);
  const similarProducts = [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, 6);
  
  return (
    <>
      <EssentialPoloDetail product={product} initialColor={initialColor} />

      <ProductInfo product={product} />

      <FabricFeatures />

      <TeamShowcase />

      <WhatsappCta />
      <SimilarProductsCarousel products={similarProducts} />
    </>
  );
}
