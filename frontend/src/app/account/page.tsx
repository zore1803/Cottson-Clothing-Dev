import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer, getOrders } from "@/lib/auth";
import { Dashboard } from "@/components/account/dashboard";
import { connectMongo, Design } from "@/lib/mongo";

// Designs live in MongoDB; a database hiccup must not take the whole account page down
async function getDesigns(customerId: string) {
  try {
    await connectMongo();
    const docs = await Design.find({ customerId }, "product color preview status createdAt").sort({ createdAt: -1 }).limit(100).lean();
    return docs.map((d) => ({ id: String(d._id), product: d.product, color: d.color, preview: d.preview ?? undefined, status: d.status, createdAt: new Date(d.createdAt).toISOString() }));
  } catch {
    return [];
  }
}

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [customer, orders, { tab }] = await Promise.all([getCustomer(), getOrders(), searchParams]);
  // Cookie present but expired/invalid: send back to login (clears the stale cookie first)
  if (!customer) redirect("/api/auth/logout");
  const designs = await getDesigns(customer.id);

  return (
    <Dashboard
      initialTab={tab}
      orders={orders}
      designs={designs}
      customer={{
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        company_name: customer.company_name,
        created_at: customer.created_at,
        gst: customer.metadata?.gst ?? "",
        avatar: customer.metadata?.avatar ?? "",
        addresses: customer.addresses ?? [],
      }}
    />
  );
}
