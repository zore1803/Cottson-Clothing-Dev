import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/lib/catalog";
import { listProducts } from "@/lib/catalog-server";
import { EssentialPoloDetail } from "@/components/essential-polo-detail";
import { ProductInfo } from "@/components/product-info";
import { FabricFeatures } from "@/components/fabric-features";
import { TeamShowcase } from "@/components/team-showcase";
import { SimilarProductsCarousel } from "@/components/similar-products-carousel";
import { WhatsappCta } from "@/components/whatsapp-cta";

export const dynamic = "force-dynamic";
export const generateStaticParams = () => PRODUCTS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = (await listProducts()).find((p) => p.slug === slug);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const products = await listProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  const { color } = await searchParams;
  const initialColor = typeof color === "string" && product.colors.includes(color) ? color : product.originalColor;
  
  // Same category first; top up with other products so the carousel is never empty
  const others = products.filter((p) => p.slug !== product.slug);
  const similarProducts = [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, 6);
  
  return (
    <>
      <EssentialPoloDetail key={product.slug} product={product} initialColor={initialColor} />

      <ProductInfo product={product} />

      <FabricFeatures />

      <TeamShowcase />

      <WhatsappCta />
      <SimilarProductsCarousel products={similarProducts} />
    </>
  );
}
