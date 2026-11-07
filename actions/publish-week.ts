import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  DEFAULT_BUDGET_CENTS,
  loadWeek,
  nowIso,
  resolveWeek,
  tenantOf,
} from "../server/lib/rota.js";
import {
  dayName,
  effectiveShifts,
  errorsOf,
  evaluateRota,
  fmtShift,
} from "../shared/rota-rules.js";
import { and, eq } from "drizzle-orm";
import { scoped } from "../server/lib/rota.js";

export default defineAction({
  description:
    "Publish a week: texts every scheduled staff member their shifts. Blocked (409 rota_has_errors) while any hard-rule error remains or a proposal is pending.",
  schema: z.object({
    week: z.string().describe("Any date in the week, YYYY-MM-DD"),
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const week = resolveWeek(args.week);
    const { input, weekRow, proposals } = await loadWeek(t, week);
    if (proposals.length) {
      fail(`Review "${proposals[0]?.title}" before publishing.`, {
        errorCode: "proposal_pending",
        statusCode: 409,
      });
    }
    const current = effectiveShifts(input.shifts, "current");
    const errors = errorsOf(evaluateRota({ ...input, shifts: current }));
    if (errors.length) {
      fail(
        `Fix ${errors.length} rule error${errors.length > 1 ? "s" : ""} first: ${errors.map((e) => e.message).join(" ")}`,
        { errorCode: "rota_has_errors", statusCode: 409, details: { errors } },
      );
    }
    const now = nowIso();
    const byStaff = new Map<string, string[]>();
    for (const s of current) {
      if (!s.staffId) continue;
      byStaff.set(s.staffId, [
        ...(byStaff.get(s.staffId) ?? []),
        `${dayName(week, s.date)} ${fmtShift(s)}`,
      ]);
    }
    const db = getDb();
    await db.transaction(async (tx) => {
      if (weekRow) {
        await tx
          .update(schema.weeks)
          .set({ publishedAt: now })
          .where(and(eq(schema.weeks.id, weekRow.id), scoped(schema.weeks, t)));
      } else {
        await tx.insert(schema.weeks).values({
          id: crypto.randomUUID(),
          week,
          budgetCents: DEFAULT_BUDGET_CENTS,
          publishedAt: now,
          ownerEmail: t.ownerEmail,
          orgId: t.orgId,
        });
      }
      const outbound = [...byStaff].map(([staffId, lines]) => ({
        id: crypto.randomUUID(),
        staffId,
        direction: "out" as const,
        body: `Your shifts for the week of ${week}: ${lines.join(", ")}.`,
        status: "handled" as const,
        createdAt: now,
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
      }));
      if (outbound.length) await tx.insert(schema.messages).values(outbound);
    });
    return { week, publishedAt: now, notified: byStaff.size };
  },
});
