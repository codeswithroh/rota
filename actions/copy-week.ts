import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { loadWeek, resolveWeek, tenantOf } from "../server/lib/rota.js";
import {
  addDays,
  effectiveShifts,
  evaluateRota,
  weekdayIndex,
} from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Start a new week from an existing one: copies its confirmed shifts day-for-day. Refuses when the target week already has shifts. Afterwards read get-week and fix any time-off or coverage issues with propose-changes.",
  schema: z.object({
    from: z.string().describe("Any date in the source week, YYYY-MM-DD"),
    to: z.string().describe("Any date in the target week, YYYY-MM-DD"),
  }),
  run: async (args, ctx) => {
    const t = tenantOf(ctx);
    const from = resolveWeek(args.from);
    const to = resolveWeek(args.to);
    if (from === to) fail("Pick two different weeks.", { errorCode: "same_week" });
    const target = await loadWeek(t, to);
    if (target.input.shifts.length) {
      fail(`Week ${to} already has ${target.input.shifts.length} shifts.`, {
        errorCode: "week_not_empty",
        statusCode: 409,
      });
    }
    const source = await loadWeek(t, from);
    const rows = effectiveShifts(source.input.shifts, "current").map((s) => ({
      id: crypto.randomUUID(),
      staffId: s.staffId,
      role: s.role,
      date: addDays(to, weekdayIndex(from, s.date)),
      startMin: s.startMin,
      endMin: s.endMin,
      status: "confirmed" as const,
      ownerEmail: t.ownerEmail,
      orgId: t.orgId,
    }));
    if (rows.length) await getDb().insert(schema.shifts).values(rows);
    const check = evaluateRota({ ...target.input, shifts: rows });
    return {
      week: to,
      copied: rows.length,
      errors: check.violations.filter((v) => v.severity === "error"),
    };
  },
});
