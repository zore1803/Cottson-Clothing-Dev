import "server-only";
import { AuditLog, connectMongo } from "@/lib/mongo";

// Records who changed what in the admin. Call it after a change has succeeded. It never throws and
// never blocks the request: a failing audit write is logged and the action still goes through.

export type Actor = { id?: string; email?: string } | { admin: { id: string; email: string } } | null | undefined;

const actorOf = (a: Actor) => (a && "admin" in a ? a.admin : (a ?? {}));

export async function audit(actor: Actor, action: string, target?: string, detail?: string) {
  try {
    const who = actorOf(actor);
    await connectMongo();
    await AuditLog.create({ actorId: who.id, actorEmail: who.email, action, target: target?.slice(0, 200), detail: detail?.slice(0, 500) });
  } catch (e) {
    console.error("[audit] could not record", action, e instanceof Error ? e.message : e);
  }
}
