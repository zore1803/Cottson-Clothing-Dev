import { isValidObjectId } from "mongoose";
import { connectMongo, Quote } from "@/lib/mongo";
import { requireAdmin } from "@/lib/authz";
import { clean, readJson } from "@/lib/security";
import { audit } from "@/lib/audit";

const STATUSES = ["new", "contacted", "won", "lost"];

export async function PATCH(req: Request, { params }: RouteContext<"/api/admin/quotes/[id]">) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const { id } = await params;
  const b = await readJson(req);
  if (!isValidObjectId(id) || !b) return Response.json({ error: "Invalid request" }, { status: 400 });
  const update: Record<string, unknown> = {};
  if ("status" in b) {
    if (typeof b.status !== "string" || !STATUSES.includes(b.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    update.status = b.status;
  }
  if ("notes" in b) update.notes = clean(b.notes, 2000);
  await connectMongo();
  const quote = await Quote.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!quote) return Response.json({ error: "Not found" }, { status: 404 });
  await audit(session, "quote.updated", `${quote.name} <${quote.email}>`, "status" in update ? `status ${update.status}` : "notes");
  return Response.json({ quote });
}
