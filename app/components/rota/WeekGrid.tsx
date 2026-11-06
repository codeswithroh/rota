import { useActionQuery } from "@agent-native/core/client/hooks";
import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  IconAlertTriangle,
  IconGripVertical,
  IconSparkles,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  dayName,
  effectiveShifts,
  evaluateRota,
  fmtShift,
  newViolations,
  weekDates,
  type RotaEvaluation,
  type RotaInput,
  type ShiftLite,
  type StaffLite,
  type Violation,
} from "@shared/rota-rules";

import { hours, initials, money, ROLE_COLORS, useShiftMutations } from "./use-rota";

const OPEN = "__open__";

interface Props {
  input: RotaInput;
  current: RotaEvaluation;
  selectedId: string | null;
  onSelect: (id: string | null, label?: string) => void;
  queryKey: unknown[];
  locked: boolean;
}

export function WeekGrid({ input, current, selectedId, onSelect, queryKey, locked }: Props) {
  const { week, staff } = input;
  const dates = weekDates(week);
  const { update, remove } = useShiftMutations(queryKey);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [preview, setPreview] = useState<Violation[] | null>(null);

  const byShift = useMemo(() => {
    const map = new Map<string, Violation[]>();
    for (const v of current.violations)
      for (const id of v.shiftIds) map.set(id, [...(map.get(id) ?? []), v]);
    return map;
  }, [current]);

  const replacedIds = new Set(
    input.shifts.filter((s) => s.status === "proposed" && s.replacesId).map((s) => s.replacesId as string),
  );
  const visible = input.shifts.filter((s) => s.status === "confirmed" || s.change !== "remove");
  const off = new Map(input.timeOff.map((t) => [`${t.staffId}|${t.date}`, t]));

  const rows: { key: string; person: StaffLite | null }[] = [
    { key: OPEN, person: null },
    ...staff.map((p) => ({ key: p.id, person: p })),
  ];

  function trial(shift: ShiftLite, staffId: string | null, date: string) {
    const confirmed = effectiveShifts(input.shifts, "current");
    const next = confirmed.map((s) => (s.id === shift.id ? { ...s, staffId, date } : s));
    const after = evaluateRota({ ...input, shifts: next });
    return newViolations(current.violations, after.violations).filter((v) => v.severity === "error");
  }

  function drop(rowKey: string, date: string) {
    const shift = input.shifts.find((s) => s.id === dragId);
    setDragId(null);
    setHover(null);
    setPreview(null);
    if (!shift) return;
    const staffId = rowKey === OPEN ? null : rowKey;
    if (shift.staffId === staffId && shift.date === date) return;
    const person = staff.find((p) => p.id === staffId);
    if (person && person.role !== shift.role) {
      toast.error(`${person.name} isn't on the ${shift.role} team.`);
      return;
    }
    const errors = trial(shift, staffId, date);
    const go = (force?: boolean) => update.mutate({ id: shift.id, staffId, date, force });
    if (errors.length) {
      toast.error(errors[0]!.message, {
        description: errors.length > 1 ? `+${errors.length - 1} more rule${errors.length > 2 ? "s" : ""}` : "Hard rule. Nothing was saved.",
        action: { label: "Place anyway", onClick: () => go(true) },
      });
      return;
    }
    go();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[176px_repeat(7,minmax(104px,1fr))] border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
            <div className="px-3 py-2">Team</div>
            {dates.map((d) => (
              <div key={d} className="border-l border-border px-2 py-2">
                {dayName(week, d)} <span className="tabular-nums opacity-60">{Number(d.slice(8))}</span>
              </div>
            ))}
          </div>
          {rows.map(({ key, person }) => {
            const minutes = person ? current.metrics.minutesByStaff[person.id] ?? 0 : 0;
            const load = person ? minutes / (person.maxHours * 60) : 0;
            const rowShifts = visible.filter((s) => (person ? s.staffId === person.id : !s.staffId));
            if (!person && !rowShifts.length && !dragId) return null;
            return (
              <div key={key} className="grid grid-cols-[176px_repeat(7,minmax(104px,1fr))] border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  {person ? (
                    <>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: person.color ?? ROLE_COLORS[person.role] }}>
                        {initials(person.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{person.name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, load * 100)}%`, background: load > 1 ? "#ef4444" : ROLE_COLORS[person.role] }} />
                          </div>
                          <span className={`text-[10px] tabular-nums ${load > 1 ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                            {Math.round(minutes / 60)}/{person.maxHours}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Open shifts</span>
                  )}
                </div>
                {dates.map((date) => {
                  const cellKey = `${key}|${date}`;
                  const cellOff = person ? off.get(`${person.id}|${date}`) : undefined;
                  const items = rowShifts.filter((s) => s.date === date);
                  return (
                    <div
                      key={date}
                      onDragOver={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        if (hover !== cellKey) {
                          setHover(cellKey);
                          const shift = input.shifts.find((s) => s.id === dragId);
                          const sameRole = !person || !shift || person.role === shift.role;
                          setPreview(shift && sameRole ? trial(shift, person ? person.id : null, date) : null);
                        }
                      }}
                      onDragLeave={() => setHover((h) => (h === cellKey ? null : h))}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(key, date);
                      }}
                      className={`relative min-h-14 space-y-1 border-l border-border p-1 transition-colors ${
                        cellOff ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_12px)]" : ""
                      } ${hover === cellKey ? (preview?.length ? "bg-red-500/10 ring-2 ring-inset ring-red-500" : "bg-indigo-500/10 ring-2 ring-inset ring-indigo-500") : ""}`}
                    >
                      {cellOff ? (
                        <div className="px-1 text-[10px] font-medium text-muted-foreground">Off · {cellOff.reason ?? "unavailable"}</div>
                      ) : null}
                      {hover === cellKey && preview?.length ? (
                        <div className="absolute inset-x-1 bottom-1 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                          {preview[0]!.code.replace("_", " ")}
                        </div>
                      ) : null}
                      {items.map((s) => (
                        <ShiftChip
                          key={s.id}
                          shift={s}
                          week={week}
                          person={person}
                          issues={byShift.get(s.id) ?? []}
                          replaced={replacedIds.has(s.id)}
                          selected={selectedId === s.id}
                          draggable={!locked && s.status === "confirmed" && !replacedIds.has(s.id)}
                          onDragStart={() => setDragId(s.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setHover(null);
                            setPreview(null);
                          }}
                          onSelect={() => onSelect(selectedId === s.id ? null : s.id, `${person?.name ?? "Open"} ${dayName(week, s.date)} ${fmtShift(s)}`)}
                          onClose={() => onSelect(null)}
                          onAssign={(staffId) => update.mutate({ id: s.id, staffId })}
                          onDelete={() => {
                            remove.mutate({ id: s.id });
                            onSelect(null);
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role} className="inline-flex items-center gap-1.5 capitalize">
            <span className="size-2 rounded-full" style={{ background: color }} /> {role}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm border border-dashed border-indigo-500" /> proposed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm ring-2 ring-red-500" /> breaks a rule
        </span>
        <span className="ms-auto">Drag a shift to move or reassign it</span>
      </div>
    </div>
  );
}

function ShiftChip({
  shift,
  week,
  person,
  issues,
  replaced,
  selected,
  draggable,
  onDragStart,
  onDragEnd,
  onSelect,
  onClose,
  onAssign,
  onDelete,
}: {
  shift: ShiftLite;
  week: string;
  person: StaffLite | null;
  issues: Violation[];
  replaced: boolean;
  selected: boolean;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: () => void;
  onClose: () => void;
  onAssign: (staffId: string) => void;
  onDelete: () => void;
}) {
  const color = ROLE_COLORS[shift.role];
  const proposed = shift.status === "proposed";
  const hasError = issues.some((v) => v.severity === "error");
  return (
    <Popover open={selected} onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor asChild>
        <button
          type="button"
          draggable={draggable}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", shift.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onClick={onSelect}
          className={`group flex w-full items-center gap-1 rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition ${
            proposed ? "border border-dashed border-indigo-500 bg-indigo-500/10 motion-safe:animate-pulse" : ""
          } ${replaced ? "opacity-40 line-through" : ""} ${hasError ? "ring-2 ring-red-500" : ""} ${
            selected ? "ring-2 ring-indigo-500" : ""
          } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ borderLeftColor: color, background: proposed ? undefined : `${color}14` }}
        >
          {draggable ? <IconGripVertical className="size-3 shrink-0 opacity-0 group-hover:opacity-40" /> : null}
          <span className="min-w-0 flex-1">
            <span className="block whitespace-nowrap font-medium tabular-nums">{fmtShift(shift)}</span>
            <span className="block truncate capitalize text-muted-foreground">
              {proposed ? (shift.change === "add" ? "+ new" : "proposed") : shift.role}
            </span>
          </span>
          {hasError ? <IconAlertTriangle className="size-3 shrink-0 text-red-600" /> : null}
        </button>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-72 p-0">
        {selected ? (
          <ShiftDetails shift={shift} week={week} person={person} issues={issues} onAssign={onAssign} onDelete={onDelete} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ShiftDetails({
  shift,
  week,
  person,
  issues,
  onAssign,
  onDelete,
}: {
  shift: ShiftLite;
  week: string;
  person: StaffLite | null;
  issues: Violation[];
  onAssign: (staffId: string) => void;
  onDelete: () => void;
}) {
  const confirmed = shift.status === "confirmed";
  const cover = useActionQuery("suggest-cover", { shiftId: shift.id }, { enabled: confirmed });
  const label = `${person?.name ?? "Open"} · ${dayName(week, shift.date)} ${fmtShift(shift)}`;
  return (
    <div className="text-sm">
      <div className="border-b border-border p-3">
        <div className="font-medium">{label}</div>
        <div className="text-xs capitalize text-muted-foreground">
          {shift.role} · {hours(shift.endMin - shift.startMin)}
        </div>
        {issues.length ? (
          <ul className="mt-2 space-y-1">
            {issues.map((v, i) => (
              <li key={i} className={`rounded-md px-2 py-1 text-xs ${v.severity === "error" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                {v.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {confirmed ? (
        <div className="p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Who can take it</div>
          {cover.isPending ? (
            <div className="space-y-1.5">
              <Skeleton className="h-7" />
              <Skeleton className="h-7" />
            </div>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {(cover.data?.candidates ?? []).slice(0, 5).map((c) => (
                <li key={c.staffId} className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-xs" title={c.reasons.join(" ")}>
                    {c.name} <span className="text-muted-foreground">→ {c.hoursAfter}h · {money(c.costCents)}</span>
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={!c.ok} onClick={() => onAssign(c.staffId)}>
                    <IconUserPlus className="size-3.5" /> Assign
                  </Button>
                </li>
              ))}
              {cover.data && !cover.data.candidates.length ? (
                <li className="text-xs text-muted-foreground">Nobody else has this role.</li>
              ) : null}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 bg-[#4f46e5] text-white hover:bg-[#4338ca]"
              onClick={() =>
                sendToAgentChat({
                  message: `Find cover for ${label} and propose it.`,
                  context: `shiftId: ${shift.id}; week: ${week}`,
                  submit: true,
                })
              }
            >
              <IconSparkles className="size-4" /> Ask agent
            </Button>
            <Button size="sm" variant="outline" className="h-8" aria-label="Delete shift" onClick={onDelete}>
              <IconTrash className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 text-xs text-muted-foreground">Proposed change. Accept or reject it in the banner above the grid.</div>
      )}
    </div>
  );
}

export function WeekGridSkeleton() {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-11 rounded-md" />
      ))}
    </div>
  );
}
