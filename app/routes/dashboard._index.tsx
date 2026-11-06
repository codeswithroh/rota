import {
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDeviceMobile,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { CoverageHeatmap, InboxCard, IssuesCard, ProposalBanner, StaffPhone } from "@/components/rota/Panels";
import { StatCards } from "@/components/rota/StatCards";
import { useRotaWeek, useWeekParam } from "@/components/rota/use-rota";
import { WeekGrid, WeekGridSkeleton } from "@/components/rota/WeekGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, dayName, errorsOf, fmtShift } from "@shared/rota-rules";

export function meta() {
  return [{ title: "Schedule · Rota" }];
}

function weekLabel(week: string) {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return `${fmt(week)} – ${fmt(addDays(week, 6))}`;
}

export default function ScheduleRoute() {
  const { week, shiftId, setWeek, selectShift } = useWeekParam();
  const { query, data, derived, queryKey } = useRotaWeek(week);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const seed = useActionMutation("seed-demo", {
    onSuccess: (r) => toast.success(`Loaded ${r.staff} staff and ${r.shifts} shifts.`),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not load demo data."),
  });
  const publish = useActionMutation("publish-week", {
    onSuccess: (r) => toast.success(`Published. Texted ${r.notified} staff their shifts.`),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not publish."),
  });
  const copy = useActionMutation("copy-week", {
    onSuccess: (r) => toast.success(`Copied ${r.copied} shifts.`),
    onError: (e) => toast.error(actionErrorMessage(e) ?? "Could not copy last week."),
  });

  const loading = query.isPending || !derived;
  const empty = data && !data.staff.length;
  const errors = derived ? errorsOf(derived.current).length : 0;
  const proposalChanges = data ? data.shifts.filter((s) => s.status === "proposed").length : 0;

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-4 sm:p-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}>
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold tabular-nums">{weekLabel(week)}</span>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}>
              <IconChevronRight className="size-4" />
            </Button>
          </div>
          {data ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${data.publishedAt ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
              {data.publishedAt ? "Published" : "Draft"}
            </span>
          ) : null}
          <div className="ms-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => setPhoneOpen(true)} disabled={!data?.staff.length}>
              <IconDeviceMobile className="size-4" /> Staff phone
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!data?.staff.length}
              onClick={() =>
                sendToAgentChat({
                  message: "Check this week's rota. Fix open shifts and anything over budget with one proposal.",
                  context: `week: ${week}`,
                  submit: true,
                })
              }
            >
              <IconSparkles className="size-4" /> Tidy up week
            </Button>
            <Button
              size="sm"
              className="h-9 bg-[#4f46e5] text-white hover:bg-[#4338ca]"
              disabled={!data?.staff.length || publish.isPending || Boolean(data?.proposal) || errors > 0}
              title={errors ? "Fix rule errors before publishing" : data?.proposal ? "Review the proposal first" : undefined}
              onClick={() => publish.mutate({ week })}
            >
              <IconSend className="size-4" /> {data?.publishedAt ? "Re-publish" : "Publish week"}
            </Button>
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <WeekGridSkeleton />
          </>
        ) : query.isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-sm">
            Could not load this week. {actionErrorMessage(query.error)}
            <Button variant="outline" size="sm" className="ms-3" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="text-lg font-semibold">No team yet</div>
            <p className="max-w-sm text-sm text-muted-foreground">Load a demo café with 10 staff, opening hours and a week of shifts, then try a sick-day text.</p>
            <Button className="bg-[#4f46e5] text-white hover:bg-[#4338ca]" disabled={seed.isPending} onClick={() => seed.mutate({ week })}>
              {seed.isPending ? "Loading…" : "Load demo café"}
            </Button>
          </div>
        ) : data && derived ? (
          <>
            <StatCards week={week} current={derived.current} proposed={derived.proposed} />
            {data.proposal && derived.proposed ? (
              <ProposalBanner proposal={data.proposal} current={derived.current} proposed={derived.proposed} changes={proposalChanges} />
            ) : null}
            {!data.shifts.length ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-sm">
                Nothing scheduled this week.
                <Button size="sm" variant="outline" disabled={copy.isPending} onClick={() => copy.mutate({ from: addDays(week, -7), to: week })}>
                  Copy last week
                </Button>
              </div>
            ) : null}
            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
              <WeekGrid
                input={derived.input}
                current={derived.current}
                selectedId={shiftId}
                onSelect={selectShift}
                queryKey={queryKey}
                locked={Boolean(data.proposal)}
              />
              <aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:flex 2xl:flex-col">
                <InboxCard messages={data.messages} staff={data.staff} week={week} autoHandle={data.autoHandle} onOpenPhone={() => setPhoneOpen(true)} />
                <IssuesCard
                  violations={(derived.proposed ?? derived.current).violations}
                  onPick={(id) => {
                    const s = data.shifts.find((x) => x.id === id);
                    selectShift(id, s ? `${dayName(week, s.date)} ${fmtShift(s)}` : undefined);
                  }}
                />
                <CoverageHeatmap week={week} evaluation={derived.proposed ?? derived.current} />
              </aside>
            </div>
          </>
        ) : null}
      </div>
      {data ? <StaffPhone open={phoneOpen} onOpenChange={setPhoneOpen} staff={data.staff} /> : null}
    </div>
  );
}
