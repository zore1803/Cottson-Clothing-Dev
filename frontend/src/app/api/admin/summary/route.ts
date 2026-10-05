import { requireAdmin } from "@/lib/authz";
import { connectMongo, Design, Quote } from "@/lib/mongo";

// Small counts for the sidebar badges: designs waiting for approval and quotes nobody has answered
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  try {
    await connectMongo();
    const [toApprove, newQuotes] = await Promise.all([Design.countDocuments({ status: "ordered" }), Quote.countDocuments({ status: "new" })]);
    return Response.json({ toApprove, newQuotes });
  } catch {
    return Response.json({ toApprove: 0, newQuotes: 0 });
  }
}
