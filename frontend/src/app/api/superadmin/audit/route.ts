import { fail } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { AuditLog, connectMongo } from "@/lib/mongo";

const PAGE = 50;

// Newest first. ?action= filters by action, ?q= by who did it, ?before= (an ISO time) pages back.
export async function GET(req: Request) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const before = url.searchParams.get("before");
  try {
    await connectMongo();
    const filter: Record<string, unknown> = {};
    if (action && /^[a-z_.]+$/.test(action)) filter.action = action;
    if (q) filter.actorEmail = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    if (before && !Number.isNaN(Date.parse(before))) filter.at = { $lt: new Date(before) };
    const rows = await AuditLog.find(filter).sort({ at: -1 }).limit(PAGE + 1).lean();
    const entries = rows.slice(0, PAGE).map((r) => ({ id: String(r._id), at: r.at, actorEmail: r.actorEmail ?? null, action: r.action, target: r.target ?? null, detail: r.detail ?? null }));
    return Response.json({ entries, next: rows.length > PAGE ? entries[entries.length - 1].at : null });
  } catch (e) {
    return fail(e);
  }
}
