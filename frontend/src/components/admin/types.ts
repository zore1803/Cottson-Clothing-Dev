// Shapes returned by the admin API, and the status vocabularies used across the admin screens

export type OrderItem = {
  id: string;
  title: string;
  product_title?: string | null;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  thumbnail?: string | null;
  design?: { id: string; status?: string; preview?: string };
};

export type AdminOrder = {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  email: string | null;
  fulfillment_status?: string;
  payment_status?: string;
  items: OrderItem[];
  razorpay?: { id?: string; status: string; mode?: string; method?: string };
  shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; city?: string | null; postal_code?: string | null; phone?: string | null } | null;
};

export type Quote = {
  _id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  product?: string;
  quantity?: number;
  message?: string;
  status: string;
  notes?: string;
  createdAt: string;
};

export type DesignRow = {
  id: string;
  product: string;
  color: string;
  preview?: string;
  status: string;
  statusNote?: string;
  medusaOrderId?: string;
  summary: string;
  createdAt: string;
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const QUOTE_STATUSES = ["new", "contacted", "won", "lost"] as const;
export const quoteTone: Record<string, Tone> = { new: "info", contacted: "warning", won: "success", lost: "neutral" };

// Production steps in the order work moves through them
export const DESIGN_STEPS = [
  { id: "ordered", label: "Ordered" },
  { id: "approved", label: "Approved" },
  { id: "in_production", label: "In production" },
  { id: "shipped", label: "Shipped" },
] as const;
export const designTone: Record<string, Tone> = { pending: "neutral", ordered: "info", approved: "info", in_production: "warning", shipped: "success" };
export const designLabel = (s?: string) => DESIGN_STEPS.find((d) => d.id === s)?.label ?? (s === "pending" ? "Saved" : (s ?? "Saved"));

export function orderState(o: AdminOrder): { label: string; tone: Tone } {
  if (o.status === "canceled") return { label: "Cancelled", tone: "neutral" };
  if (o.fulfillment_status === "delivered") return { label: "Delivered", tone: "success" };
  if (o.fulfillment_status === "shipped" || o.fulfillment_status === "partially_shipped") return { label: "Shipped", tone: "info" };
  if (o.status === "completed") return { label: "Completed", tone: "success" };
  return { label: "Processing", tone: "warning" };
}

export const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL ?? "";
