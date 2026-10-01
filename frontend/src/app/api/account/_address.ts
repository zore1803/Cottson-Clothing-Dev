import { AuthError } from "@/lib/auth";

// Validates and normalises an address payload from the account form
export function parseAddress(b: Record<string, unknown>) {
  const s = (k: string) => String(b[k] ?? "").trim();
  if (!s("first_name") || !s("address_1") || !s("city")) throw new AuthError("Name, address and city are required");
  if (!/^\d{6}$/.test(s("postal_code"))) throw new AuthError("Enter a valid 6-digit PIN code");
  return {
    address_name: s("address_name") || null,
    first_name: s("first_name"),
    last_name: s("last_name") || "-",
    address_1: s("address_1"),
    address_2: s("address_2") || null,
    city: s("city"),
    province: s("province") || null,
    postal_code: s("postal_code"),
    phone: s("phone") || null,
    country_code: "in",
    is_default_shipping: Boolean(b.is_default_shipping),
  };
}
