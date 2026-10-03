import { Hero } from "@/components/home-migrated/hero";
import { ProductShowcase } from "@/components/home-migrated/product-showcase";
import { DesignStudioSection } from "@/components/home-migrated/design-studio-section";
import { AboutReels } from "@/components/shared/about-reels";
import { TeamMarquee } from "@/components/home-migrated/team-marquee";
import { TrustedBy } from "@/components/home-migrated/trusted-by";
import { BusinessTrust } from "@/components/home-migrated/business-trust";
import { CorporateNeeds } from "@/components/home-migrated/corporate-needs";
import { WhatsAppCTA } from "@/components/shared/whatsapp-cta";

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      {/* 1. Hero with 3D client garment clusters & trust strip */}
      <Hero />

      {/* 2. Collection showcase with category tabs */}
      <ProductShowcase />

      {/* 3. Design Studio showcase */}
      <DesignStudioSection />

      {/* 4. Behind the scenes video reels marquee */}
      <AboutReels />

      {/* 5. Team photos counter-scrolling marquee */}
      <TeamMarquee />

      {/* 6. Trusted by client logo marquee */}
      <TrustedBy />

      {/* 7. Business trust numbers & capacity */}
      <BusinessTrust />

      {/* 8. Corporate occasions */}
      <CorporateNeeds />

      {/* 9. WhatsApp CTA with clothing rack and trust badges */}
      <WhatsAppCTA />
    </>
  );
}
