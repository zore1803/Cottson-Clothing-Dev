import "server-only";
import { cookies } from "next/headers";

// Customer auth is handled by Medusa (emailpass provider). The Medusa JWT lives in an
// httpOnly cookie, so browser scripts never see it; only our /api/auth routes use it.

const MEDUSA = process.env.NEXT_PUBLIC_MEDUSA_URL!;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;

export const SESSION_COOKIE = "cottson_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // matches Medusa's default 1d JWT lifetime
export const MIN_PASSWORD = 8;

export type Address = {
  id: string;
  address_name: string | null;
  first_name: string | null;
  last_name: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string | null;
  phone: string | null;
  is_default_shipping: boolean;
};

export type Customer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  metadata: { gst?: string; avatar?: string } | null;
  addresses: Address[];
};

export type OrderItem = { id: string; title: string; product_title?: string | null; variant_title?: string | null; quantity: number; unit_price: number; thumbnail?: string | null };
export type Order = {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status?: string;
  payment_status?: string;
  created_at: string;
  total: number;
  currency_code: string;
  items: OrderItem[];
};

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function medusa<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${MEDUSA}${path}`, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": KEY,
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    throw new AuthError("We cannot reach the server right now. Please try again shortly.", 503);
  }
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) throw new AuthError(String(json.message ?? json.error ?? "Something went wrong"), res.status);
  return json as T;
}

export async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getCustomer(): Promise<Customer | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const { customer } = await medusa<{ customer: Customer }>("/store/customers/me", { token });
    return customer;
  } catch {
    return null;
  }
}

export async function getOrders(): Promise<Order[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const { orders } = await medusa<{ orders: Order[] }>(
      "/store/orders?order=-created_at&limit=50&fields=id,display_id,status,created_at,total,currency_code,fulfillment_status,payment_status,*items",
      { token }
    );
    return orders;
  } catch {
    return [];
  }
}

export const isEmail = (v: unknown): v is string => typeof v === "string" && /^\S+@\S+\.\S+$/.test(v.trim());

export function fail(e: unknown) {
  const err = e instanceof AuthError ? e : new AuthError("Something went wrong", 500);
  return Response.json({ error: err.message }, { status: err.status });
}
