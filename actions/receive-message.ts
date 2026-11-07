import { defineAction, fail } from "@agent-native/core/action";
import { emitAsync } from "@agent-native/core/event-bus";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { ensureAutoHandleOrg } from "../server/lib/auto-handle.js";
import { nowIso, scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Record an inbound text from a staff member (sick day, swap request, availability). It lands in the Rota inbox as new. Used by the staff-phone simulator and by messaging integrations.",
  schema: z.object({
    staffId: z.string().describe("Sender's staff id"),
    body: z.string().min(1).max(1000).describe("Message text as sent"),
  }),
  run: async ({ staffId, body }, ctx) => {
    const t = await tenantOf(ctx);
    const [person] = await getDb()
      .select({ id: schema.staff.id, name: schema.staff.name })
      .from(schema.staff)
      .where(and(eq(schema.staff.id, staffId), scoped(schema.staff, t)))
      .limit(1);
    if (!person)
      fail("Unknown staff member.", { errorCode: "not_found", statusCode: 404 });
    const message = {
      id: crypto.randomUUID(),
      staffId,
      direction: "in" as const,
      body,
      status: "new" as const,
      createdAt: nowIso(),
      ownerEmail: t.ownerEmail,
      orgId: t.orgId,
    };
    await getDb().insert(schema.messages).values(message);
    await ensureAutoHandleOrg(t.ownerEmail, t.orgId).catch((err) =>
      console.error("[rota] auto-handle org check failed:", err),
    );
    // Lets the "auto-handle texts" automation draft a proposal on its own.
    const queued = emitAsync(
      "rota.text.received",
      {
        messageId: message.id,
        staffId,
        staffName: person.name,
        body,
        receivedAt: message.createdAt,
      },
      { owner: t.ownerEmail },
    );
    await queued.catch((err) => console.error("[rota] queueing text event failed:", err));
    await drainNowOnServerless((ctx as any)?.requestHeaders);
    return { id: message.id, from: person.name, body };
  },
});

// On Vercel the event queue is only drained by the cron sweep (daily on the
// Hobby plan). Kick the sweep as its own request so auto-handle runs within
// seconds, without holding this response open for the whole agent run.
async function drainNowOnServerless(headers: unknown) {
  const secret = process.env.CRON_SECRET;
  if (!process.env.VERCEL || !secret) return;
  const h = headers instanceof Headers ? headers : undefined;
  const host =
    h?.get("x-forwarded-host") ?? h?.get("host") ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return;
  const kick = fetch(`https://${host}/_agent-native/jobs/_process-sweep`, {
    headers: { authorization: `Bearer ${secret}` },
  }).catch((err) => console.error("[rota] auto-handle sweep kick failed:", err));
  const ctx = (globalThis as any)[Symbol.for("@vercel/request-context")]?.get?.();
  ctx?.waitUntil?.(kick);
  // Long enough for the request to leave; the sweep runs in its own invocation.
  await Promise.race([kick, new Promise((r) => setTimeout(r, 1500))]);
}
