import { getCustomer, getToken, medusa, fail, AuthError } from "@/lib/auth";
import { getAdmin } from "@/lib/admin-auth";

// Slim shape used by the header; the account page loads the full customer on the server
export async function GET() {
  const c = await getCustomer();
  if (!c) {
    const session = await getAdmin();
    return Response.json({ customer: null, admin: session ? { email: session.admin.email, name: [session.admin.first_name, session.admin.last_name].filter(Boolean).join(" ") } : null });
  }
  const { id, email, first_name, last_name, phone, company_name, metadata, addresses } = c;
  return Response.json({
    customer: { id, email, first_name, last_name, phone, company_name, gst: metadata?.gst ?? "", avatar: metadata?.avatar ?? "", addresses },
  });
}

const MAX_AVATAR = 80_000; // characters of the data URL; the browser downsizes to ~192px first

// Partial update: only the fields present in the body are changed
export async function PATCH(req: Request) {
  try {
    const token = await getToken();
    if (!token) throw new AuthError("Please sign in", 401);
    const b = await req.json();
    const update: Record<string, unknown> = {};
    const metadata: Record<string, string> = {};

    if ("firstName" in b) {
      if (!String(b.firstName ?? "").trim()) throw new AuthError("Enter your first name");
      update.first_name = String(b.firstName).trim();
    }
    if ("lastName" in b) update.last_name = String(b.lastName ?? "").trim();
    if ("phone" in b) update.phone = String(b.phone ?? "").trim() || null;
    if ("company" in b) update.company_name = String(b.company ?? "").trim() || null;
    if ("gst" in b) {
      const gst = String(b.gst ?? "").trim().toUpperCase();
      if (gst && !/^[0-9A-Z]{15}$/.test(gst)) throw new AuthError("GST number must be 15 characters");
      metadata.gst = gst;
    }
    if ("avatar" in b) {
      const a = String(b.avatar ?? "");
      if (a && !/^data:image\/(jpeg|png|webp);base64,/.test(a)) throw new AuthError("Unsupported image");
      if (a.length > MAX_AVATAR) throw new AuthError("Image is too large");
      metadata.avatar = a;
    }
    if (Object.keys(metadata).length) update.metadata = metadata;

    await medusa("/store/customers/me", { token, body: update });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
