import { fail } from "@agent-native/core/action";
import { and, desc, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import {
  addDays,
  mondayOf,
  todayLocal,
  type CoverageLite,
  type RotaInput,
  type ShiftLite,
  type StaffLite,
  type TimeOffLite,
} from "../../shared/rota-rules.js";
import { getDb, schema } from "../db/index.js";

export const DEFAULT_BUDGET_CENTS = 600_000;

export interface Tenant {
  ownerEmail: string;
  orgId: string | null;
}

export async function tenantOf(
  ctx: { userEmail?: string | null; orgId?: string | null; automation?: unknown } | undefined,
): Promise<Tenant> {
  const ownerEmail =
    ctx?.userEmail ?? fail("Sign in to use Rota.", { statusCode: 401 });
  if (ctx?.orgId) return { ownerEmail, orgId: ctx.orgId };
  // Background automation runs (agent-native 0.225) arrive without orgId even
  // when the job sets one, so take it from the auto-handle job file.
  if (ctx?.automation) {
    const { autoHandleOrgId } = await import("./auto-handle.js");
    return { ownerEmail, orgId: await autoHandleOrgId(ownerEmail) };
  }
  return { ownerEmail, orgId: null };
}

/** Team scope: the active org's rows, or the manager's own rows without an org. */
export function scoped(
  table: { ownerEmail: AnyPgColumn; orgId: AnyPgColumn },
  t: Tenant,
): SQL {
  return t.orgId
    ? eq(table.orgId, t.orgId)
    : (and(isNull(table.orgId), eq(table.ownerEmail, t.ownerEmail)) as SQL);
}

export function resolveWeek(week?: string | null): string {
  if (week && !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    fail("week must be a date like 2026-11-09.", { errorCode: "invalid_week" });
  }
  return mondayOf(week || todayLocal());
}

/** "07:30" -> 450. Accepts "24:00" as end of day. */
export function toMinutes(value: string, field: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const minutes = m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  if (!m || Number(m[2]) > 59 || minutes > 1440) {
    fail(`${field} must be a 24h time like 07:30.`, {
      errorCode: "invalid_time",
    });
  }
  return minutes;
}

export function validDate(value: string, field = "date"): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${field} must be YYYY-MM-DD.`, { errorCode: "invalid_date" });
  }
  return value;
}

export type ShiftRow = typeof schema.shifts.$inferSelect;

export function toShiftLite(row: ShiftRow): ShiftLite {
  return {
    id: row.id,
    staffId: row.staffId,
    role: row.role,
    date: row.date,
    startMin: row.startMin,
    endMin: row.endMin,
    status: row.status,
    change: row.change,
    replacesId: row.replacesId,
    proposalId: row.proposalId,
  };
}

export async function loadWeek(t: Tenant, week: string) {
  const db = getDb();
  const end = addDays(week, 6);
  const [staffRows, shiftRows, offRows, coverageRows, weekRows, proposalRows] =
    await Promise.all([
      db
        .select()
        .from(schema.staff)
        .where(and(scoped(schema.staff, t), eq(schema.staff.active, true)))
        .orderBy(schema.staff.role, schema.staff.name)
        .limit(100),
      db
        .select()
        .from(schema.shifts)
        .where(
          and(
            scoped(schema.shifts, t),
            gte(schema.shifts.date, week),
            lte(schema.shifts.date, end),
          ),
        )
        .orderBy(schema.shifts.date, schema.shifts.startMin)
        .limit(1000),
      db
        .select()
        .from(schema.timeOff)
        .where(
          and(
            scoped(schema.timeOff, t),
            gte(schema.timeOff.date, week),
            lte(schema.timeOff.date, end),
          ),
        )
        .limit(500),
      db
        .select()
        .from(schema.coverage)
        .where(scoped(schema.coverage, t))
        .limit(200),
      db
        .select()
        .from(schema.weeks)
        .where(and(scoped(schema.weeks, t), eq(schema.weeks.week, week)))
        .limit(1),
      db
        .select()
        .from(schema.proposals)
        .where(
          and(
            scoped(schema.proposals, t),
            eq(schema.proposals.week, week),
            eq(schema.proposals.status, "pending"),
          ),
        )
        .orderBy(desc(schema.proposals.createdAt))
        .limit(5),
    ]);

  const staff: StaffLite[] = staffRows.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    hourlyRateCents: s.hourlyRateCents,
    maxHours: s.maxHours,
    color: s.color,
  }));
  const timeOff: TimeOffLite[] = offRows.map((o) => ({
    id: o.id,
    staffId: o.staffId,
    date: o.date,
    reason: o.reason,
  }));
  const coverage: CoverageLite[] = coverageRows.map((c) => ({
    weekday: c.weekday,
    role: c.role,
    startMin: c.startMin,
    endMin: c.endMin,
    needed: c.needed,
  }));
  const input: RotaInput = {
    week,
    staff,
    shifts: shiftRows.map(toShiftLite),
    timeOff,
    coverage,
    budgetCents: weekRows[0]?.budgetCents ?? DEFAULT_BUDGET_CENTS,
  };
  return {
    input,
    staffRows,
    shiftRows,
    weekRow: weekRows[0] ?? null,
    proposals: proposalRows,
  };
}

export async function recentMessages(t: Tenant, limit = 40) {
  return getDb()
    .select()
    .from(schema.messages)
    .where(scoped(schema.messages, t))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);
}

export async function staffNames(t: Tenant, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await getDb()
    .select({ id: schema.staff.id, name: schema.staff.name })
    .from(schema.staff)
    .where(and(scoped(schema.staff, t), inArray(schema.staff.id, ids)));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export function nowIso() {
  return new Date().toISOString();
}
