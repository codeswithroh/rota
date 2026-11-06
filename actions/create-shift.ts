import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  loadWeek,
  resolveWeek,
  tenantOf,
  toMinutes,
  validDate,
} from "../server/lib/rota.js";
import { guardEdit } from "../server/lib/shift-writes.js";
import { effectiveShifts, ROLES, type ShiftLite } from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Add a confirmed shift directly (manager edit). Rejects with rule_violation (409) when it breaks a hard rule (double-booking, time off, 11h rest, contract hours) unless force is true. Only pass force after the user explicitly confirms. Leave staffId empty for an open shift.",
  schema: z.object({
    staffId: z
      .string()
      .nullish()
      .describe("Staff id from get-week; omit for an open shift"),
    role: z.enum(ROLES).describe("barista, kitchen or floor"),
    date: z.string().describe("YYYY-MM-DD"),
    start: z.string().describe("Local 24h start, e.g. 06:30"),
    end: z.string().describe("Local 24h end, e.g. 14:30; after start"),
    force: z
      .boolean()
      .optional()
      .describe("Save despite hard-rule errors; only after user confirms"),
  }),
  run: async (args, ctx) => {
    const t = tenantOf(ctx);
    const date = validDate(args.date);
    const startMin = toMinutes(args.start, "start");
    const endMin = toMinutes(args.end, "end");
    if (endMin <= startMin) {
      fail("end must be after start.", { errorCode: "invalid_range" });
    }
    const { input } = await loadWeek(t, resolveWeek(date));
    const shift: ShiftLite = {
      id: crypto.randomUUID(),
      staffId: args.staffId || null,
      role: args.role,
      date,
      startMin,
      endMin,
      status: "confirmed",
    };
    const { warnings, errors } = guardEdit(
      input,
      [...effectiveShifts(input.shifts, "current"), shift],
      args.force,
    );
    await getDb()
      .insert(schema.shifts)
      .values({
        id: shift.id,
        staffId: shift.staffId,
        role: shift.role,
        date,
        startMin,
        endMin,
        status: "confirmed",
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
      });
    return { id: shift.id, shift, warnings, forcedErrors: errors };
  },
});
