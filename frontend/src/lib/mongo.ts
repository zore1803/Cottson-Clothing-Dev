import "server-only";
import dns from "node:dns";
import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// MongoDB holds saved designs, bulk quotes and enquiry-only catalog additions.
// Checkout products, carts and orders live in Medusa / Postgres.

// Some Windows resolvers refuse the SRV lookups Atlas needs; use public DNS for them
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];
dns.setServers(PUBLIC_DNS);
dns.promises.setServers(PUBLIC_DNS); // the MongoDB driver uses the promise-based resolver

const g = globalThis as unknown as { mongo?: Promise<typeof mongoose> };

export function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Reuse one connection across hot reloads and serverless invocations
  g.mongo ??= mongoose.connect(uri, { dbName: "cottson", serverSelectionTimeoutMS: 15000 }).catch((e) => {
    g.mongo = undefined; // retry on the next request instead of caching the failure
    throw e;
  });
  return g.mongo;
}

export const DESIGN_STATUSES = ["pending", "ordered", "approved", "in_production", "shipped"] as const;
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

const DesignSchema = new Schema(
  {
    product: { type: String, required: true },
    color: { type: String, required: true },
    width: Number,
    height: Number,
    // Logos (data URLs for now; S3/R2 URLs once uploads go to storage) and text, in photo pixels
    elements: { type: [Schema.Types.Mixed], default: [] },
    preview: String,
    // Cloudinary id of the preview, kept so unused uploads can be cleaned up later
    previewPublicId: String,
    medusaOrderId: { type: String, index: true },
    // Medusa customer who saved the design; absent for guest designs
    customerId: { type: String, index: true },
    // Production workflow: pending until the order is placed, then moved along by the team
    status: { type: String, enum: DESIGN_STATUSES, default: "pending", index: true },
    statusNote: String,
  },
  { timestamps: true }
);
export type DesignDoc = InferSchemaType<typeof DesignSchema>;
export const Design = models.Design || model("Design", DesignSchema);

const QuoteSchema = new Schema(
  {
    name: { type: String, required: true },
    company: String,
    email: { type: String, required: true },
    phone: String,
    product: String,
    quantity: { type: Number, min: 1 },
    message: String,
    status: { type: String, enum: ["new", "contacted", "won", "lost"], default: "new", index: true },
    notes: String,
  },
  { timestamps: true }
);
export const Quote = models.Quote || model("Quote", QuoteSchema);

// One document per attempt to pay for a cart. Amounts are in paise, as Razorpay expects.
// "created" -> "processing" (while the Medusa order is being placed) -> "paid"
const PaymentSchema = new Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    mode: { type: String, default: "dummy" },
    method: String,
    cartId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "processing", "paid", "failed", "order_failed"], default: "created", index: true },
    email: String,
    customerId: String,
    // What was bought, kept so the order can be checked against pricing rules once placed
    lines: { type: [Schema.Types.Mixed], default: [] },
    designIds: { type: [String], default: [] },
    medusaOrderId: { type: String, index: true },
    displayId: Number,
    orderTotal: Number,
    error: String,
  },
  { timestamps: true }
);
export const Payment = models.Payment || model("Payment", PaymentSchema);

const CatalogProductSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  sizes: [String],
  originalColor: String,
  colors: [String],
  minBulk: Number,
  productionDays: Number,
  imageUrl: String,
  colorImages: { type: Map, of: String },
  customColor: Boolean,
  printOnDemand: Boolean,
  express: Boolean,
  promo: Boolean,
  livePreview: { type: Boolean, default: false },
}, { timestamps: true });
// Keep added schema fields during Next.js hot reloads. An older cached model
// otherwise silently drops the colour photos when creating a new product.
if (models.CatalogProduct && !models.CatalogProduct.schema.path("colorImages")) {
  models.CatalogProduct.schema.add({
    colorImages: { type: Map, of: String },
    customColor: Boolean,
    printOnDemand: Boolean,
    express: Boolean,
    promo: Boolean,
  });
}
export const CatalogProduct = models.CatalogProduct || model("CatalogProduct", CatalogProductSchema);

// Built-in (in-code) products a superadmin has taken off the shop. The product stays in code and
// in past orders; it just stops being listed, and can be restored.
const HiddenProductSchema = new Schema({ slug: { type: String, required: true, unique: true } }, { timestamps: true });
export const HiddenProduct = models.HiddenProduct || model("HiddenProduct", HiddenProductSchema);

// Staff roles live here, not in Medusa's user metadata: any Medusa admin can edit their own
// metadata through Medusa's API, which would let an admin promote themselves. Only superadmins get a
// row; everyone else is a plain admin. Keyed by Medusa user id, which cannot be edited.
const StaffRoleSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    role: { type: String, enum: ["superadmin"], default: "superadmin" },
    // Listed in SUPERADMIN_EMAILS when first seen: can't be demoted or removed from the UI
    owner: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const StaffRole = models.StaffRole || model("StaffRole", StaffRoleSchema);

// A pending invite: Medusa holds the invite token; this keeps the role the inviter chose, which the
// invitee can't influence when they accept.
const StaffInviteSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
    inviteId: { type: String, required: true },
    invitedBy: String,
  },
  { timestamps: true }
);
export const StaffInvite = models.StaffInvite || model("StaffInvite", StaffInviteSchema);
