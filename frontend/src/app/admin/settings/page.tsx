import type { Metadata } from "next";
import { getAdmin, roleOf } from "@/lib/admin-auth";
import { paymentMode } from "@/lib/razorpay-dummy";
import { BULK_TIERS, CUSTOMIZATION_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { SettingsPage } from "@/components/admin/settings-page";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const session = await getAdmin(); // the layout already guards this; needed here for the account details
  const admin = session?.admin;
  return (
    <SettingsPage
      s={{
        region: "India (INR)",
        paymentMode: paymentMode(),
        shippingFee: SHIPPING_FEE,
        freeShippingFrom: FREE_SHIPPING_FROM,
        customizationFee: CUSTOMIZATION_FEE,
        bulkTiers: BULK_TIERS,
        medusaUrl: process.env.NEXT_PUBLIC_MEDUSA_URL ?? "",
        admin: { email: admin?.email ?? "", role: admin ? roleOf(admin) : "admin", name: [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") },
      }}
    />
  );
}
