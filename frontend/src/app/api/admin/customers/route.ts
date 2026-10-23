import { medusa, fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";

type Customer = { id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; company_name: string | null; created_at: string; has_account: boolean };

// Customer search for the admin: ?q= matches name, email, phone or company; ?offset= pages through results
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const offset = Math.max(0, Math.min(10_000, Number(url.searchParams.get("offset")) || 0));
  try {
    const { customers, count } = await medusa<{ customers: Customer[]; count: number }>(
      `/admin/customers?limit=30&offset=${offset}&order=-created_at${q ? `&q=${encodeURIComponent(q)}` : ""}&fields=id,email,first_name,last_name,phone,company_name,created_at,has_account`,
      { token: session.token }
    );
    return Response.json({ customers, count });
  } catch (e) {
    return fail(e);
  }
}
