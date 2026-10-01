import { getToken, medusa, fail, AuthError } from "@/lib/auth";
import { parseAddress } from "../_address";

export async function POST(req: Request) {
  try {
    const token = await getToken();
    if (!token) throw new AuthError("Please sign in", 401);
    await medusa("/store/customers/me/addresses", { token, body: parseAddress(await req.json()) });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
