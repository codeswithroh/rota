/**
 * Rota rule engine. Pure and isomorphic: the week grid runs it on every drag
 * for instant feedback, and the server actions run the same code before any
 * write. The agent never decides whether a rota is valid; this file does.
 */

export const ROLES = ["barista", "kitchen", "floor"] as const;
export type Role = (typeof ROLES)[number];

export const MIN_REST_MIN = 11 * 60;
export const MAX_SHIFT_MIN = 10 * 60;
export const MIN_SHIFT_MIN = 3 * 60;
export const OVERTIME_MIN = 40 * 60;

export interface StaffLite {
  id: string;
  name: string;
  role: Role;
  hourlyRateCents: number;
  maxHours: number;
  color?: string | null | undefined;
}

export type ShiftChange = "add" | "replace" | "remove";

export interface ShiftLite {
  id: string;
  staffId: string | null;
  role: Role;
  /** Local wall-clock date, YYYY-MM-DD. */
  date: string;
  /** Minutes after local midnight. */
  startMin: number;
  endMin: number;
  status: "confirmed" | "proposed";
  change?: ShiftChange | null | undefined;
  replacesId?: string | null | undefined;
  proposalId?: string | null | undefined;
}

export interface TimeOffLite {
  id?: string | undefined;
  staffId: string;
  date: string;
  reason?: string | null | undefined;
}

export interface CoverageLite {
  /** 0 = Monday ... 6 = Sunday */
  weekday: number;
  role: Role;
  startMin: number;
  endMin: number;
  needed: number;
}

export type ViolationCode =
  | "overlap"
  | "time_off"
  | "rest_gap"
  | "max_hours"
  | "overtime"
  | "shift_too_long"
  | "shift_too_short"
  | "open_shift"
  | "coverage_gap"
  | "over_budget";

export interface Violation {
  code: ViolationCode;
  severity: "error" | "warn";
  message: string;
  staffId?: string | undefined;
  shiftIds: string[];
  date?: string | undefined;
}

/** Half-hour coverage slots in one day part: `needed` slots, `have` met. */
export interface CoverageCell {
  date: string;
  part: DayPart;
  needed: number;
  have: number;
}

export type DayPart = "morning" | "midday" | "evening";
export const DAY_PARTS: { id: DayPart; startMin: number; endMin: number }[] = [
  { id: "morning", startMin: 6 * 60, endMin: 11 * 60 },
  { id: "midday", startMin: 11 * 60, endMin: 16 * 60 },
  { id: "evening", startMin: 16 * 60, endMin: 22 * 60 },
];

export interface RotaMetrics {
  totalMinutes: number;
  laborCents: number;
  budgetCents: number;
  coveragePct: number;
  openShifts: number;
  minutesByStaff: Record<string, number>;
  laborCentsByDay: Record<string, number>;
  coverage: CoverageCell[];
}

export interface RotaInput {
  week: string;
  staff: StaffLite[];
  shifts: ShiftLite[];
  timeOff: TimeOffLite[];
  coverage: CoverageLite[];
  budgetCents: number;
}

export interface RotaEvaluation {
  violations: Violation[];
  metrics: RotaMetrics;
}

// ---------- dates ----------

export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  const d = parseDate(date);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return formatDate(d);
}

export function todayLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekDates(week: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(week, i));
}

export function weekdayIndex(week: string, date: string): number {
  return Math.round(
    (parseDate(date).getTime() - parseDate(week).getTime()) / 86_400_000,
  );
}

export function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function fmtShift(s: Pick<ShiftLite, "startMin" | "endMin">): string {
  return `${fmtTime(s.startMin)}–${fmtTime(s.endMin)}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function dayName(week: string, date: string): string {
  return DAY_NAMES[weekdayIndex(week, date)] ?? date;
}

// ---------- proposals ----------

/**
 * The rota as it would look with or without pending proposed rows applied.
 * `current` ignores proposals. `proposed` drops rows replaced/removed by a
 * proposal and adds the proposed rows.
 */
export function effectiveShifts(
  shifts: ShiftLite[],
  mode: "current" | "proposed",
): ShiftLite[] {
  const confirmed = shifts.filter((s) => s.status === "confirmed");
  if (mode === "current") return confirmed;
  const proposed = shifts.filter((s) => s.status === "proposed");
  const dropped = new Set(
    proposed
      .filter((p) => p.change === "replace" || p.change === "remove")
      .map((p) => p.replacesId)
      .filter((id): id is string => Boolean(id)),
  );
  return [
    ...confirmed.filter((s) => !dropped.has(s.id)),
    ...proposed.filter((p) => p.change !== "remove"),
  ];
}

// ---------- evaluation ----------

const len = (s: ShiftLite) => s.endMin - s.startMin;

export function evaluateRota(input: RotaInput): RotaEvaluation {
  const { week, staff, timeOff, coverage, budgetCents } = input;
  const shifts = input.shifts;
  const violations: Violation[] = [];
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const name = (id: string) => staffById.get(id)?.name ?? "Someone";
  const dates = weekDates(week);
  const inWeek = shifts.filter((s) => dates.includes(s.date));

  const minutesByStaff: Record<string, number> = {};
  const laborCentsByDay: Record<string, number> = Object.fromEntries(
    dates.map((d) => [d, 0]),
  );
  let laborCents = 0;
  let totalMinutes = 0;
  let openShifts = 0;

  for (const s of inWeek) {
    const minutes = len(s);
    totalMinutes += minutes;
    if (!s.staffId) {
      openShifts++;
      violations.push({
        code: "open_shift",
        severity: "warn",
        message: `Open ${s.role} shift ${dayName(week, s.date)} ${fmtShift(s)} has nobody on it.`,
        shiftIds: [s.id],
        date: s.date,
      });
    } else {
      minutesByStaff[s.staffId] = (minutesByStaff[s.staffId] ?? 0) + minutes;
      const rate = staffById.get(s.staffId)?.hourlyRateCents ?? 0;
      const cost = Math.round((rate * minutes) / 60);
      laborCents += cost;
      laborCentsByDay[s.date] = (laborCentsByDay[s.date] ?? 0) + cost;
    }
    if (minutes > MAX_SHIFT_MIN) {
      violations.push({
        code: "shift_too_long",
        severity: "warn",
        message: `${s.staffId ? name(s.staffId) + "'s" : "A"} ${dayName(week, s.date)} shift is ${(minutes / 60).toFixed(1)}h (over 10h).`,
        staffId: s.staffId ?? undefined,
        shiftIds: [s.id],
        date: s.date,
      });
    } else if (minutes < MIN_SHIFT_MIN) {
      violations.push({
        code: "shift_too_short",
        severity: "warn",
        message: `${dayName(week, s.date)} ${fmtShift(s)} is under 3h.`,
        staffId: s.staffId ?? undefined,
        shiftIds: [s.id],
        date: s.date,
      });
    }
  }

  // Per-person rules.
  const byStaff = new Map<string, ShiftLite[]>();
  for (const s of inWeek) {
    if (!s.staffId) continue;
    const list = byStaff.get(s.staffId) ?? [];
    list.push(s);
    byStaff.set(s.staffId, list);
  }
  const offByStaffDate = new Map(
    timeOff.map((t) => [`${t.staffId}|${t.date}`, t]),
  );

  for (const [staffId, list] of byStaff) {
    const abs = (s: ShiftLite, m: number) =>
      weekdayIndex(week, s.date) * 1440 + m;
    list.sort((a, b) => abs(a, a.startMin) - abs(b, b.startMin));
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      const off = offByStaffDate.get(`${staffId}|${s.date}`);
      if (off) {
        violations.push({
          code: "time_off",
          severity: "error",
          message: `${name(staffId)} is off ${dayName(week, s.date)}${off.reason ? ` (${off.reason})` : ""}.`,
          staffId,
          shiftIds: [s.id],
          date: s.date,
        });
      }
      const next = list[i + 1];
      if (!next) continue;
      const gap = abs(next, next.startMin) - abs(s, s.endMin);
      if (gap < 0) {
        violations.push({
          code: "overlap",
          severity: "error",
          message: `${name(staffId)} is double-booked ${dayName(week, s.date)}.`,
          staffId,
          shiftIds: [s.id, next.id],
          date: next.date,
        });
      } else if (gap < MIN_REST_MIN && next.date !== s.date) {
        violations.push({
          code: "rest_gap",
          severity: "error",
          message: `${name(staffId)} gets ${(gap / 60).toFixed(1)}h rest between ${dayName(week, s.date)} and ${dayName(week, next.date)} (needs 11h).`,
          staffId,
          shiftIds: [s.id, next.id],
          date: next.date,
        });
      }
    }
    const minutes = minutesByStaff[staffId] ?? 0;
    const person = staffById.get(staffId);
    if (person && minutes > person.maxHours * 60) {
      violations.push({
        code: "max_hours",
        severity: "error",
        message: `${person.name} is at ${(minutes / 60).toFixed(1)}h, over their ${person.maxHours}h contract.`,
        staffId,
        shiftIds: list.map((s) => s.id),
      });
    } else if (minutes > OVERTIME_MIN) {
      violations.push({
        code: "overtime",
        severity: "warn",
        message: `${name(staffId)} is at ${(minutes / 60).toFixed(1)}h (overtime past 40h).`,
        staffId,
        shiftIds: list.map((s) => s.id),
      });
    }
  }

  // Coverage, sampled in 30 minute slots.
  let slotsTotal = 0;
  let slotsMet = 0;
  const cells = new Map<string, CoverageCell>();
  for (const date of dates) {
    for (const part of DAY_PARTS) {
      cells.set(`${date}|${part.id}`, { date, part: part.id, needed: 0, have: 0 });
    }
  }
  for (const req of coverage) {
    const date = dates[req.weekday];
    if (!date) continue;
    let worst = Infinity;
    let worstAt = req.startMin;
    for (let t = req.startMin; t < req.endMin; t += 30) {
      const have = inWeek.filter(
        (s) =>
          s.staffId &&
          s.role === req.role &&
          s.date === date &&
          s.startMin <= t &&
          s.endMin >= t + 30,
      ).length;
      slotsTotal++;
      if (have >= req.needed) slotsMet++;
      if (have < worst) {
        worst = have;
        worstAt = t;
      }
      const part = DAY_PARTS.find((p) => t >= p.startMin && t < p.endMin);
      if (part) {
        const cell = cells.get(`${date}|${part.id}`)!;
        cell.needed++;
        if (have >= req.needed) cell.have++;
      }
    }
    if (worst < req.needed) {
      violations.push({
        code: "coverage_gap",
        severity: "warn",
        message: `${dayName(week, date)} ${fmtTime(worstAt)}: ${worst} of ${req.needed} ${req.role}${req.needed > 1 ? "s" : ""} on.`,
        shiftIds: [],
        date,
      });
    }
  }
  if (budgetCents > 0 && laborCents > budgetCents) {
    violations.push({
      code: "over_budget",
      severity: "warn",
      message: `Labor is $${Math.round((laborCents - budgetCents) / 100)} over the $${Math.round(budgetCents / 100)} budget.`,
      shiftIds: [],
    });
  }

  return {
    violations,
    metrics: {
      totalMinutes,
      laborCents,
      budgetCents,
      coveragePct: slotsTotal ? Math.round((slotsMet / slotsTotal) * 100) : 100,
      openShifts,
      minutesByStaff,
      laborCentsByDay,
      coverage: [...cells.values()],
    },
  };
}

export function errorsOf(evaluation: RotaEvaluation): Violation[] {
  return evaluation.violations.filter((v) => v.severity === "error");
}

/** Violations in `after` that are not in `before` (by code + people + shifts). */
export function newViolations(
  before: Violation[],
  after: Violation[],
): Violation[] {
  const key = (v: Violation) =>
    `${v.code}|${v.staffId ?? ""}|${v.date ?? ""}|${[...v.shiftIds].sort().join(",")}`;
  const seen = new Set(before.map(key));
  return after.filter((v) => !seen.has(key(v)));
}

// ---------- cover suggestions ----------

export interface CoverCandidate {
  staffId: string;
  name: string;
  ok: boolean;
  reasons: string[];
  hoursAfter: number;
  costCents: number;
}

/**
 * Rank who could take `shiftId`. Everyone with the shift's role is tried; a
 * candidate is `ok` when assigning them adds no error-level violation.
 */
export function suggestCover(
  input: RotaInput,
  shiftId: string,
): CoverCandidate[] {
  const shift = input.shifts.find((s) => s.id === shiftId);
  if (!shift) return [];
  const baseline = evaluateRota({
    ...input,
    shifts: input.shifts.filter((s) => s.id !== shiftId),
  });
  return input.staff
    .filter((p) => p.role === shift.role && p.id !== shift.staffId)
    .map((p) => {
      const trial = evaluateRota({
        ...input,
        shifts: [
          ...input.shifts.filter((s) => s.id !== shiftId),
          { ...shift, staffId: p.id },
        ],
      });
      const added = newViolations(baseline.violations, trial.violations).filter(
        (v) => v.staffId === p.id,
      );
      const minutes = trial.metrics.minutesByStaff[p.id] ?? 0;
      return {
        staffId: p.id,
        name: p.name,
        ok: !added.some((v) => v.severity === "error"),
        reasons: added.map((v) => v.message),
        hoursAfter: Math.round((minutes / 60) * 10) / 10,
        costCents: Math.round((p.hourlyRateCents * len(shift)) / 60),
      };
    })
    .sort(
      (a, b) =>
        Number(b.ok) - Number(a.ok) ||
        a.reasons.length - b.reasons.length ||
        a.hoursAfter - b.hoursAfter ||
        a.costCents - b.costCents,
    );
}
