"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Copy, KeyRound, RefreshCw, Send, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { PendingInvite, StaffMember } from "@/lib/staff-store";
import { Drawer, Notice, PageHeader, Panel, Segmented, Status, TableEmpty, btn, inputCls, rowHover, selectCls, shortDate, table, td, th } from "./ui";
import { useAdminData } from "./use-admin-api";

type Data = { staff: StaffMember[]; invites: PendingInvite[]; me: string; mailConfigured: boolean };
type Api = ReturnType<typeof useAdminData>["api"];

export function StaffPage() {
  const { data, error, loading, reload, api } = useAdminData<Data>("/api/superadmin/staff");
  const [filter, setFilter] = useState<"all" | "admin" | "superadmin">("all");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);

  const staff = data?.staff ?? [];
  const invites = data?.invites ?? [];
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

  async function forceReset(m: StaffMember) {
    if (!confirm(`Email ${m.email} a link to choose a new password?`)) return;
    setBusyId(m.id);
    try {
      await api(`/api/superadmin/staff/${m.id}`, { method: "POST" });
      toast.success(data?.mailConfigured ? `Reset link sent to ${m.email}` : "Reset requested. Email is not configured, so the link was written to the server log.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the reset link");
    }
    setBusyId(null);
  }

  async function resend(i: PendingInvite) {
    setBusyId(i.id);
    try {
      const r = await api<{ emailed: boolean; link?: string }>("/api/superadmin/staff", { method: "POST", body: JSON.stringify({ email: i.email, role: i.role }) });
      if (r.link) setLink({ email: i.email, url: r.link });
      else toast.success(`Invite sent again to ${i.email}`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend the invite");
    }
    setBusyId(null);
  }

  async function revoke(i: PendingInvite) {
    if (!confirm(`Cancel the invite for ${i.email}?`)) return;
    setBusyId(i.id);
    try {
      await api(`/api/superadmin/invites/${i.id}`, { method: "DELETE" });
      toast.success("Invite cancelled");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel the invite");
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
        description="Everyone who can sign in to the admin. Admins run the store; superadmins can also manage staff and products."
        actions={
          <>
            <button type="button" onClick={reload} disabled={loading} className={btn.secondary}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => setAdding(true)} className={btn.primary}>
              <UserPlus size={13} /> Invite staff
            </button>
          </>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}
      {data && !data.mailConfigured && (
        <Notice>Email is not set up (SMTP_HOST and SMTP_FROM), so invite and reset links cannot be emailed. Invites show a link to copy instead.</Notice>
      )}
      {link && (
        <Notice>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-all">
              Send this link to {link.email}: <code className="text-[12px]">{link.url}</code>
            </span>
            <span className="flex gap-1.5">
              <button
                type="button"
                className={btn.secondary}
                onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success("Link copied"), () => toast.error("Could not copy"))}
              >
                <Copy size={13} /> Copy
              </button>
              <button type="button" className={btn.ghost} aria-label="Dismiss" onClick={() => setLink(null)}>
                <X size={13} />
              </button>
            </span>
          </div>
        </Notice>
      )}

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
                        <button type="button" disabled={busyId === m.id} onClick={() => forceReset(m)} title="Email a password reset link" aria-label={`Send ${m.email} a password reset link`} className={btn.ghost}>
                          <KeyRound size={13} />
                        </button>
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

      {invites.length > 0 && (
        <Panel title={`Pending invites (${invites.length})`} flush>
          <ul className="divide-y divide-slate-100">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{i.email}</div>
                  <div className="text-[12px] text-slate-500">
                    {i.role === "superadmin" ? "Superadmin" : "Admin"} · invited {shortDate(i.createdAt)}
                    {i.invitedBy ? ` by ${i.invitedBy}` : ""}
                    {i.expired ? " · expired" : ""}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" disabled={busyId === i.id} onClick={() => resend(i)} className={btn.secondary}>
                    <Send size={13} /> {i.expired ? "Send new invite" : "Resend"}
                  </button>
                  <button type="button" disabled={busyId === i.id} onClick={() => revoke(i)} className={btn.ghost} aria-label={`Cancel invite for ${i.email}`}>
                    <X size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <AddStaff
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={async (url, email) => {
          setAdding(false);
          if (url) setLink({ email, url });
          await reload();
        }}
        api={api}
      />
    </div>
  );
}

function AddStaff({ open, onClose, onCreated, api }: { open: boolean; onClose: () => void; onCreated: (link: string | undefined, email: string) => Promise<void>; api: Api }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ email: string; emailed: boolean; link?: string }>("/api/superadmin/staff", { method: "POST", body: JSON.stringify({ email: f.get("email"), role: f.get("role") }) });
      toast.success(r.emailed ? `Invite emailed to ${r.email}` : "Invite created");
      await onCreated(r.link, r.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invite");
    }
    setBusy(false);
  }

  const label = "block text-[12.5px] font-medium text-slate-700";
  return (
    <Drawer open={open} onClose={onClose} title="Invite staff" subtitle="They choose their own password from the invite link.">
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Email
          <input name="email" type="email" required autoComplete="off" className={`${inputCls} mt-1 w-full`} />
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
            {busy ? "Sending..." : "Send invite"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
