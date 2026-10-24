import type { Metadata } from "next";

// Checkout is a client component, so its metadata lives here. It is private, so search engines must skip it.
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
