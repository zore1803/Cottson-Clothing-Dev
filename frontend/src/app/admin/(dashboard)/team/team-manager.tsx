"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Member = { id: string; name: string; email: string; role: string; banned: boolean; createdAt: string };

const ROLES = [
  ["staff", "Staff"],
  ["admin", "Admin"],
] as const;

export function TeamManager({ members, meId }: { members: Member[]; meId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Runs an admin-plugin call, shows its error (or `done`) as a toast, and refreshes the list
  const run = async (key: string, done: string, call: () => Promise<{ error: { message?: string } | null }>) => {
    setBusy(key);
    const { error } = await call();
    setBusy(null);
    if (error) toast.error(error.message ?? "That didn't work");
    else {
      toast.success(done);
      router.refresh();
    }
    return !error;
  };

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const ok = await run("new", "Account created", () =>
            authClient.admin.createUser({
              name: String(f.get("name")),
              email: String(f.get("email")),
              password: String(f.get("password")),
              role: String(f.get("role")) as "admin",
            })
          );
          if (ok) form.reset();
        }}
      >
        <h2 className="font-semibold text-brand sm:col-span-2">Add a team member</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Temporary password (12+ characters)</Label>
          <Input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="role">Role</Label>
          <select id="role" name="role" defaultValue="staff" className="h-10 rounded-lg border bg-white px-3 text-sm">
            {ROLES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy === "new"} className="h-10">
            {busy === "new" ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => {
              const me = m.id === meId;
              const staffRole = m.role === "admin" || m.role === "staff";
              return (
                <tr key={m.id} className={m.banned ? "bg-zinc-50 text-muted-foreground" : undefined}>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {m.name} {me && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {me || !staffRole ? (
                      <span className="capitalize">{staffRole ? m.role : "no access"}</span>
                    ) : (
                      <select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        disabled={busy === m.id}
                        onChange={(e) => run(m.id, "Role updated", () => authClient.admin.setRole({ userId: m.id, role: e.target.value as "admin" }))}
                        className="h-9 rounded-lg border bg-white px-2 text-sm"
                      >
                        {ROLES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">{m.banned ? "Banned" : "Active"}</td>
                  <td className="px-4 py-3 text-right">
                    {!me &&
                      (m.banned ? (
                        <Button variant="outline" size="sm" disabled={busy === m.id} onClick={() => run(m.id, "Account restored", () => authClient.admin.unbanUser({ userId: m.id }))}>
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy === m.id}
                          onClick={() => {
                            if (window.confirm(`Ban ${m.name}? They'll be signed out right away.`)) run(m.id, "Account banned", () => authClient.admin.banUser({ userId: m.id }));
                          }}
                        >
                          Ban
                        </Button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
