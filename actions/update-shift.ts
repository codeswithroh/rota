import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  loadWeek,
  resolveWeek,
  scoped,
  tenantOf,
  toMinutes,
  validDate,
} from "../server/lib/rota.js";
import { guardEdit } from "../server/lib/shift-writes.js";
import { effectiveShifts, ROLES } from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Change one confirmed shift (manager edit): reassign it, move it to another day, or change its times. This is what a drag on the week grid calls. Rejects with rule_violation (409) when it breaks a hard rule unless force is true; only force after the user confirms. Pass staffId null to make it an open shift.",
  schema: z.object({
    id: z.string().describe("Shift id"),
    staffId: z
      .string()
      .nullable()
      .optional()
      .describe("New assignee id; null = open shift; omit to keep"),
    role: z.enum(ROLES).optional().describe("New role; omit to keep"),
    date: z.string().optional().describe("New date YYYY-MM-DD; omit to keep"),
    start: z.string().optional().describe("New local start HH:MM"),
    end: z.string().optional().describe("New local end HH:MM"),
    force: z
      .boolean()
      .optional()
      .describe("Save despite hard-rule errors; only after user confirms"),
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const [row] = await getDb()
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, args.id), scoped(schema.shifts, t)))
      .limit(1);
    if (!row || row.status !== "confirmed") {
      fail("Shift not found.", { errorCode: "not_found", statusCode: 404 });
    }
    const date = args.date ? validDate(args.date) : row.date;
    const startMin = args.start ? toMinutes(args.start, "start") : row.startMin;
    const endMin = args.end ? toMinutes(args.end, "end") : row.endMin;
    if (endMin <= startMin) {
      fail("end must be after start.", { errorCode: "invalid_range" });
    }
    const staffId = args.staffId === undefined ? row.staffId : args.staffId;
    const role = args.role ?? row.role;
    const { input } = await loadWeek(t, resolveWeek(date));
    const current = effectiveShifts(input.shifts, "current").filter(
      (s) => s.id !== row.id,
    );
    const next = { ...row, staffId, role, date, startMin, endMin };
    const { warnings, errors } = guardEdit(
      input,
      [
        ...current,
        {
          id: row.id,
          staffId,
          role,
          date,
          startMin,
          endMin,
          status: "confirmed",
        },
      ],
      args.force,
    );
    await getDb()
      .update(schema.shifts)
      .set({ staffId, role, date, startMin, endMin })
      .where(and(eq(schema.shifts.id, row.id), scoped(schema.shifts, t)));
    return {
      id: row.id,
      shift: {
        id: next.id,
        staffId,
        role,
        date,
        startMin,
        endMin,
      },
      warnings,
      forcedErrors: errors,
    };
  },
});
