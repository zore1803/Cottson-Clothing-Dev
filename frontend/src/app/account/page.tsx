import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer, getOrders } from "@/lib/auth";
import { Dashboard } from "@/components/account/dashboard";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [customer, orders, { tab }] = await Promise.all([getCustomer(), getOrders(), searchParams]);
  // Cookie present but expired/invalid: send back to login (clears the stale cookie first)
  if (!customer) redirect("/api/auth/logout");

  return (
    <Dashboard
      initialTab={tab}
      orders={orders}
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
