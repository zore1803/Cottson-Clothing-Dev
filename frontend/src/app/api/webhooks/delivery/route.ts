import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { connectMongo, Shipment } from "@/lib/mongo"
import { trackingUrl } from "@/lib/shiprocket"

// Shiprocket Webhook Receiver
// Note: Shiprocket prohibits keywords like "shiprocket", "kartrocket", "sr", "kr" in the URL,
// so this route is hosted at /api/webhooks/delivery.
//
// Authentication:
// Shiprocket passes the configured Token in the header specified in your Shiprocket dashboard
// (commonly "x-api-key" or "authorization"). Legacy setups may use HMAC ("x-shiprocket-hmac-sha256").

export const dynamic = "force-dynamic"

type ShiprocketWebhookPayload = {
  awb?: string
  order_id?: string | number
  current_status?: string
  current_timestamp?: string
  shipment_id?: number
  courier_name?: string
  [key: string]: unknown
}

function verifyAuth(req: Request, rawBody: string): boolean {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET || process.env.SHIPROCKET_WEBHOOK_TOKEN
  // If no secret configured in .env, allow during development
  if (!secret) return true

  // 1. Check Header Token (x-api-key or Authorization Bearer as configured in Shiprocket)
  const apiKey = req.headers.get("x-api-key")
  if (apiKey && apiKey === secret) return true

  const authHeader = req.headers.get("authorization")
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "")
    if (token === secret) return true
  }

  // 2. Check HMAC signature if sent
  const hmacHeader = req.headers.get("x-shiprocket-hmac-sha256")
  if (hmacHeader) {
    try {
      const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"))
      const given = Buffer.from(hmacHeader)
      if (given.length === expected.length && timingSafeEqual(given, expected)) return true
    } catch {
      // signature check failed
    }
  }

  return false
}

function mapStatus(status?: string): string {
  if (!status) return "in_transit"
  const s = status.toLowerCase()
  if (s.includes("delivered")) return "delivered"
  if (s.includes("out for delivery")) return "out_for_delivery"
  if (s.includes("in transit") || s.includes("intransit")) return "in_transit"
  if (s.includes("pickup") || s.includes("picked")) return "picked_up"
  if (s.includes("cancel")) return "cancelled"
  return "in_transit"
}

// Health check / verification support
export async function GET() {
  return NextResponse.json({ ok: true, service: "delivery-webhook" })
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  if (!verifyAuth(req, rawBody)) {
    return NextResponse.json({ error: "Unauthorized: invalid token" }, { status: 401 })
  }

  // Handle empty or test pings
  if (!rawBody || rawBody.trim() === "" || rawBody.trim() === "{}") {
    return NextResponse.json({ ok: true, message: "Webhook ping received" })
  }

  let payload: ShiprocketWebhookPayload
  try {
    payload = JSON.parse(rawBody) as ShiprocketWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const awb = payload.awb
  if (!awb) {
    // Shiprocket test pings or non-tracking events may not contain an awb
    return NextResponse.json({ ok: true, message: "Acknowledged (no AWB)" })
  }

  try {
    await connectMongo()
    const update: Record<string, unknown> = {
      status: mapStatus(payload.current_status),
      statusUpdatedAt: payload.current_timestamp ? new Date(payload.current_timestamp) : new Date(),
      rawStatus: payload,
    }
    if (payload.courier_name) update.courier = payload.courier_name
    if (!update.trackingUrl) update.trackingUrl = trackingUrl(awb)

    const result = await Shipment.findOneAndUpdate({ awb }, { $set: update }, { new: true })
    if (!result) {
      console.warn(`[delivery-webhook] no Shipment record found for AWB ${awb}`)
    } else {
      console.info(`[delivery-webhook] updated AWB ${awb} status to ${String(update.status)}`)
    }
  } catch (e) {
    console.error("[delivery-webhook] database update failed", e)
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
