import {
  IconArrowRight,
  IconCheck,
  IconMessage,
  IconPlugConnected,
  IconHandClick,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Link } from "react-router";

const TITLE = "Rota: staff scheduling where an agent finds cover and you approve";
const DESCRIPTION =
  "Rota reads your staff's texts, finds cover that doesn't break rest or contract rules, and puts the swap on your week grid for one-tap approval.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
  ];
}

const ACCENT = "#4f46e5";
const C = { barista: "#0ea5e9", kitchen: "#f97316", floor: "#10b981" };

function MiniGrid() {
  const days = ["Thu", "Fri", "Sat", "Sun"];
  const rows: { name: string; color: string; cells: (string | null)[]; ghost?: number; off?: number }[] = [
    { name: "Leo", color: C.barista, cells: [null, "06:30–14:30", "08:00–14:00", null], off: 2 },
    { name: "Priya", color: C.barista, cells: ["07:00–13:00", "07:00–13:00", null, null], ghost: 2 },
    { name: "Elif", color: C.barista, cells: [null, "13:00–21:00", null, "14:00–21:00"] },
    { name: "Tom", color: C.kitchen, cells: ["06:30–14:30", "14:30–21:00", "14:30–21:00", null] },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-indigo-900/10">
      <div className="mb-3 flex items-center gap-3 rounded-xl p-3 text-white" style={{ background: ACCENT }}>
        <IconSparkles className="size-5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="text-[11px] text-white/70">Agent proposal · rule check passed</div>
          <div className="font-semibold">Priya covers Leo on Saturday</div>
        </div>
        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold" style={{ color: ACCENT }}>
          Accept
        </span>
      </div>
      <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1 text-[11px]">
        <span />
        {days.map((d) => (
          <span key={d} className="px-1 font-medium text-slate-500">
            {d}
          </span>
        ))}
        {rows.map((r) => (
          <div key={r.name} className="contents">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="size-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            {r.cells.map((cell, i) => (
              <div
                key={i}
                className={`h-10 rounded-md p-1 ${r.off === i ? "bg-[repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9_5px,#e2e8f0_5px,#e2e8f0_10px)]" : "bg-slate-50"}`}
              >
                {r.ghost === i ? (
                  <div className="h-full animate-pulse rounded border border-dashed border-indigo-500 bg-indigo-500/10 px-1 font-medium tabular-nums text-indigo-700">
                    08:00–14:00
                  </div>
                ) : cell ? (
                  <div
                    className={`h-full rounded border-l-[3px] px-1 font-medium tabular-nums text-slate-700 ${r.off === i ? "opacity-40 line-through" : ""}`}
                    style={{ borderLeftColor: r.color, background: `${r.color}18` }}
                  >
                    {cell}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { time: "06:12", who: "Leo texts", body: "“Can't do Saturday, kid is sick.”", icon: IconMessage },
  { time: "06:12", who: "Agent", body: "Marks Leo off Saturday and tries everyone on the barista team against the rules.", icon: IconSparkles },
  { time: "06:13", who: "Rule check", body: "Priya and Elif fit. Sam would hit 30h on a 24h contract. Maya would be double-booked.", icon: IconCheck },
  { time: "07:05", who: "You", body: "See the swap as a dashed shift on the grid. Tap Accept. Priya and Leo get a text.", icon: IconHandClick },
];

const RULES = [
  ["No double-booking", true],
  ["No shifts on someone's day off", true],
  ["11 hours rest between shifts", true],
  ["Never over contract hours", true],
  ["Coverage per role, per hour", false],
  ["Weekly labor budget", false],
] as const;

export default function LandingRoute() {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
        <span className="flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: ACCENT }}>
          R
        </span>
        <span className="font-semibold">Rota</span>
        <Link to="/dashboard" className="ms-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
        <div>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">For cafés, kitchens and shops with 5–30 staff</span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Someone calls in sick. The swap is waiting on your grid.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Rota reads your staff's texts, finds cover that doesn't break rest or contract rules, and shows it as a dashed shift on your week. You accept with one tap and everyone affected gets a text.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95"
              style={{ background: ACCENT }}
            >
              Open the dashboard <IconArrowRight className="size-4" />
            </Link>
            <a href="#how" className="rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-white">
              How a sick day goes
            </a>
          </div>
        </div>
        <MiniGrid />
      </section>

      <section id="how" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How a sick day goes</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.time + s.who} className="rounded-2xl border border-slate-200 bg-[#f6f7fb] p-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                    <s.icon className="size-4" />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-slate-500">{s.time}</span>
                </div>
                <div className="mt-3 text-sm font-semibold">{s.who}</div>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight">The agent proposes. The rules decide.</h2>
          <p className="mt-2 text-sm text-slate-600">
            Every change goes through the same rule check, whether you drag a shift, the agent suggests a swap, or Claude calls Rota from another app. A plan that breaks a hard rule never reaches your grid.
          </p>
          <ul className="mt-5 space-y-2">
            {RULES.map(([rule, hard]) => (
              <li key={rule} className="flex items-center gap-3 text-sm">
                {hard ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <IconX className="size-3" />
                  </span>
                ) : (
                  <span className="flex size-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">!</span>
                )}
                {rule}
                <span className="ms-auto text-xs text-slate-400">{hard ? "blocks" : "warns"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4">
          {[
            { icon: IconHandClick, title: "Drag shifts like a whiteboard", body: "Move or reassign a shift and see the rule result before you let go. Red means it won't save." },
            { icon: IconSparkles, title: "Or ask", body: "“Who can cover Priya's Friday close?” The agent sees the shift you clicked and answers with a proposal, not a paragraph." },
            { icon: IconPlugConnected, title: "From Claude or ChatGPT", body: "Rota is an MCP server. Check who's on Saturday close without opening the app." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <f.icon className="size-5" />
              </span>
              <div>
                <div className="font-semibold">{f.title}</div>
                <p className="mt-1 text-sm text-slate-600">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl p-8 text-white sm:flex-row sm:items-center" style={{ background: ACCENT }}>
          <div className="flex-1">
            <div className="text-2xl font-semibold">Try it with a demo café</div>
            <p className="mt-1 text-white/80">10 staff, a full week of shifts, and a phone to send yourself a sick-day text.</p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold" style={{ color: ACCENT }}>
            Open the dashboard <IconArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">Built with Agent-Native.</p>
      </section>
    </div>
  );
}
