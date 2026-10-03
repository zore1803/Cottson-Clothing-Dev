import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RouteProgress } from "@/components/route-progress";
import { SiteShell } from "@/components/site-shell";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "COTTSON · Custom cotton clothing", template: "%s · COTTSON" },
  description: "Premium cotton shirts and polos in any color, with your logo. Design online, order from one piece or in bulk.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
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
