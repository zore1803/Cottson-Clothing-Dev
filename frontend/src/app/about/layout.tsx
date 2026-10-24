import type { Metadata } from "next";

// The about page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "About Us · Our Bombay Cotton Heritage",
  description: "Cottson Clothing carries a family's cotton craftsmanship from Bombay's mills to modern corporate clothing: quality fabric, tailored fit, reliable bulk delivery.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
