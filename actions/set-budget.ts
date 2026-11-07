import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { resolveWeek, scoped, tenantOf } from "../server/lib/rota.js";

export default defineAction({
  description: "Set the labor budget for one week, in dollars.",
  schema: z.object({
    week: z.string().describe("Any date in the week, YYYY-MM-DD"),
    budgetDollars: z.coerce.number().min(0).max(1_000_000),
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const week = resolveWeek(args.week);
    const budgetCents = Math.round(args.budgetDollars * 100);
    const db = getDb();
    const [row] = await db
      .select({ id: schema.weeks.id })
      .from(schema.weeks)
      .where(and(eq(schema.weeks.week, week), scoped(schema.weeks, t)))
      .limit(1);
    if (row) {
      await db
        .update(schema.weeks)
        .set({ budgetCents })
        .where(eq(schema.weeks.id, row.id));
    } else {
      await db.insert(schema.weeks).values({
        id: crypto.randomUUID(),
        week,
        budgetCents,
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
      });
    }
    return { week, budgetCents };
  },
});
