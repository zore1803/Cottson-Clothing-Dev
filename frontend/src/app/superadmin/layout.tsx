import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin, roleOf } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: { default: "Superadmin", template: "%s · Superadmin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Same shell as /admin, for superadmins only. Admins are sent back to their own dashboard.
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdmin();
  if (!session) redirect("/api/auth/logout");
  const { admin } = session;
  if ((await roleOf(admin)) !== "superadmin") redirect("/admin");
  return (
    <AdminShell role="superadmin" admin={{ email: admin.email, name: [admin.first_name, admin.last_name].filter(Boolean).join(" ") }}>
      {children}
    </AdminShell>
  );
}
