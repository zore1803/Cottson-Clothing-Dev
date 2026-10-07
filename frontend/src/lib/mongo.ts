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

const DesignSchema = new Schema(
  {
    product: { type: String, required: true },
    color: { type: String, required: true },
    width: Number,
    height: Number,
    // Logos (data URLs for now; S3/R2 URLs once uploads go to storage) and text, in photo pixels
    elements: { type: [Schema.Types.Mixed], default: [] },
    preview: String,
    medusaOrderId: { type: String, index: true },
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
    status: { type: String, enum: ["new", "contacted", "won", "lost"], default: "new" },
  },
  { timestamps: true }
);
export const Quote = models.Quote || model("Quote", QuoteSchema);

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
