import { actionErrorMessage, useActionMutation } from "@agent-native/core/client/hooks";
import { toast } from "sonner";

import { ROLE_COLORS, useRotaWeek, useWeekParam } from "@/components/rota/use-rota";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtTime, MAX_SHIFT_MIN, MIN_REST_MIN, MIN_SHIFT_MIN } from "@shared/rota-rules";

export function meta() {
  return [{ title: "Rules · Rota" }];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HARD = [
  ["No double-booking", "One person, one shift at a time"],
  ["Time off is respected", "No shifts on a day someone can't work"],
  [`${MIN_REST_MIN / 60}h rest`, "Between the end of one shift and the next"],
  ["Contract hours", "Never over each person's max per week"],
];
const SOFT = [
  ["Coverage", "Required people per role, below"],
  ["Budget", "Weekly labor spend"],
  [`${MIN_SHIFT_MIN / 60}–${MAX_SHIFT_MIN / 60}h shifts`, "Shorter or longer gets flagged"],
  ["Overtime", "Over 40h a week"],
];

export default function RulesRoute() {
  const { week } = useWeekParam();
  const { data } = useRotaWeek(week);
  const budget = useActionMutation("set-budget", {
    onSuccess: (r) => toast.success(`Budget set to $${Math.round(r.budgetCents / 100)}`),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not save."),
  });
  if (!data) return <Skeleton className="m-6 h-96 rounded-2xl" />;
  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Hard rules</h2>
            <p className="mb-3 text-xs text-muted-foreground">Block saves and agent proposals.</p>
            <ul className="space-y-2">
              {HARD.map(([a, b]) => (
                <li key={a} className="flex gap-2 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />
                  <span>
                    <span className="font-medium">{a}</span>
                    <span className="block text-xs text-muted-foreground">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Warnings</h2>
            <ul className="mt-3 space-y-2">
              {SOFT.map(([a, b]) => (
                <li key={a} className="flex gap-2 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <span className="font-medium">{a}</span>
                    <span className="block text-xs text-muted-foreground">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
            <label className="mt-4 block text-xs text-muted-foreground">
              Labor budget this week ($)
              <Input
                key={data.budgetCents}
                defaultValue={Math.round(data.budgetCents / 100)}
                inputMode="numeric"
                className="mt-1 h-9"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v * 100 !== data.budgetCents) budget.mutate({ week, budgetDollars: v });
                }}
              />
            </label>
          </section>
        </div>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Coverage needed</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Day</th>
                  <th className="px-4 py-2 text-left font-medium">Role</th>
                  <th className="px-4 py-2 text-left font-medium">Window</th>
                  <th className="px-4 py-2 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody>
                {[...data.coverage]
                  .sort((a, b) => a.weekday - b.weekday || a.role.localeCompare(b.role) || a.startMin - b.startMin)
                  .map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2">{DAYS[c.weekday]}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{ background: `${ROLE_COLORS[c.role]}22`, color: ROLE_COLORS[c.role] }}>
                          {c.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {fmtTime(c.startMin)}–{fmtTime(c.endMin)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{c.needed}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
