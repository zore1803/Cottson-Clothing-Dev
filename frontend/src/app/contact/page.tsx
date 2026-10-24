import type { Metadata } from "next";
import { ContactHero } from "@/components/contact-migrated/contact-hero";
import { ClientLogoCarousel } from "@/components/shared/client-logo-carousel";
import { ContactDetails } from "@/components/contact-migrated/contact-details";
import { AboutReels } from "@/components/shared/about-reels";
import { WhatsAppCTA } from "@/components/shared/whatsapp-cta";

export const metadata: Metadata = {
  title: "Contact Us · Corporate Uniform Enquiries",
  description:
    "Get in touch with Cottson Clothing. Discuss your team wear requirements, corporate uniforms, custom merchandise and get a tailored bulk quote.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    // The site shell already provides the page's <main>; a second one is invalid HTML
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* 1. Contact Hero with Brand Intro */}
      <ContactHero />

      {/* 2. Trusted Client Logo Marquee */}
      <ClientLogoCarousel />

      {/* 3. Contact Information & Functional Query Form */}
      <ContactDetails />

      {/* 4. Behind the Scenes Video Reels */}
      <AboutReels />

      {/* 5. WhatsApp Instant Chat CTA */}
      <WhatsAppCTA />
    </div>
  );
}
