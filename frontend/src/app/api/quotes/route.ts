import { NextResponse } from "next/server";
import { connectMongo, Quote } from "@/lib/mongo";
import { getProduct } from "@/lib/catalog";
import { isEmail } from "@/lib/auth";
import { clean, rateLimit, readJson } from "@/lib/security";

// Bulk-order quote requests from the home and contact pages
export async function POST(req: Request) {
  const limited = await rateLimit(req, "quotes", 5, 60 * 60_000);
  if (limited) return limited;

  const b = await readJson(req);
  if (!b) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // Honeypot: real visitors never fill this hidden field; pretend success to bots
  if (clean(b.website, 200)) return NextResponse.json({ id: "ok" }, { status: 201 });

  const name = clean(b.name, 200);
  const email = clean(b.email, 200).toLowerCase();
  if (!name || !isEmail(email)) return NextResponse.json({ error: "A valid name and email are required" }, { status: 400 });

  const product = clean(b.product, 80);
  const quantity = Math.floor(Number(b.quantity));
  await connectMongo();
  const q = await Quote.create({
    name,
    company: clean(b.company, 200) || undefined,
    email,
    phone: clean(b.phone, 40) || undefined,
    product: getProduct(product) ? product : undefined,
    quantity: quantity >= 1 && quantity <= 1_000_000 ? quantity : undefined,
    message: clean(b.message, 2000) || undefined,
  });
  return NextResponse.json({ id: String(q._id) }, { status: 201 });
}
