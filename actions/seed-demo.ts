import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  nowIso,
  resolveWeek,
  scoped,
  tenantOf,
} from "../server/lib/rota.js";
import {
  addDays,
  errorsOf,
  evaluateRota,
  type CoverageLite,
  type Role,
  type ShiftLite,
  type StaffLite,
  type TimeOffLite,
} from "../shared/rota-rules.js";

const PEOPLE: [string, Role, number, number, string][] = [
  ["Maya Chen", "barista", 19, 40, "#6366f1"],
  ["Leo Okafor", "barista", 18, 32, "#0ea5e9"],
  ["Priya Shah", "barista", 18.5, 40, "#14b8a6"],
  ["Elif Kaya", "barista", 17.5, 30, "#22c55e"],
  ["Sam Rivera", "barista", 17, 24, "#84cc16"],
  ["Tom Becker", "kitchen", 21, 40, "#f97316"],
  ["Ana Duarte", "kitchen", 20, 38, "#ef4444"],
  ["Ravi Menon", "kitchen", 19, 24, "#ec4899"],
  ["Jules Martin", "floor", 16.5, 30, "#a855f7"],
  ["Noor Haddad", "floor", 16.5, 24, "#eab308"],
];

const h = (s: string) => {
  const [a = 0, b = 0] = s.split(":").map(Number);
  return a * 60 + b;
};

// [role, start, end] per weekday template.
const WEEKDAY: [Role, string, string][] = [
  ["barista", "06:30", "14:30"],
  ["barista", "07:00", "13:00"],
  ["barista", "13:00", "21:00"],
  ["kitchen", "06:30", "14:30"],
  ["kitchen", "14:30", "21:00"],
  ["floor", "11:00", "15:00"],
];
const FRIDAY_EXTRA: [Role, string, string][] = [["floor", "17:00", "21:00"]];
const WEEKEND: [Role, string, string][] = [
  ["barista", "08:00", "16:00"],
  ["barista", "08:00", "14:00"],
  ["barista", "14:00", "21:00"],
  ["kitchen", "08:00", "14:30"],
  ["kitchen", "14:30", "21:00"],
  ["floor", "10:00", "16:00"],
  ["floor", "16:00", "21:00"],
];

function coverageRules(): CoverageLite[] {
  const rules: CoverageLite[] = [];
  for (let d = 0; d < 7; d++) {
    const weekend = d >= 5;
    if (!weekend) {
      rules.push({ weekday: d, role: "barista", startMin: h("07:00"), endMin: h("13:00"), needed: 2 });
      rules.push({ weekday: d, role: "barista", startMin: h("13:00"), endMin: h("21:00"), needed: 1 });
      rules.push({ weekday: d, role: "kitchen", startMin: h("07:00"), endMin: h("21:00"), needed: 1 });
      rules.push({ weekday: d, role: "floor", startMin: h("11:30"), endMin: h("14:30"), needed: 1 });
    } else {
      rules.push({ weekday: d, role: "barista", startMin: h("08:00"), endMin: h("14:00"), needed: 2 });
      rules.push({ weekday: d, role: "barista", startMin: h("14:00"), endMin: h("21:00"), needed: 1 });
      rules.push({ weekday: d, role: "kitchen", startMin: h("08:00"), endMin: h("21:00"), needed: 1 });
      rules.push({ weekday: d, role: "floor", startMin: h("10:00"), endMin: h("21:00"), needed: 1 });
    }
  }
  return rules;
}

export default defineAction({
  description:
    "Reset this workspace to the demo café: 10 staff, coverage rules, a $5,200 budget and a valid rota for the given week, plus a couple of staff texts. Deletes existing Rota data for this team. Only run when the user asks for demo data.",
  schema: z.object({
    week: z.string().optional().describe("Any date in the week; default this week"),
  }),
  run: async (args, ctx) => {
    const t = tenantOf(ctx);
    const week = resolveWeek(args.week);
    const db = getDb();

    const staff: StaffLite[] = PEOPLE.map(([name, role, rate, max, color]) => ({
      id: crypto.randomUUID(),
      name,
      role,
      hourlyRateCents: Math.round(rate * 100),
      maxHours: max,
      color,
    }));
    const byName = (n: string) => staff.find((s) => s.name.startsWith(n))!.id;
    const timeOff: TimeOffLite[] = [
      { staffId: byName("Noor"), date: addDays(week, 1), reason: "uni" },
      { staffId: byName("Sam"), date: addDays(week, 5), reason: "exam" },
    ];
    const coverage = coverageRules();
    const budgetCents = 520_000;

    // Greedy fill: fewest hours first, never adding a hard-rule error.
    const shifts: ShiftLite[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(week, d);
      const template = d >= 5 ? WEEKEND : d === 4 ? [...WEEKDAY, ...FRIDAY_EXTRA] : WEEKDAY;
      for (const [role, start, end] of template) {
        const slot: ShiftLite = {
          id: crypto.randomUUID(),
          staffId: null,
          role,
          date,
          startMin: h(start),
          endMin: h(end),
          status: "confirmed",
        };
        // Priya asked for extra hours: seed her light so she can pick up cover.
        const seedStaff = staff.map((p) =>
          p.name.startsWith("Priya") ? { ...p, maxHours: 26 } : p,
        );
        const input = { week, staff: seedStaff, timeOff, coverage, budgetCents };
        const baseErrors = errorsOf(evaluateRota({ ...input, shifts })).length;
        const minutes = evaluateRota({ ...input, shifts }).metrics.minutesByStaff;
        const pick = staff
          .filter((p) => p.role === role)
          .sort((a, b) => (minutes[a.id] ?? 0) / a.maxHours - (minutes[b.id] ?? 0) / b.maxHours)
          .find(
            (p) =>
              errorsOf(
                evaluateRota({ ...input, shifts: [...shifts, { ...slot, staffId: p.id }] }),
              ).length === baseErrors,
          );
        shifts.push({ ...slot, staffId: pick?.id ?? null });
      }
    }

    const now = Date.now();
    const ago = (min: number) => new Date(now - min * 60_000).toISOString();
    const tenant = { ownerEmail: t.ownerEmail, orgId: t.orgId };

    await db.transaction(async (tx) => {
      for (const table of [
        schema.shifts,
        schema.staff,
        schema.timeOff,
        schema.coverage,
        schema.messages,
        schema.proposals,
        schema.weeks,
      ]) {
        await tx.delete(table).where(scoped(table, t));
      }
      await tx.insert(schema.staff).values(staff.map((s) => ({ ...s, ...tenant })));
      await tx.insert(schema.coverage).values(
        coverage.map((c) => ({ id: crypto.randomUUID(), ...c, ...tenant })),
      );
      await tx.insert(schema.timeOff).values(
        timeOff.map((o) => ({ ...o, id: crypto.randomUUID(), reason: o.reason ?? null, ...tenant })),
      );
      await tx.insert(schema.shifts).values(
        shifts.map((s) => ({
          id: s.id,
          staffId: s.staffId,
          role: s.role,
          date: s.date,
          startMin: s.startMin,
          endMin: s.endMin,
          status: "confirmed" as const,
          ...tenant,
        })),
      );
      await tx.insert(schema.weeks).values({
        id: crypto.randomUUID(),
        week,
        budgetCents,
        ...tenant,
      });
      await tx.insert(schema.messages).values([
        {
          id: crypto.randomUUID(),
          staffId: byName("Noor"),
          direction: "in" as const,
          body: "I have a seminar Tuesday, can't come in. Back Wed!",
          status: "handled" as const,
          createdAt: ago(60 * 26),
          ...tenant,
        },
        {
          id: crypto.randomUUID(),
          staffId: byName("Priya"),
          direction: "in" as const,
          body: "If anyone drops a shift this week I'm happy to pick up extra, mornings best",
          status: "new" as const,
          createdAt: ago(95),
          ...tenant,
        },
      ]);
    });

    const check = evaluateRota({ week, staff, shifts, timeOff, coverage, budgetCents });
    return {
      week,
      staff: staff.length,
      shifts: shifts.length,
      openShifts: check.metrics.openShifts,
      errors: errorsOf(check).length,
      laborDollars: Math.round(check.metrics.laborCents / 100),
      seededAt: nowIso(),
    };
  },
});
