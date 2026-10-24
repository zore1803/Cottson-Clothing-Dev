import "server-only"

// Shiprocket V2 API client (https://apidocs.shiprocket.in/).
// Credentials: SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD (or pre-generated SHIPROCKET_TOKEN).
// The JWT is valid for 24 hours; it is cached in-process and refreshed on expiry.

const BASE = "https://apiv2.shiprocket.in/v1/external"

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

type TokenCache = { token: string; expiresAt: number }
const g = globalThis as unknown as { _shiprocketToken?: TokenCache }

async function getToken(): Promise<string> {
  const now = Date.now()
  if (g._shiprocketToken && g._shiprocketToken.expiresAt > now + 60_000) {
    return g._shiprocketToken.token
  }
  const pregenerated = process.env.SHIPROCKET_TOKEN
  if (pregenerated) {
    // Store with a long TTL so it is never refreshed automatically; rotate manually.
    g._shiprocketToken = { token: pregenerated, expiresAt: now + 23 * 3_600_000 }
    return pregenerated
  }
  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set")

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.token) throw new Error(`Shiprocket auth failed: ${json.message ?? res.statusText}`)
  g._shiprocketToken = { token: json.token as string, expiresAt: now + 23 * 3_600_000 }
  return json.token as string
}

// ---------------------------------------------------------------------------
// Generic caller
// ---------------------------------------------------------------------------

type SrError = { message?: string; errors?: Record<string, string[]> }

async function call<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  const json = (await res.json().catch(() => ({}))) as T & SrError
  if (!res.ok) {
    const detail = json.errors ? Object.values(json.errors).flat().join("; ") : (json.message ?? res.statusText)
    throw new Error(`Shiprocket [${method} ${path}]: ${detail}`)
  }
  return json
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShiprocketOrderInput = {
  /** Cottson order display id, used as the human-readable order id in Shiprocket */
  displayId: number
  /** Medusa order id used as Shiprocket order_id (unique) */
  medusaOrderId: string
  customer: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    pincode: string
    state: string
  }
  items: {
    name: string
    sku: string
    units: number
    /** Selling price per unit in INR */
    sellingPrice: number
  }[]
  /** Total order amount in INR */
  orderTotal: number
  /** Shipment weight in kg (default 0.3 per garment) */
  weight?: number
  paymentMethod?: "Prepaid" | "COD"
}

export type ShiprocketOrder = {
  order_id: number
  shipment_id: number
  status: string
  status_code: number
  onboarding_completed_now: number
  awb_code?: string
  courier_company_id?: number
  courier_name?: string
}

export type ShiprocketTracking = {
  tracking_data?: {
    track_status: number
    shipment_status?: number
    shipment_track: {
      id: number
      awb_code: string
      courier_company_id: number
      courier_name: string
      current_status: string
      delivered_date?: string
      etd?: string
    }[]
    shipment_track_activities: {
      date: string
      status: string
      activity: string
      location: string
    }[]
    track_url?: string
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a Shiprocket order using the forward (adhoc) channel.
 * Returns the Shiprocket order_id and shipment_id.
 */
export async function createShiprocketOrder(input: ShiprocketOrderInput): Promise<ShiprocketOrder> {
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION
  if (!pickupLocation) throw new Error("SHIPROCKET_PICKUP_LOCATION is not set")

  const weight = input.weight ?? 0.3
  const payload = {
    order_id: `CTSON-${input.displayId}`,
    order_date: new Date().toISOString().slice(0, 19),
    pickup_location: pickupLocation,
    channel_id: "",
    comment: `Cottson Clothing order #${input.displayId}`,
    billing_customer_name: input.customer.name.split(" ")[0] ?? input.customer.name,
    billing_last_name: input.customer.name.split(" ").slice(1).join(" ") || ".",
    billing_address: input.customer.address,
    billing_address_2: "",
    billing_city: input.customer.city,
    billing_pincode: input.customer.pincode,
    billing_state: input.customer.state,
    billing_country: "India",
    billing_email: input.customer.email,
    billing_phone: input.customer.phone,
    shipping_is_billing: true,
    order_items: input.items.map((i) => ({
      name: i.name,
      sku: i.sku,
      units: i.units,
      selling_price: String(i.sellingPrice),
      discount: "",
      tax: "",
      hsn: 611020, // HSN code for knitted/crocheted garments (standard for T-shirts)
    })),
    payment_method: input.paymentMethod ?? "Prepaid",
    sub_total: input.orderTotal,
    length: 30,
    breadth: 25,
    height: 5,
    weight,
  }

  return call<ShiprocketOrder>("POST", "/orders/create/adhoc", payload)
}

/**
 * Assigns the best available AWB to an existing shipment.
 * Returns the awb_code string.
 */
export async function generateAWB(shipmentId: number): Promise<{ awb_code: string; courier_company_id: number; courier_name: string }> {
  const res = await call<{ awb_assign_status: number; response?: { data?: { awb_code: string; courier_company_id: number; courier_name: string } }; awb_code?: string }>(
    "POST",
    `/courier/assign/awb/${shipmentId}`,
    {}
  )
  // Shiprocket's response shape differs between channels; handle both
  const data = res.response?.data
  if (!data?.awb_code && !res.awb_code) throw new Error("Shiprocket did not return an AWB code")
  return {
    awb_code: data?.awb_code ?? res.awb_code ?? "",
    courier_company_id: data?.courier_company_id ?? 0,
    courier_name: data?.courier_name ?? "",
  }
}

/**
 * Requests a pickup for the shipment. Shiprocket will schedule the courier.
 */
export async function requestPickup(shipmentId: number): Promise<void> {
  await call("POST", "/courier/generate/pickup", { shipment_id: [shipmentId] })
}

/**
 * Fetches live tracking data for the given AWB code.
 */
export async function getShipmentTracking(awb: string): Promise<ShiprocketTracking> {
  return call<ShiprocketTracking>("GET", `/courier/track/awb/${encodeURIComponent(awb)}`)
}

/**
 * Cancels a Shiprocket order by its Shiprocket order_id.
 */
export async function cancelShiprocketOrder(shiprocketOrderId: number): Promise<void> {
  await call("POST", "/orders/cancel", { ids: [shiprocketOrderId] })
}

/** Builds the public tracking URL for a given AWB */
export function trackingUrl(awb: string) {
  return `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`
}
