import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin-guard";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · COTTSON Admin" }, robots: { index: false, follow: false } };

// Every page in this group is for signed-in staff only. The check is here, on the server, in
// addition to the optimistic redirect in proxy.ts.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="grid min-h-screen bg-muted/30 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 border-b bg-white p-3 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-4">
        <div className="px-3 pt-1">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">COTTSON</div>
          <div className="text-lg font-bold text-brand">Admin</div>
        </div>
        <AdminNav role={staff.role} />
        <div className="mt-auto hidden border-t pt-3 md:block">
          <div className="truncate px-3 text-sm font-medium">{staff.name}</div>
          <div className="truncate px-3 pb-2 text-xs text-muted-foreground">
            {staff.email} · {staff.role}
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
      <div className="border-t bg-white p-3 md:hidden">
        <div className="truncate px-3 text-xs text-muted-foreground">
          {staff.email} · {staff.role}
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
