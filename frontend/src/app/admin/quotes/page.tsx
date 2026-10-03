import type { Metadata } from "next";
import { QuotesPage } from "@/components/admin/quotes-page";

export const metadata: Metadata = { title: "Quotes" };

export default function Page() {
  return <QuotesPage />;
}
