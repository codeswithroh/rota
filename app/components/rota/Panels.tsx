import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import {
  IconArrowRight,
  IconCheck,
  IconDeviceMobile,
  IconInbox,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DAY_PARTS,
  dayName,
  weekDates,
  type RotaEvaluation,
  type StaffLite,
  type Violation,
} from "@shared/rota-rules";

import { initials, money, relTime, ROLE_COLORS, type WeekData } from "./use-rota";

export function ProposalBanner({
  proposal,
  current,
  proposed,
  changes,
}: {
  proposal: NonNullable<WeekData["proposal"]>;
  current: RotaEvaluation;
  proposed: RotaEvaluation;
  changes: number;
}) {
  const decide = useActionMutation("decide-proposal", {
    onSuccess: (r) =>
      toast.success(
        r.status === "accepted"
          ? `Accepted. Texted ${"notified" in r ? r.notified : 0} staff.`
          : "Proposal rejected.",
      ),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not save that decision."),
  });
  const errs = (e: RotaEvaluation) => e.violations.filter((v) => v.severity === "error").length;
  const stat = (label: string, a: string, b: string, good: boolean | null) => (
    <div className="rounded-lg bg-white/10 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-white/60">{label}</div>
      <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
        {a} <IconArrowRight className="size-3 opacity-60" />
        <span className={good === null ? "" : good ? "text-emerald-300" : "text-red-300"}>{b}</span>
      </div>
    </div>
  );
  const lb = current.metrics.laborCents;
  const la = proposed.metrics.laborCents;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[#4f46e5] to-[#6d28d9] p-4 text-white shadow-md md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IconSparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-white/70">Agent proposal · {changes} change{changes === 1 ? "" : "s"} · rule check passed</div>
          <div className="truncate font-semibold">{proposal.title}</div>
          {proposal.reason ? <div className="line-clamp-2 text-sm text-white/80">{proposal.reason}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {stat("Errors", String(errs(current)), String(errs(proposed)), errs(proposed) <= errs(current))}
        {stat("Coverage", `${current.metrics.coveragePct}%`, `${proposed.metrics.coveragePct}%`, proposed.metrics.coveragePct >= current.metrics.coveragePct)}
        {stat("Labor", money(lb), money(la), la === lb ? null : la < lb)}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, decision: "reject" })}>
          <IconX className="size-4" /> Reject
        </Button>
        <Button className="bg-white text-[#4f46e5] hover:bg-white/90" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, decision: "accept" })}>
          <IconCheck className="size-4" /> Accept & text staff
        </Button>
      </div>
    </div>
  );
}

export function handleWithAgent(m: { id: string; body: string }, who: string, week: string) {
  sendToAgentChat({
    message: `${who} texted: "${m.body}". Sort it out.`,
    context: `messageId: ${m.id}; week: ${week}`,
    submit: true,
  });
}

function AutoHandleToggle({ enabled }: { enabled: boolean }) {
  const toggle = useActionMutation("set-auto-handle", {
    onSuccess: (r) =>
      toast.success(r.enabled ? "New texts now get a proposal automatically." : "Auto-handle is off."),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not change auto-handle."),
  });
  const on = toggle.isPending ? Boolean(toggle.variables?.enabled) : enabled;
  return (
    <label className="flex items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-2 text-xs">
      <IconSparkles className="size-3.5 text-indigo-500" />
      <span className="flex-1">
        <span className="font-medium">Auto-handle texts</span>
        <span className="block text-[11px] text-muted-foreground">Agent drafts a proposal the moment a text arrives</span>
      </span>
      <Switch checked={on} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate({ enabled: v })} />
    </label>
  );
}

export function InboxCard({
  messages,
  staff,
  week,
  limit = 5,
  onOpenPhone,
  autoHandle,
}: {
  messages: WeekData["messages"];
  staff: StaffLite[];
  week: string;
  limit?: number;
  onOpenPhone?: () => void;
  autoHandle?: boolean;
}) {
  const name = (id: string | null) => staff.find((s) => s.id === id)?.name ?? "Unknown";
  const inbound = messages.filter((m) => m.direction === "in");
  const fresh = inbound.filter((m) => m.status === "new");
  const list = [...fresh, ...inbound.filter((m) => m.status !== "new")].slice(0, limit);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <IconInbox className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Staff texts</h2>
        {fresh.length ? (
          <span className="rounded-full bg-[#4f46e5] px-1.5 text-[11px] font-semibold text-white">{fresh.length} new</span>
        ) : null}
        {onOpenPhone ? (
          <Button variant="ghost" size="sm" className="ms-auto h-7 px-2 text-xs" onClick={onOpenPhone}>
            <IconDeviceMobile className="size-3.5" /> Staff phone
          </Button>
        ) : null}
      </header>
      {autoHandle !== undefined ? (
        <div className="mb-3">
          <AutoHandleToggle enabled={autoHandle} />
        </div>
      ) : null}
      {list.length ? (
        <ul className="space-y-2">
          {list.map((m) => {
            const person = staff.find((s) => s.id === m.staffId);
            return (
              <li key={m.id} className={`rounded-xl p-2.5 ${m.status === "new" ? "bg-indigo-500/[0.07]" : "opacity-60"}`}>
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white" style={{ background: person?.color ?? "#64748b" }}>
                    {initials(name(m.staffId))}
                  </span>
                  <span className="truncate text-xs font-medium">{name(m.staffId)}</span>
                  <span className="ms-auto text-[11px] text-muted-foreground">{relTime(m.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-snug">{m.body}</p>
                {m.status === "new" ? (
                  <div className="mt-2 flex items-center gap-2">
                    {m.proposalId ? (
                      <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300">Proposal ready above</span>
                    ) : autoHandle && Date.now() - new Date(m.createdAt).getTime() < 120_000 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
                        <IconSparkles className="size-3.5 motion-safe:animate-spin" /> Agent is on it…
                      </span>
                    ) : (
                      <Button size="sm" className="h-7 bg-[#4f46e5] px-2.5 text-xs text-white hover:bg-[#4338ca]" onClick={() => handleWithAgent(m, name(m.staffId), week)}>
                        <IconSparkles className="size-3.5" /> Handle with agent
                      </Button>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">No texts yet. Sick days and swap requests land here.</p>
      )}
    </section>
  );
}

export function IssuesCard({
  violations,
  onPick,
}: {
  violations: Violation[];
  onPick: (shiftId: string) => void;
}) {
  const sorted = [...violations].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Rule check</h2>
      {sorted.length ? (
        <ul className="space-y-1.5">
          {sorted.slice(0, 8).map((v, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={!v.shiftIds.length}
                onClick={() => v.shiftIds[0] && onPick(v.shiftIds[0])}
                className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-muted disabled:hover:bg-transparent"
              >
                <span className={`mt-0.5 rounded px-1 py-px text-[10px] font-semibold uppercase ${v.severity === "error" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                  {v.severity === "error" ? "error" : "warn"}
                </span>
                <span className="leading-snug">{v.message}</span>
              </button>
            </li>
          ))}
          {sorted.length > 8 ? <li className="px-1.5 text-[11px] text-muted-foreground">+{sorted.length - 8} more</li> : null}
        </ul>
      ) : (
        <p className="py-4 text-center text-xs text-emerald-600">Every rule passes.</p>
      )}
    </section>
  );
}

export function CoverageHeatmap({ week, evaluation }: { week: string; evaluation: RotaEvaluation }) {
  const dates = weekDates(week);
  const cell = (date: string, part: string) => evaluation.metrics.coverage.find((c) => c.date === date && c.part === part);
  const color = (pct: number | null) =>
    pct === null ? "hsl(var(--muted))" : pct >= 1 ? "#10b981" : pct >= 0.75 ? "#fbbf24" : "#ef4444";
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Coverage by shift</h2>
      <div className="grid grid-cols-[52px_repeat(7,1fr)] gap-1 text-[10px] text-muted-foreground">
        <span />
        {dates.map((d) => (
          <span key={d} className="text-center">{dayName(week, d).slice(0, 2)}</span>
        ))}
        {DAY_PARTS.map((p) => (
          <div key={p.id} className="contents">
            <span className="self-center capitalize">{p.id}</span>
            {dates.map((d) => {
              const c = cell(d, p.id);
              const pct = c && c.needed ? c.have / c.needed : null;
              return (
                <span
                  key={d}
                  title={pct === null ? "No requirement" : `${Math.round(pct * 100)}% of slots covered`}
                  className="h-6 rounded"
                  style={{ background: color(pct), opacity: pct === null ? 0.5 : 0.35 + 0.65 * Math.min(1, pct) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

const QUICK = [
  "Can't do Saturday, kid is sick. Really sorry",
  "Any chance I can swap Thursday for Friday?",
  "Happy to pick up extra hours this week",
];

export function StaffPhone({
  open,
  onOpenChange,
  staff,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: StaffLite[];
}) {
  const [staffId, setStaffId] = useState<string>("");
  const [body, setBody] = useState("");
  const send = useActionMutation("receive-message", {
    onSuccess: (r) => {
      toast.success(`Text from ${r.from} arrived`);
      setBody("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not send."),
  });
  const person = staff.find((s) => s.id === staffId);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[340px] max-w-[92vw]">
        <SheetTitle>Staff phone</SheetTitle>
        <SheetDescription>Send a text as one of your staff. It lands in the manager's inbox like a real SMS.</SheetDescription>
        <div className="mt-4 space-y-3">
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger>
              <SelectValue placeholder="Who's texting?" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: ROLE_COLORS[s.role] }} /> {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-2xl bg-muted p-3">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a text…" rows={3} className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setBody(q)} className="rounded-full border border-border px-2.5 py-1 text-left text-xs hover:bg-muted">
                {q}
              </button>
            ))}
          </div>
          <Button className="w-full bg-[#4f46e5] text-white hover:bg-[#4338ca]" disabled={!staffId || !body.trim() || send.isPending} onClick={() => send.mutate({ staffId, body: body.trim() })}>
            Send{person ? ` as ${person.name.split(" ")[0]}` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
