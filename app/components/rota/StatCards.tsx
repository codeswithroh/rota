import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconCoin,
  IconUsersGroup,
} from "@tabler/icons-react";

import type { RotaEvaluation } from "@shared/rota-rules";
import { weekDates } from "@shared/rota-rules";

import { hours, money } from "./use-rota";

export function Ring({
  value,
  size = 64,
  stroke = 7,
  color,
  track = "hsl(var(--muted))",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          style={{ transition: "stroke-dasharray 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {children}
      </div>
    </div>
  );
}

function Delta({ before, after, format, goodWhen }: { before: number; after: number; format: (n: number) => string; goodWhen: "up" | "down" }) {
  const diff = after - before;
  if (!diff) return null;
  const good = goodWhen === "up" ? diff > 0 : diff < 0;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${good ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
      {diff > 0 ? "+" : "−"}
      {format(Math.abs(diff))}
    </span>
  );
}

export function StatCards({
  week,
  current,
  proposed,
}: {
  week: string;
  current: RotaEvaluation;
  proposed: RotaEvaluation | null;
}) {
  const view = proposed ?? current;
  const m = view.metrics;
  const errors = view.violations.filter((v) => v.severity === "error").length;
  const warns = view.violations.filter((v) => v.severity === "warn").length;
  const budgetUse = m.budgetCents ? m.laborCents / m.budgetCents : 0;
  const over = m.laborCents > m.budgetCents;
  const dates = weekDates(week);
  const maxDay = Math.max(1, ...dates.map((d) => m.laborCentsByDay[d] ?? 0));

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-[#4f46e5] p-4 text-white shadow-sm lg:col-span-1">
        <Ring value={budgetUse} color={over ? "#fca5a5" : "#ffffff"} track="rgba(255,255,255,0.2)" size={68}>
          <span className="text-white">{Math.round(budgetUse * 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/75">
            <IconCoin className="size-3.5" /> Labor vs budget
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{money(m.laborCents)}</span>
            {proposed ? (
              <Delta before={current.metrics.laborCents} after={proposed.metrics.laborCents} format={money} goodWhen="down" />
            ) : null}
          </div>
          <div className="text-xs text-white/75">of {money(m.budgetCents)}</div>
          <div className="mt-2 flex h-6 items-end gap-1" aria-label="Labor per day">
            {dates.map((d) => (
              <div key={d} className="flex-1 rounded-sm bg-white/70" style={{ height: `${Math.max(8, ((m.laborCentsByDay[d] ?? 0) / maxDay) * 100)}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <Ring value={m.coveragePct / 100} color={m.coveragePct >= 95 ? "#10b981" : m.coveragePct >= 85 ? "#f59e0b" : "#ef4444"}>
          {m.coveragePct}%
        </Ring>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconUsersGroup className="size-3.5" /> Coverage
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
            of required slots
            {proposed ? (
              <Delta before={current.metrics.coveragePct} after={proposed.metrics.coveragePct} format={(n) => `${n}%`} goodWhen="up" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300">
          <IconClock className="size-6" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Scheduled</div>
          <div className="text-2xl font-semibold tabular-nums">{hours(m.totalMinutes)}</div>
          <div className={`text-xs ${m.openShifts ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {m.openShifts ? `${m.openShifts} open shift${m.openShifts > 1 ? "s" : ""}` : "all shifts filled"}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${errors ? "border-red-500/40 bg-red-500/5" : "border-border bg-card"}`}>
        <div className={`flex size-16 shrink-0 items-center justify-center rounded-full ${errors ? "bg-red-500/15 text-red-600" : "bg-emerald-500/10 text-emerald-600"}`}>
          {errors ? <IconAlertTriangle className="size-6" /> : <IconCircleCheck className="size-6" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Rule check</div>
          <div className="text-2xl font-semibold tabular-nums">
            {errors} <span className="text-sm font-normal text-muted-foreground">errors</span>
          </div>
          <div className="text-xs text-muted-foreground">{warns} warnings</div>
        </div>
      </div>
    </div>
  );
}
