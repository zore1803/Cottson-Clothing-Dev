import "server-only";
// Admin dashboard authentication (Better Auth). Staff sign in with email + password; there is no
// public sign-up. The first admin is created with `npm run create-admin`, and an admin can then
// add staff from the dashboard.
//
// Defence in depth: even if an account somehow existed, /admin and /api/admin check the user's
// ROLE on the server (see lib/admin-guard.ts), so a plain "user" account gets nothing.
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
// Imported for its side effect: the public-DNS workaround Atlas SRV lookups need on some resolvers
import "@/lib/mongo";

if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is not set");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

/** Roles that may enter the dashboard */
export const STAFF_ROLES = ["admin", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// One MongoClient per server process (survives hot reloads). It connects on first use.
const g = globalThis as unknown as { authMongo?: MongoClient };
const client = (g.authMongo ??= new MongoClient(process.env.MONGODB_URI));

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Same database as the rest of COTTSON's own data; Better Auth adds user / session / account collections
  database: mongodbAdapter(client.db("cottson")),
  emailAndPassword: {
    enabled: true,
    // Staff are created by an admin (or the seed script), never through a public form. The seed
    // script sets ALLOW_ADMIN_SIGNUP=1 for its own single run only.
    disableSignUp: process.env.ALLOW_ADMIN_SIGNUP !== "1",
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 12, // 12 hours: a working day
    updateAge: 60 * 60, // refresh the expiry hourly while in use
    // No cookie cache on purpose: every request checks the session in the database, so a ban,
    // role change or sign-out takes effect immediately (a cache would honour a revoked session
    // for its whole lifetime). Admin traffic is small; this costs one lookup per page view.
    cookieCache: { enabled: false },
  },
  advanced: {
    // httpOnly + SameSite=Lax are the defaults; Secure is switched on automatically for https
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  // Brute-force guard on every auth endpoint (sign-in has its own, stricter built-in limit).
  // Counters live in the database so they hold across serverless instances, not per process.
  rateLimit: { enabled: true, window: 60, max: 20, storage: "database" },
  plugins: [
    // Roles ("admin", "staff") on the user record, plus user-management endpoints for admins
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(), // lets server actions set the session cookie (must be last)
  ],
});

export type Session = typeof auth.$Infer.Session;
