import type { Metadata } from "next";
import { ClientsHero } from "@/components/clients-migrated/clients-hero";
import { Industries } from "@/components/clients-migrated/industries";
import {
  RetailClients,
  HospitalityClients,
  HealthcareClients,
  EnergyClients,
  ManufacturingClients,
  TechnologyClients,
} from "@/components/clients-migrated/industry-sections";
import { LeafyBoiSection } from "@/components/clients-migrated/leafy-boi-section";
import { CorporateWearShow } from "@/components/clients-migrated/corporate-wear-show";
import { WhatsAppCTA } from "@/components/shared/whatsapp-cta";

export const metadata: Metadata = {
  title: "Clients · Trusted by Teams Across India",
  description:
    "Explore the brands, corporate teams, and institutions that trust Cottson Clothing for custom corporate apparel and uniforms.",
};

export default function ClientsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero */}
      <ClientsHero />

      {/* 2. Industries navigation cards */}
      <Industries />

      {/* 3. Retail, Fashion & Consumer Brands */}
      <RetailClients />

      {/* 4. Hospitality, F&B & Events */}
      <HospitalityClients />

      {/* 5. Featured Client Story - Leafy Boi */}
      <LeafyBoiSection />

      {/* 6. Healthcare & Pharmaceuticals */}
      <HealthcareClients />

      {/* 7. Energy, Infrastructure & Environmental */}
      <EnergyClients />

      {/* 8. Manufacturing & Industrial */}
      <ManufacturingClients />

      {/* 9. Technology, Services & Fintech */}
      <TechnologyClients />

      {/* 10. Corporate Wear Photo Showcase */}
      <CorporateWearShow />

      {/* 11. WhatsApp Consultation CTA */}
      <WhatsAppCTA />
    </main>
  );
}
