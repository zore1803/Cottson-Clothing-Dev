import "server-only"
import { connectMongo, Shipment } from "@/lib/mongo"
import { createShiprocketOrder, generateAWB, requestPickup, trackingUrl, type ShiprocketOrderInput } from "@/lib/shiprocket"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATE_FROM_PINCODE: Record<string, string> = {
  "1": "Jammu and Kashmir",
  "2": "Himachal Pradesh",
  "3": "Punjab",
  "4": "Chandigarh",
  "5": "Uttarakhand",
  "6": "Haryana",
  "7": "Delhi",
  "8": "Rajasthan",
  "9": "Uttar Pradesh",
}
/** Best-effort state name from 6-digit pincode (first 2 digits zone). */
function stateFromPincode(pincode: string): string {
  const prefix = pincode.slice(0, 1)
  const twoDigit = pincode.slice(0, 2)
  return STATE_FROM_PINCODE[twoDigit] ?? STATE_FROM_PINCODE[prefix] ?? "Maharashtra"
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderForShiprocket = {
  orderId: string
  displayId: number
  email: string
  shippingAddress: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    city?: string | null
    postal_code?: string | null
    phone?: string | null
  } | null
  items: {
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number // in paise
  }[]
  total: number // in paise
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Creates a Shiprocket order for the given Medusa order and persists it in MongoDB.
 * Silently swallows errors (saving them to the Shipment doc) so a Shiprocket outage
 * never fails the checkout. Staff can retry from the admin panel.
 *
 * Call this AFTER the Medusa order is confirmed and the Payment doc has been updated.
 */
export async function scheduleShiprocketShipment(order: OrderForShiprocket): Promise<void> {
  // Run asynchronously; do not block the checkout response
  Promise.resolve().then(() => _createShipment(order)).catch((e) => {
    console.error("[shiprocket] unexpected top-level error", e)
  })
}

async function _createShipment(order: OrderForShiprocket) {
  try {
    await connectMongo()

    // Idempotent: if a Shipment doc already exists (e.g. webhook or admin retry created it), skip
    const existing = await Shipment.findOne({ medusaOrderId: order.orderId })
    if (existing && existing.status !== "failed" && existing.status !== "pending") return

    const a = order.shippingAddress
    const name = [a?.first_name, a?.last_name && a.last_name !== "-" ? a.last_name : ""].filter(Boolean).join(" ") || "Customer"
    const pincode = a?.postal_code ?? "400001"
    const state = stateFromPincode(pincode)

    const input: ShiprocketOrderInput = {
      displayId: order.displayId,
      medusaOrderId: order.orderId,
      customer: {
        name,
        email: order.email,
        phone: a?.phone ?? "",
        address: a?.address_1 ?? "",
        city: a?.city ?? "",
        pincode,
        state,
      },
      items: order.items
        .filter((i) => !i.title?.toLowerCase().includes("customization"))
        .map((i) => ({
          name: [i.title, i.variant_title].filter(Boolean).join(" — "),
          sku: `CTSON-${order.displayId}-${i.title?.slice(0, 8).replace(/\s/g, "-")}`,
          units: i.quantity,
          sellingPrice: Math.round(i.unit_price / 100), // paise → rupees
        })),
      orderTotal: Math.round(order.total / 100), // paise → rupees
      weight: Math.max(0.3, order.items.filter((i) => !i.title?.toLowerCase().includes("customization")).reduce((n, i) => n + i.quantity * 0.3, 0)),
      paymentMethod: "Prepaid",
    }

    if (!input.items.length) {
      console.warn(`[shiprocket] order #${order.displayId} has no shippable items — skipping`)
      return
    }

    // Upsert the doc as "pending" before the API call so retries are safe
    await Shipment.findOneAndUpdate(
      { medusaOrderId: order.orderId },
      { $setOnInsert: { medusaOrderId: order.orderId, displayId: order.displayId, status: "pending" } },
      { upsert: true }
    )

    const srOrder = await createShiprocketOrder(input)
    await Shipment.updateOne(
      { medusaOrderId: order.orderId },
      { shiprocketOrderId: srOrder.order_id, shipmentId: srOrder.shipment_id, status: "created", statusUpdatedAt: new Date(), $unset: { error: "" } }
    )

    // Assign the best courier and generate an AWB
    const awbData = await generateAWB(srOrder.shipment_id)
    await Shipment.updateOne(
      { medusaOrderId: order.orderId },
      { awb: awbData.awb_code, courier: awbData.courier_name, courierId: awbData.courier_company_id, trackingUrl: trackingUrl(awbData.awb_code), status: "awb_assigned", statusUpdatedAt: new Date() }
    )

    // Request a pickup from the courier
    await requestPickup(srOrder.shipment_id).catch((e) => {
      // Pickup scheduling can be done manually; don't fail the whole flow
      console.warn(`[shiprocket] pickup request failed for shipment ${srOrder.shipment_id}:`, e)
    })

    console.info(`[shiprocket] order #${order.displayId} shipment created — AWB ${awbData.awb_code} (${awbData.courier_name})`)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    console.error(`[shiprocket] failed to create shipment for order #${order.displayId}:`, message)
    await connectMongo().then(() =>
      Shipment.findOneAndUpdate(
        { medusaOrderId: order.orderId },
        { status: "failed", error: message, statusUpdatedAt: new Date() },
        { upsert: true }
      )
    ).catch(() => {})
  }
}
