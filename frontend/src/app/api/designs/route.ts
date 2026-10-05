import { NextResponse } from "next/server";
import { connectMongo, Design } from "@/lib/mongo";
import { getSession, requireCustomer } from "@/lib/authz";
import { parseDesign } from "@/lib/designs";
import { rateLimit, readJson } from "@/lib/security";

// Save a studio design; the returned id goes on the cart line item and later the Medusa order.
// Signed-in customers get the design attached to their account; guests can still save one.
export async function POST(req: Request) {
  const limited = rateLimit(req, "designs", 20, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const parsed = parseDesign(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [session] = await Promise.all([getSession(), connectMongo()]);
  // Designing is part of ordering, which admin accounts don't do; guests and customers can save
  if (session.role === "admin") return NextResponse.json({ error: "Admin accounts cannot save customer designs" }, { status: 403 });
  const doc = await Design.create({ ...parsed.design, customerId: session.role === "customer" ? session.customer.id : undefined });
  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}

// The signed-in customer's saved designs (previews only, newest first)
export async function GET() {
  const session = await requireCustomer();
  if (session instanceof Response) return session;
  await connectMongo();
  const designs = await Design.find({ customerId: session.customer.id }, "product color preview status medusaOrderId createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({ designs });
}
