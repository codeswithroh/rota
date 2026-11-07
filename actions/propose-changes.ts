import { defineAction, fail } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  loadWeek,
  nowIso,
  resolveWeek,
  scoped,
  tenantOf,
  toMinutes,
  validDate,
} from "../server/lib/rota.js";
import {
  effectiveShifts,
  evaluateRota,
  newViolations,
  ROLES,
  type ShiftLite,
} from "../shared/rota-rules.js";

const change = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("assign"),
    shiftId: z.string().describe("Existing confirmed shift id"),
    staffId: z.string().nullable().describe("New assignee; null = open shift"),
  }),
  z.object({
    type: z.literal("move"),
    shiftId: z.string().describe("Existing confirmed shift id"),
    date: z.string().optional().describe("New date YYYY-MM-DD"),
    start: z.string().optional().describe("New local start HH:MM"),
    end: z.string().optional().describe("New local end HH:MM"),
    staffId: z
      .string()
      .nullable()
      .optional()
      .describe("Optionally reassign at the same time"),
  }),
  z.object({
    type: z.literal("add"),
    staffId: z.string().nullable().describe("Assignee, or null for open"),
    role: z.enum(ROLES),
    date: z.string().describe("YYYY-MM-DD"),
    start: z.string().describe("Local start HH:MM"),
    end: z.string().describe("Local end HH:MM"),
  }),
  z.object({
    type: z.literal("remove"),
    shiftId: z.string().describe("Existing confirmed shift id"),
  }),
]);

export default defineAction({
  description:
    "Propose a set of rota changes for the manager to review. The changes appear on the grid as ghost shifts; nothing is final until decide-proposal accepts. The rule engine checks the result first: if the proposal adds any hard-rule error (double-booking, time off, under 11h rest, over contract hours) it fails with rule_violation (409) and lists them, so fix the plan and retry. Use dryRun to check a plan without saving. One pending proposal per week.",
  schema: z.object({
    week: z.string().describe("Any date in the week, YYYY-MM-DD"),
    title: z
      .string()
      .min(3)
      .max(80)
      .describe('Short label, e.g. "Cover Leo on Thursday"'),
    reason: z
      .string()
      .max(400)
      .optional()
      .describe("One or two sentences on why, shown to the manager"),
    messageId: z
      .string()
      .optional()
      .describe("Staff message this answers, if any"),
    changes: z.array(change).min(1).max(30),
    dryRun: z
      .boolean()
      .optional()
      .describe("Check only; return the rule result without saving"),
  }),
  link: ({ args }) => ({
    url: buildDeepLink({
      view: "rota",
      to: `/dashboard?week=${resolveWeek(args.week)}`,
      params: { week: resolveWeek(args.week) },
    }),
    label: "Review on the rota",
  }),
  run: async (args, ctx) => {
    const t = await tenantOf(ctx);
    const week = resolveWeek(args.week);
    const { input, proposals } = await loadWeek(t, week);
    if (proposals.length && !args.dryRun) {
      fail(
        `"${proposals[0]?.title}" is still waiting for review. Ask the manager to accept or reject it first.`,
        { errorCode: "proposal_pending", statusCode: 409 },
      );
    }
    const current = effectiveShifts(input.shifts, "current");
    const byId = new Map(current.map((s) => [s.id, s]));
    const proposalId = crypto.randomUUID();
    const touched = new Set<string>();
    const rows: ShiftLite[] = [];

    for (const c of args.changes) {
      if (c.type === "add") {
        const startMin = toMinutes(c.start, "start");
        const endMin = toMinutes(c.end, "end");
        if (endMin <= startMin)
          fail("end must be after start.", { errorCode: "invalid_range" });
        rows.push({
          id: crypto.randomUUID(),
          staffId: c.staffId,
          role: c.role,
          date: validDate(c.date),
          startMin,
          endMin,
          status: "proposed",
          change: "add",
          proposalId,
        });
        continue;
      }
      const base = byId.get(c.shiftId);
      if (!base)
        fail(`Shift ${c.shiftId} not found in week ${week}.`, {
          errorCode: "not_found",
          statusCode: 404,
        });
      if (touched.has(base.id))
        fail(`Shift ${base.id} is changed twice; merge those changes.`, {
          errorCode: "duplicate_change",
        });
      touched.add(base.id);
      if (c.type === "remove") {
        rows.push({
          ...base,
          id: crypto.randomUUID(),
          status: "proposed",
          change: "remove",
          replacesId: base.id,
          proposalId,
        });
        continue;
      }
      const startMin =
        c.type === "move" && c.start ? toMinutes(c.start, "start") : base.startMin;
      const endMin =
        c.type === "move" && c.end ? toMinutes(c.end, "end") : base.endMin;
      if (endMin <= startMin)
        fail("end must be after start.", { errorCode: "invalid_range" });
      rows.push({
        ...base,
        id: crypto.randomUUID(),
        staffId:
          c.type === "assign"
            ? c.staffId
            : c.staffId === undefined
              ? base.staffId
              : c.staffId,
        date: c.type === "move" && c.date ? validDate(c.date) : base.date,
        startMin,
        endMin,
        status: "proposed",
        change: "replace",
        replacesId: base.id,
        proposalId,
      });
    }

    const staffIds = new Set(input.staff.map((s) => s.id));
    for (const r of rows) {
      if (r.staffId && !staffIds.has(r.staffId))
        fail(`Unknown staffId ${r.staffId}.`, {
          errorCode: "not_found",
          statusCode: 404,
        });
    }

    const before = evaluateRota({ ...input, shifts: current });
    const after = evaluateRota({
      ...input,
      shifts: effectiveShifts([...current, ...rows], "proposed"),
    });
    const added = newViolations(before.violations, after.violations);
    const errors = added.filter((v) => v.severity === "error");
    const fixed = newViolations(after.violations, before.violations);
    const summary = {
      laborBefore: before.metrics.laborCents,
      laborAfter: after.metrics.laborCents,
      coverageBefore: before.metrics.coveragePct,
      coverageAfter: after.metrics.coveragePct,
      errorsBefore: before.violations.filter((v) => v.severity === "error")
        .length,
      errorsAfter: after.violations.filter((v) => v.severity === "error")
        .length,
    };

    if (args.dryRun) {
      return {
        ok: errors.length === 0,
        errors,
        warnings: added.filter((v) => v.severity === "warn"),
        fixed,
        summary,
      };
    }
    if (errors.length) {
      fail(
        `Rejected by the rule check: ${errors.map((v) => v.message).join(" ")}`,
        {
          errorCode: "rule_violation",
          statusCode: 409,
          details: { violations: errors },
        },
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.proposals).values({
        id: proposalId,
        week,
        title: args.title,
        reason: args.reason ?? null,
        messageId: args.messageId ?? null,
        createdAt: nowIso(),
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
      });
      await tx.insert(schema.shifts).values(
        rows.map((r) => ({
          id: r.id,
          staffId: r.staffId,
          role: r.role,
          date: r.date,
          startMin: r.startMin,
          endMin: r.endMin,
          status: "proposed" as const,
          change: r.change ?? null,
          replacesId: r.replacesId ?? null,
          proposalId,
          ownerEmail: t.ownerEmail,
          orgId: t.orgId,
        })),
      );
      if (args.messageId) {
        await tx
          .update(schema.messages)
          .set({ proposalId })
          .where(
            and(
              eq(schema.messages.id, args.messageId),
              scoped(schema.messages, t),
            ),
          );
      }
    });

    return {
      id: proposalId,
      title: args.title,
      changes: rows.length,
      warnings: added.filter((v) => v.severity === "warn"),
      fixed,
      summary,
    };
  },
});
