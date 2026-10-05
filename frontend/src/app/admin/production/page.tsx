import type { Metadata } from "next";
import { ProductionPage } from "@/components/admin/production-page";

export const metadata: Metadata = { title: "Production" };

export default function Page() {
  return <ProductionPage />;
}
