import { medusa, fail } from "@/lib/auth";
import { requireCustomer } from "@/lib/authz";
import { parseAddress } from "../../_address";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer();
    if (session instanceof Response) return session;
    const { id } = await ctx.params;
    await medusa(`/store/customers/me/addresses/${encodeURIComponent(id)}`, { token: session.token, body: parseAddress(await req.json()) });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer();
    if (session instanceof Response) return session;
    const { id } = await ctx.params;
    await medusa(`/store/customers/me/addresses/${encodeURIComponent(id)}`, { token: session.token, method: "DELETE" });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
