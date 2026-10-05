// Creates (or promotes) an ADMIN account for the dashboard.
//
//   npm run create-admin
//
// Interactive: asks for name, email and password (typed password is not echoed). For automation,
// set ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in the environment instead (never put a real
// password on the command line: it ends up in shell history).
//
// Reads MONGODB_URI and BETTER_AUTH_SECRET from .env.local. Public sign-up is OFF in the app
// (src/lib/auth.ts); this script uses its own auth instance so it can create the first account.
// Passwords are hashed by Better Auth exactly as for a normal sign-in.
import dns from "node:dns";
import readline from "node:readline";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* variables may already be in the environment */
}
if (!process.env.MONGODB_URI || !process.env.BETTER_AUTH_SECRET) {
  console.error("MONGODB_URI and BETTER_AUTH_SECRET must be set (in .env.local).");
  process.exit(1);
}
// Same Windows/Atlas SRV workaround as src/lib/mongo.ts
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.promises.setServers(["8.8.8.8", "1.1.1.1"]);

const ask = (question, { secret = false } = {}) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (secret) {
      // Don't echo what's typed
      rl._writeToOutput = (s) => (s.includes(question) ? process.stdout.write(s) : undefined);
    }
    rl.question(question, (answer) => {
      rl.close();
      if (secret) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });

const name = process.env.ADMIN_NAME || (await ask("Name: "));
const email = (process.env.ADMIN_EMAIL || (await ask("Email: "))).toLowerCase();
const password = process.env.ADMIN_PASSWORD || (await ask("Password (12+ characters): ", { secret: true }));
if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Enter a name and a valid email.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("cottson");
const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  emailAndPassword: { enabled: true, disableSignUp: false, minPasswordLength: 12, maxPasswordLength: 128 },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
});

try {
  const users = db.collection("user");
  const existing = await users.findOne({ email });
  if (existing) {
    // Never touch an existing password here: only grant the role
    await users.updateOne({ email }, { $set: { role: "admin", banned: false } });
    console.log(`${email} already existed: now an admin (password unchanged).`);
  } else {
    if (password.length < 12) throw new Error("The password must be at least 12 characters.");
    await auth.api.signUpEmail({ body: { name, email, password } });
    await users.updateOne({ email }, { $set: { role: "admin", emailVerified: true } });
    console.log(`Created admin ${email}. Sign in at /admin/login.`);
  }
} catch (e) {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.close();
}
