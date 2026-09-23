import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectMongo, Design } from "@/lib/mongo";

export async function GET(_req: Request, { params }: RouteContext<"/api/designs/[id]">) {
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectMongo();
  const doc = await Design.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}
