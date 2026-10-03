import type { Metadata } from "next";
import { ResourcesHero } from "@/components/resources-migrated/resources-hero";
import { ProductsSwitch } from "@/components/resources-migrated/products-switch";
import { WhatsAppCTA } from "@/components/shared/whatsapp-cta";

export const metadata: Metadata = {
  title: "Resources · Guides, Insights & Apparel Inspiration",
  description:
    "Explore practical guides, insights and inspiration to help you make better decisions about corporate apparel, customisation, branding and team wear.",
};

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Resources Hero with Category Cards */}
      <ResourcesHero />

      {/* 2. Interactive Product Catalog Switcher */}
      <ProductsSwitch />

      {/* 3. WhatsApp Consultation CTA */}
      <WhatsAppCTA />
    </main>
  );
}
