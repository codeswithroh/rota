import { actionErrorMessage, useActionMutation } from "@agent-native/core/client/hooks";
import { toast } from "sonner";

import { Ring } from "@/components/rota/StatCards";
import { hours, initials, money, ROLE_COLORS, useRotaWeek, useWeekParam } from "@/components/rota/use-rota";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function meta() {
  return [{ title: "Team · Rota" }];
}

export default function TeamRoute() {
  const { week } = useWeekParam();
  const { data, derived } = useRotaWeek(week);
  const save = useActionMutation("upsert-staff", {
    onSuccess: (r) => toast.success(`Saved ${r.name}`),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not save."),
  });
  if (!data || !derived) {
    return (
      <div className="mx-auto grid max-w-6xl gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }
  const m = derived.current.metrics;
  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {data.staff.map((p) => {
          const minutes = m.minutesByStaff[p.id] ?? 0;
          const load = minutes / (p.maxHours * 60);
          const off = data.timeOff.filter((t) => t.staffId === p.id).length;
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: p.color ?? ROLE_COLORS[p.role] }}>
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" style={{ background: `${ROLE_COLORS[p.role]}22`, color: ROLE_COLORS[p.role] }}>
                    {p.role}
                  </span>
                </div>
                <Ring value={load} color={load > 1 ? "#ef4444" : (ROLE_COLORS[p.role] ?? "#64748b")} size={56} stroke={6}>
                  {Math.round(load * 100)}%
                </Ring>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/60 py-1.5">
                  <div className="text-sm font-semibold tabular-nums">{hours(minutes)}</div>
                  <div className="text-[10px] text-muted-foreground">this week</div>
                </div>
                <div className="rounded-lg bg-muted/60 py-1.5">
                  <div className="text-sm font-semibold tabular-nums">{money((p.hourlyRateCents * minutes) / 60)}</div>
                  <div className="text-[10px] text-muted-foreground">cost</div>
                </div>
                <div className="rounded-lg bg-muted/60 py-1.5">
                  <div className="text-sm font-semibold tabular-nums">{off}</div>
                  <div className="text-[10px] text-muted-foreground">days off</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">
                  $/hour
                  <Input
                    key={`r${p.hourlyRateCents}`}
                    defaultValue={(p.hourlyRateCents / 100).toFixed(2)}
                    inputMode="decimal"
                    className="mt-0.5 h-8"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && Math.round(v * 100) !== p.hourlyRateCents) save.mutate({ id: p.id, hourlyRate: v });
                    }}
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Max hours
                  <Input
                    key={`h${p.maxHours}`}
                    defaultValue={p.maxHours}
                    inputMode="numeric"
                    className="mt-0.5 h-8"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isInteger(v) && v > 0 && v !== p.maxHours) save.mutate({ id: p.id, maxHours: v });
                    }}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
