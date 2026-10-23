// Finds the QA/test records created while testing (emails like qa.*@example.com or anything @example.com)
// and, only when you ask, removes them. It lists what it found first and changes nothing by default.
//
//   node scripts/cleanup-test-data.mjs                 list what would be removed (dry run)
//   node scripts/cleanup-test-data.mjs --yes           delete the listed records
//   node scripts/cleanup-test-data.mjs --yes --cancel-orders
//                                                      also cancel the matching Medusa orders
//
// Medusa orders can't be deleted, only cancelled. For the Medusa part it signs in as a staff member:
//   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=... node scripts/cleanup-test-data.mjs
// Without those it only looks at MongoDB. It does not touch products: remove those from the
// superadmin "Add products" screen. Audit rows are only matched when they name a test email.
import { readFileSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const args = new Set(process.argv.slice(2));
const apply = args.has("--yes");
const cancelOrders = args.has("--cancel-orders");

for (const line of readFileSync(path.join(import.meta.dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

const isTest = (v) => typeof v === "string" && /(^|[^a-z])qa[._]|@example\.com/i.test(v);
const say = (...a) => console.log(...a);

await mongoose.connect(process.env.MONGODB_URI, { dbName: "cottson", serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;

const mongoTargets = [
  { name: "payments", filter: { email: { $regex: "(^qa[._])|@example\\.com$", $options: "i" } }, show: (d) => `${d.razorpayOrderId} ${d.email} ${d.status}` },
  { name: "quotes", filter: { email: { $regex: "(^qa[._])|@example\\.com$", $options: "i" } }, show: (d) => `${d.name} <${d.email}>` },
  { name: "auditlogs", filter: { $or: [{ target: { $regex: "example\\.com", $options: "i" } }, { detail: { $regex: "example\\.com", $options: "i" } }] }, show: (d) => `${d.action} ${d.target ?? ""}` },
  { name: "staffinvites", filter: { email: { $regex: "@example\\.com$", $options: "i" } }, show: (d) => `${d.email} ${d.role}` },
];

say(apply ? "DELETING:\n" : "Dry run, nothing will change. Add --yes to delete.\n");
for (const t of mongoTargets) {
  const docs = await db.collection(t.name).find(t.filter).toArray();
  say(`MongoDB ${t.name}: ${docs.length}`);
  for (const d of docs.slice(0, 40)) say("   ", t.show(d));
  if (apply && docs.length) say("    deleted", (await db.collection(t.name).deleteMany(t.filter)).deletedCount);
}

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const base = process.env.NEXT_PUBLIC_MEDUSA_URL;
  const call = async (p, init = {}, token) => {
    const res = await fetch(`${base}${p}`, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${p}: ${json.message ?? res.status}`);
    return json;
  };
  const { token } = await call("/auth/user/emailpass", { method: "POST", body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });

  const { customers } = await call("/admin/customers?limit=500&fields=id,email", {}, token);
  const customerHits = customers.filter((c) => isTest(c.email));
  say(`\nMedusa customers: ${customerHits.length}`);
  for (const c of customerHits) {
    say("   ", c.email);
    if (apply) await call(`/admin/customers/${c.id}`, { method: "DELETE" }, token).catch((e) => say("     could not delete:", e.message));
  }

  const { orders } = await call("/admin/orders?limit=500&fields=id,display_id,email,status", {}, token);
  const orderHits = orders.filter((o) => isTest(o.email));
  say(`\nMedusa orders: ${orderHits.length} (orders can only be cancelled${cancelOrders ? "" : "; add --cancel-orders to do that"})`);
  for (const o of orderHits) {
    say("   ", `#${o.display_id}`, o.email, o.status);
    if (apply && cancelOrders && o.status !== "canceled") await call(`/admin/orders/${o.id}/cancel`, { method: "POST" }, token).catch((e) => say("     could not cancel:", e.message));
  }
} else {
  say("\n(Medusa customers and orders skipped: set ADMIN_EMAIL and ADMIN_PASSWORD to include them.)");
}

await mongoose.disconnect();
