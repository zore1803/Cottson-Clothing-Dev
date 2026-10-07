"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { StaffMember } from "@/lib/staff-store";
import { Drawer, Notice, PageHeader, Panel, Segmented, Status, TableEmpty, btn, inputCls, rowHover, selectCls, shortDate, table, td, th } from "./ui";
import { useAdminData } from "./use-admin-api";

type Data = { staff: StaffMember[]; me: string };
type Api = ReturnType<typeof useAdminData>["api"];
const MIN_PASSWORD = 8;

export function StaffPage() {
  const { data, error, loading, reload, api } = useAdminData<Data>("/api/superadmin/staff");
  const [filter, setFilter] = useState<"all" | "admin" | "superadmin">("all");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const staff = data?.staff ?? [];
  const shown = filter === "all" ? staff : staff.filter((s) => s.role === filter);
  const count = (r: "admin" | "superadmin") => staff.filter((s) => s.role === r).length;

  async function changeRole(m: StaffMember, role: "admin" | "superadmin") {
    const consequence = role === "superadmin" ? "They will be able to manage staff and add products." : "They will lose superadmin access.";
    if (!confirm(`${role === "superadmin" ? "Promote" : "Demote"} ${m.email} to ${role}? ${consequence}`)) return;
    setBusyId(m.id);
    try {
      await api(`/api/superadmin/staff/${m.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast.success(`${m.email} is now ${role === "superadmin" ? "a superadmin" : "an admin"}`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change role");
    }
    setBusyId(null);
  }

  async function remove(m: StaffMember) {
    if (!confirm(`Remove ${m.email}? They will no longer be able to sign in to the admin.`)) return;
    setBusyId(m.id);
    try {
      await api(`/api/superadmin/staff/${m.id}`, { method: "DELETE" });
      toast.success(`Removed ${m.email}`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff & roles"
        description="Everyone who can sign in to the admin. Admins run the store; superadmins can also manage staff and add products."
        actions={
          <>
            <button type="button" onClick={reload} disabled={loading} className={btn.secondary}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => setAdding(true)} className={btn.primary}>
              <UserPlus size={13} /> Add staff
            </button>
          </>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <Segmented
        label="Filter by role"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "Everyone", count: staff.length },
          { id: "admin", label: "Admins", count: count("admin") },
          { id: "superadmin", label: "Superadmins", count: count("superadmin") },
        ]}
      />

      <Panel flush>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Added</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!shown.length && (
                <TableEmpty cols={4} loading={loading}>
                  No staff to show.
                </TableEmpty>
              )}
              {shown.map((m) => {
                const you = m.id === data?.me;
                const locked = you || m.owner;
                return (
                  <tr key={m.id} className={rowHover}>
                    <td className={td}>
                      <div className="font-medium text-slate-900">
                        {m.name || m.email}
                        {you && <span className="ml-2 text-[12px] font-normal text-slate-400">You</span>}
                      </div>
                      {m.name && <div className="text-[12.5px] text-slate-500">{m.email}</div>}
                    </td>
                    <td className={td}>
                      <Status tone={m.role === "superadmin" ? "info" : "neutral"}>{m.role === "superadmin" ? "Superadmin" : "Admin"}</Status>
                      {m.owner && <div className="text-[12px] text-slate-400">Owner (set in SUPERADMIN_EMAILS)</div>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{shortDate(m.createdAt)}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        {m.role === "admin" ? (
                          <button type="button" disabled={busyId === m.id} onClick={() => changeRole(m, "superadmin")} className={btn.secondary}>
                            <ArrowUpCircle size={13} /> Promote
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={locked || busyId === m.id}
                            onClick={() => changeRole(m, "admin")}
                            title={locked ? (you ? "You can't demote yourself" : "Owners can't be demoted here") : undefined}
                            className={btn.secondary}
                          >
                            <ArrowDownCircle size={13} /> Demote
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={locked || m.role === "superadmin" || busyId === m.id}
                          onClick={() => remove(m)}
                          title={m.role === "superadmin" ? "Demote to admin before removing" : "Remove access"}
                          aria-label={`Remove ${m.email}`}
                          className={btn.ghost}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <AddStaff
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={async () => {
          setAdding(false);
          await reload();
        }}
        api={api}
      />
    </div>
  );
}

function AddStaff({ open, onClose, onCreated, api }: { open: boolean; onClose: () => void; onCreated: () => Promise<void>; api: Api }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/superadmin/staff", {
        method: "POST",
        body: JSON.stringify({ email: f.get("email"), password: f.get("password"), firstName: f.get("firstName"), lastName: f.get("lastName"), role: f.get("role") }),
      });
      toast.success("Staff account created");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
    }
    setBusy(false);
  }

  const label = "block text-[12.5px] font-medium text-slate-700";
  return (
    <Drawer open={open} onClose={onClose} title="Add staff" subtitle="They sign in at /login with this email and password.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            First name
            <input name="firstName" autoComplete="off" className={`${inputCls} mt-1 w-full`} />
          </label>
          <label className={label}>
            Last name
            <input name="lastName" autoComplete="off" className={`${inputCls} mt-1 w-full`} />
          </label>
        </div>
        <label className={label}>
          Email
          <input name="email" type="email" required autoComplete="off" className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className={label}>
          Temporary password
          <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className={`${inputCls} mt-1 w-full`} />
          <span className="mt-1 block text-[12px] font-normal text-slate-500">At least {MIN_PASSWORD} characters. Share it with them securely.</span>
        </label>
        <label className={label}>
          Role
          <select name="role" defaultValue="admin" className={`${selectCls} mt-1 w-full`}>
            <option value="admin">Admin: orders, quotes, production, stock</option>
            <option value="superadmin">Superadmin: everything, plus staff and products</option>
          </select>
        </label>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button disabled={busy} className={btn.primary}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
