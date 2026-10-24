import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { connectMongo, Shipment } from "@/lib/mongo"
import { trackingUrl } from "@/lib/shiprocket"

// Shiprocket sends a POST with an X-Shiprocket-Hmac-Sha256 header.
// Env: SHIPROCKET_WEBHOOK_SECRET (the channel password you set in Shiprocket's webhook config)

export const dynamic = "force-dynamic"

type ShiprocketWebhookPayload = {
  awb?: string
  order_id?: string | number   // Shiprocket's own order_id (numeric) OR our "CTSON-<displayId>" string
  current_status?: string
  current_timestamp?: string
  shipment_id?: number
  courier_name?: string
  [key: string]: unknown
}

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET
  if (!secret) return true  // webhook verification is optional during development
  if (!header) return false
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"))
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

function mapStatus(status?: string): string {
  if (!status) return "in_transit"
  const s = status.toLowerCase()
  if (s.includes("delivered")) return "delivered"
  if (s.includes("out for delivery")) return "out_for_delivery"
  if (s.includes("in transit") || s.includes("intransit")) return "in_transit"
  if (s.includes("pickup")) return "picked_up"
  if (s.includes("cancel")) return "cancelled"
  return "in_transit"
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-shiprocket-hmac-sha256")

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: ShiprocketWebhookPayload
  try {
    payload = JSON.parse(rawBody) as ShiprocketWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const awb = payload.awb
  if (!awb) {
    // Some events (like order creation confirmations) may not carry an AWB yet
    return NextResponse.json({ ok: true, skipped: "no awb" })
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
      // The shipment may not exist yet in our DB if the webhook arrived before the API response
      console.warn(`[shiprocket-webhook] no Shipment doc for AWB ${awb} — update dropped`)
    } else {
      console.info(`[shiprocket-webhook] AWB ${awb} → ${String(update.status)}`)
    }
  } catch (e) {
    console.error("[shiprocket-webhook] DB update failed", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
