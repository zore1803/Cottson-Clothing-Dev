import { NextResponse } from "next/server";
import { connectMongo, Design } from "@/lib/mongo";

// Save a studio design; the returned id goes on the cart line item and later the Medusa order
export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.product || !body?.color || !Array.isArray(body.elements)) {
    return NextResponse.json({ error: "product, color and elements are required" }, { status: 400 });
  }
  if (JSON.stringify(body).length > 8_000_000) {
    return NextResponse.json({ error: "Design too large" }, { status: 413 });
  }
  await connectMongo();
  const doc = await Design.create({
    product: body.product,
    color: body.color,
    width: body.width,
    height: body.height,
    elements: body.elements,
    preview: body.preview,
  });
  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
