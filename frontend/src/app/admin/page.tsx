import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { paymentMode } from "@/lib/razorpay-dummy";
import { BULK_TIERS, CUSTOMIZATION_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdmin();
  // Cookie present but expired/invalid: clear it and go to the login screen
  if (!session) redirect("/api/auth/logout");
  const { admin } = session;
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ");
  return (
    <AdminConsole
      admin={{ email: admin.email, name }}
      settings={{
        region: "India (INR)",
        paymentMode: paymentMode(),
        shippingFee: SHIPPING_FEE,
        freeShippingFrom: FREE_SHIPPING_FROM,
        customizationFee: CUSTOMIZATION_FEE,
        bulkTiers: BULK_TIERS,
        medusaUrl: process.env.NEXT_PUBLIC_MEDUSA_URL ?? "",
        admin: { email: admin.email, name },
      }}
    />
  );
}
