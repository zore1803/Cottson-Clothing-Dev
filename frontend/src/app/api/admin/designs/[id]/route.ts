import { isValidObjectId } from "mongoose";
import { connectMongo, Design, DESIGN_STATUSES } from "@/lib/mongo";
import { requireAdmin } from "@/lib/authz";
import { clean, readJson } from "@/lib/security";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/designs/[id]">) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const { id } = await params;
  const b = await readJson(req);
  if (!isValidObjectId(id) || !b) return Response.json({ error: "Invalid request" }, { status: 400 });
  const update: Record<string, unknown> = {};
  if ("status" in b) {
    if (typeof b.status !== "string" || !(DESIGN_STATUSES as readonly string[]).includes(b.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    update.status = b.status;
  }
  if ("statusNote" in b) update.statusNote = clean(b.statusNote, 500);
  await connectMongo();
  const before = await Design.findById(id, "status").lean();
  const d = await Design.findByIdAndUpdate(id, update, { new: true, projection: "status statusNote" }).lean();
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });
  if ("status" in update && before?.status !== d.status) await audit(session, "design.status", id, `${before?.status ?? "?"} to ${d.status}`);
  if ("statusNote" in update) await audit(session, "design.note", id);
  return Response.json({ design: d });
}
