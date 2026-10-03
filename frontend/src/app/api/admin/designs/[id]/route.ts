import { isValidObjectId } from "mongoose";
import { connectMongo, Design, DESIGN_STATUSES } from "@/lib/mongo";
import { requireAdmin } from "@/lib/admin-auth";
import { clean, readJson } from "@/lib/security";

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
  const d = await Design.findByIdAndUpdate(id, update, { new: true, projection: "status statusNote" }).lean();
  return d ? Response.json({ design: d }) : Response.json({ error: "Not found" }, { status: 404 });
}
