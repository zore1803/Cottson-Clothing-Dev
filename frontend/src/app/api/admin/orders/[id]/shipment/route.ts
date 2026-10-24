import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/authz"
import { connectMongo, Shipment } from "@/lib/mongo"
import { medusa, fail } from "@/lib/auth"
import { scheduleShiprocketShipment } from "@/lib/shiprocket-fulfillment"
import { cancelShiprocketOrder, getShipmentTracking, trackingUrl } from "@/lib/shiprocket"

// GET  /api/admin/orders/[id]/shipment  — returns current shipment record + live tracking
// POST /api/admin/orders/[id]/shipment  — (re-)create a Shiprocket order for this Medusa order
// DELETE /api/admin/orders/[id]/shipment — cancel the Shiprocket shipment

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET — current shipment status (+ live tracking when AWB is available)
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: Params) {
  const session = await requireAdmin()
  if (session instanceof Response) return session
  const { id } = await params
  try {
    await connectMongo()
    const shipment = await Shipment.findOne({ medusaOrderId: id }).lean()
    if (!shipment) return NextResponse.json({ shipment: null })

    // Fetch live tracking from Shiprocket if we have an AWB
    let tracking = null
    if (shipment.awb) {
      try {
        const data = await getShipmentTracking(shipment.awb)
        tracking = data.tracking_data ?? null
        // Refresh our status from the live data
        const liveStatus = data.tracking_data?.shipment_track?.[0]?.current_status
        if (liveStatus) {
          const mapped = mapShiprocketStatus(liveStatus)
          if (mapped !== shipment.status) {
            await Shipment.updateOne({ medusaOrderId: id }, { status: mapped, statusUpdatedAt: new Date(), rawStatus: data.tracking_data })
          }
        }
      } catch {
        // Live tracking is best-effort; return what we have
      }
    }

    return NextResponse.json({
      shipment: {
        medusaOrderId: String(shipment.medusaOrderId),
        shiprocketOrderId: shipment.shiprocketOrderId,
        shipmentId: shipment.shipmentId,
        awb: shipment.awb,
        courier: shipment.courier,
        trackingUrl: shipment.awb ? trackingUrl(shipment.awb) : undefined,
        status: shipment.status,
        statusUpdatedAt: shipment.statusUpdatedAt,
        error: shipment.error,
      },
      tracking,
    })
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------------------
// POST — (re-)create the Shiprocket order for this Medusa order
// ---------------------------------------------------------------------------
export async function POST(_req: Request, { params }: Params) {
  const session = await requireAdmin()
  if (session instanceof Response) return session
  const { id } = await params
  try {
    // Fetch the Medusa order to pass to the fulfillment helper
    const { order } = await medusa<{
      order: {
        id: string
        display_id: number
        total: number
        email: string
        shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; city?: string | null; postal_code?: string | null; phone?: string | null } | null
        items?: { id: string; title: string; variant_title?: string | null; quantity: number; unit_price: number }[]
      }
    }>(
      `/admin/orders/${id}?fields=id,display_id,total,email,*shipping_address,*items,items.title,items.variant_title,items.quantity,items.unit_price`,
      { token: session.token }
    )

    await connectMongo()
    // Reset any failed attempt so the helper will proceed
    await Shipment.findOneAndUpdate(
      { medusaOrderId: id },
      { $set: { status: "pending", error: null, awb: null, shiprocketOrderId: null, shipmentId: null, trackingUrl: null } },
      { upsert: true }
    )

    // Run async (non-blocking)
    scheduleShiprocketShipment({
      orderId: order.id,
      displayId: order.display_id,
      email: order.email,
      shippingAddress: order.shipping_address ?? null,
      items: order.items ?? [],
      total: order.total,
    })

    return NextResponse.json({ ok: true, message: "Shipment creation initiated — refresh in a few seconds" })
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------------------
// DELETE — cancel the Shiprocket shipment
// ---------------------------------------------------------------------------
export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireAdmin()
  if (session instanceof Response) return session
  const { id } = await params
  try {
    await connectMongo()
    const shipment = await Shipment.findOne({ medusaOrderId: id }).lean()
    if (!shipment) return NextResponse.json({ error: "No shipment found for this order" }, { status: 404 })
    if (!shipment.shiprocketOrderId) return NextResponse.json({ error: "Shiprocket order not yet created" }, { status: 400 })

    await cancelShiprocketOrder(shipment.shiprocketOrderId)
    await Shipment.updateOne({ medusaOrderId: id }, { status: "cancelled", statusUpdatedAt: new Date() })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps Shiprocket's free-text current_status to our internal enum */
function mapShiprocketStatus(status: string): string {
  const s = status.toLowerCase()
  if (s.includes("delivered")) return "delivered"
  if (s.includes("out for delivery")) return "out_for_delivery"
  if (s.includes("in transit") || s.includes("intransit")) return "in_transit"
  if (s.includes("picked")) return "picked_up"
  if (s.includes("cancel")) return "cancelled"
  return "in_transit"
}
