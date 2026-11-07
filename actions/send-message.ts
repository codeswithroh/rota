import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { nowIso, scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Text one staff member from the manager (a reply, a question about availability, a thank-you). Keep it short and plain. Optionally mark the message you are replying to as handled.",
  schema: z.object({
    staffId: z.string().describe("Recipient's staff id"),
    body: z.string().min(1).max(500).describe("Text to send"),
    replyToId: z
      .string()
      .optional()
      .describe("Inbound message id to mark handled"),
  }),
  run: async ({ staffId, body, replyToId }, ctx) => {
    const t = await tenantOf(ctx);
    const db = getDb();
    const [person] = await db
      .select({ id: schema.staff.id, name: schema.staff.name })
      .from(schema.staff)
      .where(and(eq(schema.staff.id, staffId), scoped(schema.staff, t)))
      .limit(1);
    if (!person)
      fail("Unknown staff member.", { errorCode: "not_found", statusCode: 404 });
    const id = crypto.randomUUID();
    await db.insert(schema.messages).values({
      id,
      staffId,
      direction: "out",
      body,
      status: "handled",
      createdAt: nowIso(),
      ownerEmail: t.ownerEmail,
      orgId: t.orgId,
    });
    if (replyToId) {
      await db
        .update(schema.messages)
        .set({ status: "handled" })
        .where(and(eq(schema.messages.id, replyToId), scoped(schema.messages, t)));
    }
    return { id, to: person.name, body };
  },
});
