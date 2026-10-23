// Run with: npm test   (needs --conditions react-server so "server-only" imports load outside Next)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { sign, verifySignature, paymentMode } from "../src/lib/razorpay-dummy.ts";
import { verifyWebhookSignature } from "../src/lib/razorpay.ts";
import { rateLimit } from "../src/lib/security.ts";
import { proxy } from "../src/proxy.ts";
import { garmentUnitPrice, shippingFor, bulkDiscount, CUSTOMIZATION_FEE, lineUnitPrice } from "../src/lib/pricing.ts";

const withEnv = (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
};

// ---- payments ----

test("payment signatures verify only for the exact order and payment", () => {
  withEnv({ RAZORPAY_KEY_SECRET: "test_secret" }, () => {
    const sig = sign("order_1", "pay_1");
    assert.equal(sig, createHmac("sha256", "test_secret").update("order_1|pay_1").digest("hex"));
    assert.ok(verifySignature("order_1", "pay_1", sig));
    assert.ok(!verifySignature("order_1", "pay_2", sig));
    assert.ok(!verifySignature("order_2", "pay_1", sig));
    assert.ok(!verifySignature("order_1", "pay_1", "deadbeef"));
    assert.ok(!verifySignature("order_1", "pay_1", ""));
  });
});

test("webhook signatures need the webhook secret and a matching body", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const good = createHmac("sha256", "whsec").update(body).digest("hex");
  withEnv({ RAZORPAY_WEBHOOK_SECRET: "whsec" }, () => {
    assert.ok(verifyWebhookSignature(body, good));
    assert.ok(!verifyWebhookSignature(body + " ", good), "a changed body must fail");
    assert.ok(!verifyWebhookSignature(body, null));
    assert.ok(!verifyWebhookSignature(body, "nope"));
  });
  withEnv({ RAZORPAY_WEBHOOK_SECRET: undefined }, () => assert.ok(!verifyWebhookSignature(body, good), "no secret configured means nothing is accepted"));
});

test("payment mode: real keys win, production never falls back to the dummy", () => {
  const none = { RAZORPAY_KEY_ID: undefined, RAZORPAY_KEY_SECRET: undefined, PAYMENT_MODE: undefined };
  withEnv({ ...none, NODE_ENV: "development" }, () => assert.equal(paymentMode(), "dummy"));
  withEnv({ ...none, NODE_ENV: "production" }, () => assert.equal(paymentMode(), "off"));
  withEnv({ ...none, RAZORPAY_KEY_ID: "rzp_live_x", RAZORPAY_KEY_SECRET: "s", NODE_ENV: "production" }, () => assert.equal(paymentMode(), "razorpay"));
  withEnv({ ...none, PAYMENT_MODE: "razorpay", NODE_ENV: "production" }, () => assert.equal(paymentMode(), "off"), "razorpay without keys is refused");
});

// ---- pricing ----

test("bulk tiers, customization fee and shipping", () => {
  assert.equal(bulkDiscount(24), 0);
  assert.equal(bulkDiscount(25), 0.1);
  assert.equal(bulkDiscount(50), 0.15);
  assert.equal(bulkDiscount(100), 0.2);
  assert.equal(garmentUnitPrice(1000, 100), 800);
  assert.equal(lineUnitPrice(1000, 25, true), 900 + CUSTOMIZATION_FEE);
  assert.equal(shippingFor(0), 0);
  assert.equal(shippingFor(1000), 99);
  assert.equal(shippingFor(1999), 0);
});

// ---- rate limiting (no REDIS_URL here, so the in-memory path) ----

test("rate limit allows the limit then answers 429, per client", async () => {
  const req = (ip) => new Request("http://x/api", { headers: { "x-forwarded-for": ip } });
  const name = `t-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(await rateLimit(req("1.1.1.1"), name, 3, 60_000), null);
  const blocked = await rateLimit(req("1.1.1.1"), name, 3, 60_000);
  assert.equal(blocked?.status, 429);
  assert.ok(blocked.headers.get("retry-after"));
  assert.equal(await rateLimit(req("2.2.2.2"), name, 3, 60_000), null, "another client is unaffected");
});

// ---- proxy rules ----

const call = (path, { cookies = "", method = "GET", headers = {} } = {}) => proxy(new NextRequest(`http://localhost:3000${path}`, { method, headers: { cookie: cookies, host: "localhost:3000", ...headers } }));
const loc = (res) => res.headers.get("location");

test("proxy: admin and superadmin areas need an admin session", () => {
  assert.match(loc(call("/admin")), /\/login\?next=%2Fadmin/);
  assert.match(loc(call("/superadmin/staff")), /\/login\?next=%2Fsuperadmin%2Fstaff/);
  assert.equal(call("/admin", { cookies: "cottson_admin=t" }).headers.get("location"), null);
  assert.equal(call("/superadmin/staff", { cookies: "cottson_admin=t" }).headers.get("location"), null);
});

test("proxy: admins are kept in the admin area; customers can't open it", () => {
  assert.match(loc(call("/products", { cookies: "cottson_admin=t" })), /\/admin$/);
  assert.match(loc(call("/admin", { cookies: "cottson_session=t" })), /\/login/);
});

test("proxy: staff APIs answer 401 without an admin cookie", async () => {
  for (const path of ["/api/admin/orders", "/api/superadmin/staff", "/api/superadmin/upload"]) {
    const res = call(path);
    assert.equal(res.status, 401, path);
  }
  assert.notEqual(call("/api/superadmin/staff", { cookies: "cottson_admin=t" }).status, 401);
});

test("proxy: cross-site state-changing API requests are blocked", () => {
  assert.equal(call("/api/checkout", { method: "POST", headers: { origin: "https://evil.example" } }).status, 403);
  assert.notEqual(call("/api/checkout", { method: "POST", headers: { origin: "http://localhost:3000" } }).status, 403);
  assert.notEqual(call("/api/payments/razorpay/webhook", { method: "POST" }).status, 403, "Razorpay sends no Origin header");
});
