import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { scoped, tenantOf, validDate } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Record that a staff member can't work a date (sick, exam, holiday). Existing shifts on that date then show a time_off error until they are covered, so follow up with suggest-cover and propose-changes.",
  schema: z.object({
    staffId: z.string().describe("Staff id"),
    date: z.string().describe("YYYY-MM-DD"),
    reason: z.string().max(120).optional().describe('e.g. "sick", "exam"'),
    messageId: z.string().optional().describe("Message that reported it"),
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const date = validDate(args.date);
    const db = getDb();
    const [person] = await db
      .select({ id: schema.staff.id, name: schema.staff.name })
      .from(schema.staff)
      .where(and(eq(schema.staff.id, args.staffId), scoped(schema.staff, t)))
      .limit(1);
    if (!person)
      fail("Unknown staff member.", { errorCode: "not_found", statusCode: 404 });
    const [existing] = await db
      .select({ id: schema.timeOff.id })
      .from(schema.timeOff)
      .where(
        and(
          eq(schema.timeOff.staffId, args.staffId),
          eq(schema.timeOff.date, date),
          scoped(schema.timeOff, t),
        ),
      )
      .limit(1);
    if (existing) return { id: existing.id, staff: person.name, date, existed: true };
    const id = crypto.randomUUID();
    await db.insert(schema.timeOff).values({
      id,
      staffId: args.staffId,
      date,
      reason: args.reason ?? null,
      messageId: args.messageId ?? null,
      ownerEmail: t.ownerEmail,
      orgId: t.orgId,
    });
    return { id, staff: person.name, date, existed: false };
  },
});
