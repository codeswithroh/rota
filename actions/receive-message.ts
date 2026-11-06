import { defineAction, fail } from "@agent-native/core/action";
import { emit } from "@agent-native/core/event-bus";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { nowIso, scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Record an inbound text from a staff member (sick day, swap request, availability). It lands in the Rota inbox as new. Used by the staff-phone simulator and by messaging integrations.",
  schema: z.object({
    staffId: z.string().describe("Sender's staff id"),
    body: z.string().min(1).max(1000).describe("Message text as sent"),
  }),
  run: async ({ staffId, body }, ctx) => {
    const t = tenantOf(ctx);
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
    // Lets the "auto-handle texts" automation draft a proposal on its own.
    emit(
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
    return { id: message.id, from: person.name, body };
  },
});
