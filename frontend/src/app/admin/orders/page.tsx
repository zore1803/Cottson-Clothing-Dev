import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersPage } from "@/components/admin/orders-page";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  // The page reads ?order= from the URL, which needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <OrdersPage />
    </Suspense>
  );
}
