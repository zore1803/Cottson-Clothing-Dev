import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireStaff } from "@/lib/admin-guard";
import { TeamManager, type Member } from "./team-manager";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await requireStaff();
  if (me.role !== "admin") redirect("/admin"); // staff can't manage staff
  const { users } = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 200, sortBy: "createdAt", sortDirection: "asc" },
  });
  const members: Member[] = users.map((u) => {
    const x = u as typeof u & { role?: string | null; banned?: boolean | null };
    return { id: x.id, name: x.name, email: x.email, role: x.role ?? "user", banned: !!x.banned, createdAt: new Date(x.createdAt).toISOString() };
  });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand">Team</h1>
        <p className="text-sm text-muted-foreground">
          Staff can use the dashboard; admins can also manage the team. A banned account is signed out immediately and can&apos;t sign back in.
        </p>
      </div>
      <TeamManager members={members} meId={me.id} />
    </div>
  );
}
