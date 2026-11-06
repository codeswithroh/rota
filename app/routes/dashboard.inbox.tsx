import { useState } from "react";

import { InboxCard, StaffPhone } from "@/components/rota/Panels";
import { useRotaWeek, useWeekParam } from "@/components/rota/use-rota";
import { Skeleton } from "@/components/ui/skeleton";
import { initials, relTime } from "@/components/rota/use-rota";

export function meta() {
  return [{ title: "Inbox · Rota" }];
}

export default function InboxRoute() {
  const { week } = useWeekParam();
  const { data } = useRotaWeek(week);
  const [phone, setPhone] = useState(false);
  if (!data) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  const name = (id: string | null) => data.staff.find((s) => s.id === id)?.name ?? "Unknown";
  const sent = data.messages.filter((m) => m.direction === "out");
  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <InboxCard messages={data.messages} staff={data.staff} week={week} limit={30} autoHandle={data.autoHandle} onOpenPhone={() => setPhone(true)} />
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Sent by Rota</h2>
          {sent.length ? (
            <ul className="space-y-2">
              {sent.map((m) => (
                <li key={m.id} className="flex gap-2 rounded-xl bg-muted/60 p-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4f46e5] text-[9px] font-semibold text-white">
                    {initials(name(m.staffId))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex text-xs font-medium">
                      To {name(m.staffId)} <span className="ms-auto font-normal text-muted-foreground">{relTime(m.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-snug">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Accepted changes and published weeks are texted from here.</p>
          )}
        </section>
      </div>
      <StaffPhone open={phone} onOpenChange={setPhone} staff={data.staff} />
    </div>
  );
}
