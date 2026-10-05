import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectMongo, Design } from "@/lib/mongo";
import { canRead, getSession } from "@/lib/authz";

// A design is readable by its owner or by an admin (who sits above customers); guest designs by admins only.
// Missing and forbidden both answer 404 so ids can't be probed.
export async function GET(_req: Request, { params }: RouteContext<"/api/designs/[id]">) {
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectMongo();
  const doc = await Design.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canRead(await getSession(), doc.customerId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}
