import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { loadWeek, resolveWeek, scoped, tenantOf } from "../server/lib/rota.js";
import { effectiveShifts, suggestCover } from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Rank who could take a shift. Tries every staff member with the shift's role against the rule engine; ok=true means no new hard-rule error. Sorted best first (no issues, fewest hours, cheapest). Use it before proposing a swap.",
  schema: z.object({ shiftId: z.string().describe("Shift id") }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ shiftId }, ctx) => {
    const t = await tenantOf(ctx);
    const [row] = await getDb()
      .select({ date: schema.shifts.date })
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, shiftId), scoped(schema.shifts, t)))
      .limit(1);
    if (!row) fail("Shift not found.", { errorCode: "not_found", statusCode: 404 });
    const { input } = await loadWeek(t, resolveWeek(row.date));
    const candidates = suggestCover(
      { ...input, shifts: effectiveShifts(input.shifts, "current") },
      shiftId,
    );
    return { shiftId, candidates };
  },
});
