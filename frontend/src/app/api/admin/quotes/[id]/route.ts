import { isValidObjectId } from "mongoose";
import { connectMongo, Quote } from "@/lib/mongo";
import { requireAdmin } from "@/lib/admin-auth";
import { clean, readJson } from "@/lib/security";

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
  return quote ? Response.json({ quote }) : Response.json({ error: "Not found" }, { status: 404 });
}
