import { NextResponse } from "next/server";
import { connectMongo, Quote } from "@/lib/mongo";

// Bulk-order quote requests from the home page
export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.name || !b?.email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  await connectMongo();
  const q = await Quote.create({
    name: String(b.name).slice(0, 200),
    company: b.company ? String(b.company).slice(0, 200) : undefined,
    email: String(b.email).slice(0, 200),
    phone: b.phone ? String(b.phone).slice(0, 40) : undefined,
    product: b.product,
    quantity: Number(b.quantity) || undefined,
    message: b.message ? String(b.message).slice(0, 2000) : undefined,
  });
  return NextResponse.json({ id: String(q._id) }, { status: 201 });
}
