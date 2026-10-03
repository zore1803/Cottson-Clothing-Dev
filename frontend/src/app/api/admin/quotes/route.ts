import { connectMongo, Quote } from "@/lib/mongo";
import { requireAdmin } from "@/lib/authz";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const status = new URL(req.url).searchParams.get("status");
  await connectMongo();
  const quotes = await Quote.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200).lean();
  return Response.json({ quotes });
}
