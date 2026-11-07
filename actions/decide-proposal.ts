import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import {
  loadWeek,
  nowIso,
  scoped,
  tenantOf,
} from "../server/lib/rota.js";
import {
  dayName,
  effectiveShifts,
  evaluateRota,
  fmtShift,
  newViolations,
} from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Accept or reject a pending proposal. Accepting re-runs the rule check against the current rota (it fails with rule_violation if something changed since), makes the ghost shifts real, marks the linked staff message handled, and texts everyone whose shifts changed. Only call accept when the manager has said so.",
  schema: z.object({
    id: z.string().describe("Proposal id"),
    decision: z.enum(["accept", "reject"]),
  }),
  run: async ({ id, decision }, ctx) => {
    const t = await tenantOf(ctx);
    const db = getDb();
    const [proposal] = await db
      .select()
      .from(schema.proposals)
      .where(and(eq(schema.proposals.id, id), scoped(schema.proposals, t)))
      .limit(1);
    if (!proposal || proposal.status !== "pending") {
      fail("No pending proposal with that id.", {
        errorCode: "not_found",
        statusCode: 404,
      });
    }

    if (decision === "reject") {
      await db.transaction(async (tx) => {
        await tx
          .delete(schema.shifts)
          .where(
            and(eq(schema.shifts.proposalId, id), scoped(schema.shifts, t)),
          );
        await tx
          .update(schema.proposals)
          .set({ status: "rejected", decidedAt: nowIso() })
          .where(eq(schema.proposals.id, id));
      });
      return { id, status: "rejected" as const };
    }

    const { input } = await loadWeek(t, proposal.week);
    const mine = input.shifts.filter((s) => s.proposalId === id);
    const current = effectiveShifts(input.shifts, "current");
    const before = evaluateRota({ ...input, shifts: current });
    const after = evaluateRota({
      ...input,
      shifts: effectiveShifts([...current, ...mine], "proposed"),
    });
    const errors = newViolations(before.violations, after.violations).filter(
      (v) => v.severity === "error",
    );
    if (errors.length) {
      fail(
        `The rota changed since this was proposed: ${errors.map((v) => v.message).join(" ")}`,
        {
          errorCode: "rule_violation",
          statusCode: 409,
          details: { violations: errors },
        },
      );
    }

    const originals = new Map(current.map((s) => [s.id, s]));
    const notes = new Map<string, string[]>();
    const note = (staffId: string | null, text: string) => {
      if (!staffId) return;
      notes.set(staffId, [...(notes.get(staffId) ?? []), text]);
    };
    const label = (s: { date: string; startMin: number; endMin: number }) =>
      `${dayName(proposal.week, s.date)} ${fmtShift(s)}`;
    for (const p of mine) {
      const old = p.replacesId ? originals.get(p.replacesId) : undefined;
      if (p.change === "add") note(p.staffId, `you're on ${label(p)}`);
      if (p.change === "remove" && old)
        note(old.staffId, `${label(old)} is cancelled`);
      if (p.change === "replace" && old) {
        if (old.staffId !== p.staffId) {
          note(old.staffId, `you're off ${label(old)}`);
          note(p.staffId, `you're on ${label(p)}`);
        } else {
          note(p.staffId, `${label(old)} is now ${label(p)}`);
        }
      }
    }

    const now = nowIso();
    await db.transaction(async (tx) => {
      const dropIds = mine
        .filter((p) => p.change !== "add" && p.replacesId)
        .map((p) => p.replacesId as string);
      if (dropIds.length) {
        await tx
          .delete(schema.shifts)
          .where(and(inArray(schema.shifts.id, dropIds), scoped(schema.shifts, t)));
      }
      const removeRows = mine.filter((p) => p.change === "remove").map((p) => p.id);
      if (removeRows.length) {
        await tx
          .delete(schema.shifts)
          .where(and(inArray(schema.shifts.id, removeRows), scoped(schema.shifts, t)));
      }
      await tx
        .update(schema.shifts)
        .set({ status: "confirmed", change: null, replacesId: null, proposalId: null })
        .where(and(eq(schema.shifts.proposalId, id), scoped(schema.shifts, t)));
      await tx
        .update(schema.proposals)
        .set({ status: "accepted", decidedAt: now })
        .where(eq(schema.proposals.id, id));
      if (proposal.messageId) {
        await tx
          .update(schema.messages)
          .set({ status: "handled" })
          .where(
            and(
              eq(schema.messages.id, proposal.messageId),
              scoped(schema.messages, t),
            ),
          );
      }
      const outbound = [...notes].map(([staffId, lines]) => ({
        id: crypto.randomUUID(),
        staffId,
        direction: "out" as const,
        body: `Rota update: ${lines.join("; ")}.`,
        status: "handled" as const,
        proposalId: id,
        createdAt: now,
        ownerEmail: t.ownerEmail,
        orgId: t.orgId,
      }));
      if (outbound.length) await tx.insert(schema.messages).values(outbound);
    });

    return { id, status: "accepted" as const, notified: notes.size };
  },
});
