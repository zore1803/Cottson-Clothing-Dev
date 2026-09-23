import "server-only";
import dns from "node:dns";
import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// MongoDB holds COTTSON's own data (saved studio designs, bulk quotes).
// Commerce data (products, carts, orders) lives in Medusa / Postgres.

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
