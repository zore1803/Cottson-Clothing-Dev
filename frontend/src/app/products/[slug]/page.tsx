import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, formatPrice, variantUrl, type Product } from "@/lib/catalog";
import { listProducts } from "@/lib/catalog-server";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { EssentialPoloDetail } from "@/components/essential-polo-detail";
import { ProductInfo } from "@/components/product-info";
import { FabricFeatures } from "@/components/fabric-features";
import { TeamShowcase } from "@/components/team-showcase";
import { SimilarProductsCarousel } from "@/components/similar-products-carousel";
import { WhatsappCta } from "@/components/whatsapp-cta";

export const dynamic = "force-dynamic";
export const generateStaticParams = () => PRODUCTS.map((p) => ({ slug: p.slug }));

// Product photos are stored as site paths or full URLs; search engines and social cards need absolute ones
const photoOf = (p: Product) => {
  const u = variantUrl(p, p.originalColor);
  return u.startsWith("http") ? u : absoluteUrl(u);
};

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = (await listProducts()).find((p) => p.slug === slug);
  if (!p) return {};
  const title = `${p.title} · Custom ${p.category}`;
  const description = `${p.description} From ${formatPrice(p.price, p.currency)}, with bulk pricing and your logo.`;
  const image = photoOf(p);
  return {
    title,
    description,
    // The colour picker adds ?color=…; every variant points back to the one clean page
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", title, description, url: `/products/${p.slug}`, images: [{ url: image, alt: p.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
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
  
  const url = absoluteUrl(`/products/${product.slug}`);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: product.title,
      description: product.description,
      sku: product.slug,
      category: product.category,
      image: product.colors.slice(0, 6).map((c) => {
        const u = variantUrl(product, c);
        return u.startsWith("http") ? u : absoluteUrl(u);
      }),
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: {
        "@type": "Offer",
        url,
        price: product.price,
        priceCurrency: product.currency,
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: SITE_NAME },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/products") },
        { "@type": "ListItem", position: 3, name: product.title, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <EssentialPoloDetail key={product.slug} product={product} initialColor={initialColor} />

      <ProductInfo product={product} />

      <FabricFeatures />

      <TeamShowcase />

      <WhatsappCta />
      <SimilarProductsCarousel products={similarProducts} />
    </>
  );
}
