import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdmin();
  // Cookie present but expired/invalid: clear it and go to the login screen
  if (!session) redirect("/api/auth/logout");
  const { admin } = session;
  return <AdminConsole admin={{ email: admin.email, name: [admin.first_name, admin.last_name].filter(Boolean).join(" ") }} />;
}
