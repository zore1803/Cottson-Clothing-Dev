import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RouteProgress } from "@/components/route-progress";
import { SiteShell } from "@/components/site-shell";
import { JsonLd } from "@/components/json-ld";
import { CONTACT, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "@/lib/seo";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  // Resolves every relative URL below (canonical, social images) to the real domain
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · ${SITE_TAGLINE}`, template: "%s · COTTSON" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Each page is its own canonical, so tracking or filter parameters never create duplicate pages
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Set GOOGLE_SITE_VERIFICATION to the token from Search Console to verify ownership
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/cottson-logo.png"),
  email: CONTACT.email,
  telephone: CONTACT.phone,
  areaServed: "IN",
  contactPoint: [{ "@type": "ContactPoint", contactType: "sales", telephone: CONTACT.phone, email: CONTACT.email, areaServed: "IN", availableLanguage: ["en", "hi"] }],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "en-IN",
  publisher: { "@id": absoluteUrl("/#organization") },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd data={[organization, website]} />
        <Providers>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
