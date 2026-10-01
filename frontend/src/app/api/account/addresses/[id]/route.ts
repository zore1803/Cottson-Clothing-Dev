import { getToken, medusa, fail, AuthError } from "@/lib/auth";
import { parseAddress } from "../../_address";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken();
    if (!token) throw new AuthError("Please sign in", 401);
    const { id } = await ctx.params;
    await medusa(`/store/customers/me/addresses/${encodeURIComponent(id)}`, { token, body: parseAddress(await req.json()) });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken();
    if (!token) throw new AuthError("Please sign in", 401);
    const { id } = await ctx.params;
    await medusa(`/store/customers/me/addresses/${encodeURIComponent(id)}`, { token, method: "DELETE" });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
