import type { Metadata } from "next";
import { ProductsPage } from "@/components/admin/products-page";

export const metadata: Metadata = { title: "Products & stock" };

export default function Page() {
  return <ProductsPage />;
}
