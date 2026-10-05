import "server-only";

// Thin client for Medusa's Store API, used by the checkout routes
const MEDUSA = process.env.NEXT_PUBLIC_MEDUSA_URL!;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;
export const REGION = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID!;

export async function store<T = Record<string, unknown>>(path: string, body?: unknown, token?: string, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(`${MEDUSA}/store${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-publishable-api-key": KEY, ...(token ? { authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Medusa ${path}: ${json?.message ?? res.status}`);
  return json as T;
}
