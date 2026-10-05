import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth's endpoints: /api/auth/sign-in/email, /sign-out, /get-session, …
export const { GET, POST } = toNextJsHandler(auth);
