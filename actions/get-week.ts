import { defineAction } from "@agent-native/core/action";
import { buildDeepLink } from "@agent-native/core/server";
import { z } from "zod";

import { readAutoHandle } from "../server/lib/auto-handle.js";
import {
  loadWeek,
  recentMessages,
  resolveWeek,
  tenantOf,
} from "../server/lib/rota.js";
import { effectiveShifts, evaluateRota } from "../shared/rota-rules.js";

export default defineAction({
  description:
    "Read one week of the rota: staff, shifts (confirmed and proposed), time off, coverage rules, budget, pending proposal, staff messages, and the rule check (violations + labor/coverage metrics). Times are local 24h minutes after midnight; dates are YYYY-MM-DD; money is cents.",
  schema: z.object({
    week: z
      .string()
      .optional()
      .describe("Any date in the week, YYYY-MM-DD. Omit for this week."),
  }),
  http: { method: "GET" },
  readOnly: true,
  link: ({ result }) => ({
    url: buildDeepLink({
      view: "rota",
      to: `/dashboard?week=${result.week}`,
      params: { week: result.week },
    }),
    label: "Open the rota",
  }),
  run: async (args, ctx) => {
    const t = tenantOf(ctx);
    const week = resolveWeek(args.week);
    const { input, weekRow, proposals } = await loadWeek(t, week);
    const [messages, autoHandle] = await Promise.all([
      recentMessages(t),
      readAutoHandle(t.ownerEmail).catch(() => false),
    ]);
    const current = evaluateRota({
      ...input,
      shifts: effectiveShifts(input.shifts, "current"),
    });
    const hasProposal = input.shifts.some((s) => s.status === "proposed");
    const proposed = hasProposal
      ? evaluateRota({
          ...input,
          shifts: effectiveShifts(input.shifts, "proposed"),
        })
      : null;
    return {
      week,
      budgetCents: input.budgetCents,
      publishedAt: weekRow?.publishedAt ?? null,
      autoHandle,
      staff: input.staff,
      shifts: input.shifts,
      timeOff: input.timeOff,
      coverage: input.coverage,
      proposal: proposals[0]
        ? {
            id: proposals[0].id,
            title: proposals[0].title,
            reason: proposals[0].reason,
            messageId: proposals[0].messageId,
            createdAt: proposals[0].createdAt,
          }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        staffId: m.staffId,
        direction: m.direction,
        body: m.body,
        status: m.status,
        proposalId: m.proposalId,
        createdAt: m.createdAt,
      })),
      current,
      proposed,
    };
  },
});
