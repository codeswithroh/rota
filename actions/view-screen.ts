import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

import { loadWeek, resolveWeek, tenantOf } from "../server/lib/rota.js";
import {
  dayName,
  effectiveShifts,
  evaluateRota,
  fmtShift,
} from "../shared/rota-rules.js";

export default defineAction({
  description:
    "See what the manager is looking at: the current page, week, and the shift they selected on the grid (with its rule issues). Use it when they say this/here/that shift.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async (_args, ctx) => {
    const navigation = (await readAppState("navigation")) as {
      view?: string;
      week?: string;
      shiftId?: string;
    } | null;
    const selection = (await readAppState("selection")) as {
      kind?: string;
      shiftId?: string;
    } | null;
    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;
    if (selection) screen.selection = selection;

    const view = navigation?.view;
    if (view === "rota" || view === "team" || view === "inbox") {
      const t = await tenantOf(ctx);
      const week = resolveWeek(navigation?.week);
      const { input } = await loadWeek(t, week);
      const current = evaluateRota({
        ...input,
        shifts: effectiveShifts(input.shifts, "current"),
      });
      screen.week = week;
      screen.summary = {
        laborDollars: Math.round(current.metrics.laborCents / 100),
        budgetDollars: Math.round(input.budgetCents / 100),
        coveragePct: current.metrics.coveragePct,
        openShifts: current.metrics.openShifts,
        errors: current.violations.filter((v) => v.severity === "error").length,
        warnings: current.violations.filter((v) => v.severity === "warn")
          .length,
      };
      const shiftId = selection?.shiftId ?? navigation?.shiftId;
      const shift = shiftId
        ? input.shifts.find((s) => s.id === shiftId)
        : undefined;
      if (shift) {
        const person = input.staff.find((p) => p.id === shift.staffId);
        screen.selectedShift = {
          ...shift,
          label: `${dayName(week, shift.date)} ${shift.date} ${fmtShift(shift)} ${shift.role}`,
          staff: person?.name ?? "open",
          issues: current.violations
            .filter((v) => v.shiftIds.includes(shift.id))
            .map((v) => v.message),
        };
      }
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
