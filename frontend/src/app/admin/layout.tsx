import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin, roleOf } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Every admin screen sits inside this: signed-in admins only, otherwise back to the login screen
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdmin();
  if (!session) redirect("/api/auth/logout");
  const { admin } = session;
  return <AdminShell role={await roleOf(admin)} admin={{ email: admin.email, name: [admin.first_name, admin.last_name].filter(Boolean).join(" ") }}>{children}</AdminShell>;
}
