import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectMongo, Design } from "@/lib/mongo";
import { getCustomer } from "@/lib/auth";
import { isAdmin } from "@/lib/security";

// A design is readable by its owner or by staff (x-admin-key); guest designs by staff only.
// Missing and forbidden both answer 404 so ids can't be probed.
export async function GET(req: Request, { params }: RouteContext<"/api/designs/[id]">) {
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectMongo();
  const doc = await Design.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin(req)) {
    const customer = await getCustomer();
    if (!doc.customerId || customer?.id !== doc.customerId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(doc);
}
