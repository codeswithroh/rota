import {
  IconArrowRight,
  IconBuildingStore,
  IconCalendarOff,
  IconCash,
  IconChecklist,
  IconClockHour4,
  IconFileText,
  IconMessage,
  IconMoon,
  IconPlugConnected,
  IconSend,
  IconSparkles,
  IconUserCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { PaperStack, PhoneTexts, Stamp, StreetScene } from "@/components/landing/Illustrations";

const TITLE = "Rota: the staff rota that finds its own cover";
const DESCRIPTION =
  "Staff text in sick. Rota checks who can cover without breaking rest or contract rules, and puts the swap on your week grid for one tap.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap",
    },
  ];
}

const ACCENT = "#4f46e5";
const CREAM = "#f7efe6";
const DARK = "#221f1d";
const DISPLAY = { fontFamily: "'Bricolage Grotesque', Inter, sans-serif" };
const C = { barista: "#0ea5e9", kitchen: "#f97316", floor: "#10b981" };

function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 style={DISPLAY} className={`text-center text-3xl font-bold tracking-tight sm:text-4xl ${className}`}>
      {children}
    </h2>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full bg-[#c4b5fd] px-3 py-1 text-xs font-semibold text-[#2e1065]">{children}</span>;
}

/* ---------- product previews for the tab section ---------- */

function WeekPreview() {
  const days = ["Thu", "Fri", "Sat", "Sun"];
  const rows: { name: string; color: string; cells: (string | null)[]; ghost?: number; off?: number }[] = [
    { name: "Leo", color: C.barista, cells: [null, "06:30–14:30", "08:00–14:00", null], off: 2 },
    { name: "Priya", color: C.barista, cells: ["07:00–13:00", "07:00–13:00", null, null], ghost: 2 },
    { name: "Elif", color: C.barista, cells: [null, "13:00–21:00", null, "14:00–21:00"] },
    { name: "Tom", color: C.kitchen, cells: ["06:30–14:30", "14:30–21:00", "14:30–21:00", null] },
    { name: "Jules", color: C.floor, cells: ["11:00–15:00", null, "10:00–16:00", "10:00–16:00"] },
  ];
  return (
    <div>
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
      <div className="grid grid-cols-[44px_repeat(4,minmax(0,1fr))] gap-1 text-[11px]">
        <span />
        {days.map((d) => (
          <span key={d} className="px-1 font-medium text-stone-500">
            {d}
          </span>
        ))}
        {rows.map((r) => (
          <div key={r.name} className="contents">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <span className="size-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            {r.cells.map((cell, i) => (
              <div
                key={i}
                className={`h-10 rounded-md p-1 ${r.off === i ? "bg-[repeating-linear-gradient(135deg,#f5f5f4,#f5f5f4_5px,#e7e5e4_5px,#e7e5e4_10px)]" : "bg-stone-50"}`}
              >
                {r.ghost === i ? (
                  <div className="h-full rounded border border-dashed border-indigo-500 bg-indigo-500/10 px-1 font-medium tabular-nums text-indigo-700">
                    <span className="sm:hidden">08:00</span>
                    <span className="hidden sm:inline">08:00–14:00</span>
                  </div>
                ) : cell ? (
                  <div
                    className={`h-full truncate rounded border-l-[3px] px-1 font-medium tabular-nums text-stone-700 ${r.off === i ? "opacity-40 line-through" : ""}`}
                    style={{ borderLeftColor: r.color, background: `${r.color}18` }}
                  >
                    <span className="sm:hidden">{cell.split("–")[0]}</span>
                    <span className="hidden sm:inline">{cell}</span>
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

function TextsPreview() {
  const items = [
    { who: "Leo", c: C.barista, body: "Sorry, can't do Saturday, family thing.", chip: "Proposal ready", tone: "bg-indigo-100 text-indigo-700" },
    { who: "Ana", c: C.kitchen, body: "Can't work Sunday, my kid is sick.", chip: "Agent is on it", tone: "bg-violet-100 text-violet-700" },
    { who: "Noor", c: C.floor, body: "Thanks for sorting the week out!", chip: "Handled", tone: "bg-stone-100 text-stone-600" },
  ];
  return (
    <ul className="space-y-2.5">
      {items.map((m) => (
        <li key={m.who} className="rounded-xl bg-stone-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex size-6 items-center justify-center rounded-full text-[10px] text-white" style={{ background: m.c }}>
              {m.who[0]}
            </span>
            {m.who}
            <span className={`ms-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.tone}`}>{m.chip}</span>
          </div>
          <p className="mt-1.5 text-sm text-stone-700">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  return (
    <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
      <circle cx="18" cy="18" r="15" fill="none" stroke="#e7e5e4" strokeWidth="4" />
      <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${pct * 0.94} 100`} strokeLinecap="round" />
    </svg>
  );
}

function TeamPreview() {
  const people = [
    { n: "Priya Shah", h: "32/40h", pct: 80, c: C.barista },
    { n: "Leo Okafor", h: "22/32h", pct: 69, c: C.barista },
    { n: "Ana Duarte", h: "36/38h", pct: 95, c: C.kitchen },
    { n: "Jules Martin", h: "24/30h", pct: 80, c: C.floor },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {people.map((p) => (
        <div key={p.n} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
          <Ring pct={p.pct} color={p.c} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{p.n}</div>
            <div className="text-xs tabular-nums text-stone-500">{p.h} this week</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const RULES = [
  ["No double-booking", true],
  ["No shifts on a day off", true],
  ["11 hours rest between shifts", true],
  ["Never over contract hours", true],
  ["Coverage per role, per hour", false],
  ["Weekly labor budget", false],
] as const;

function RulesPreview() {
  return (
    <ul className="space-y-2">
      {RULES.map(([rule, hard]) => (
        <li key={rule} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm">
          <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${hard ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
            {hard ? <IconX className="size-3" /> : "!"}
          </span>
          {rule}
          <span className="ms-auto text-xs text-stone-400">{hard ? "blocks" : "warns"}</span>
        </li>
      ))}
    </ul>
  );
}

function PublishPreview() {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
        <IconSend className="size-5 text-emerald-600" />
        <div className="text-sm">
          <div className="font-semibold text-emerald-800">Published · 2–8 Nov</div>
          <div className="text-xs text-emerald-700">Texted 10 staff their shifts</div>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {["Priya: Mon 13:00–21:00, Wed 07:00–13:00, Thu…", "Leo: Mon 07:00–13:00, Tue 13:00–21:00, Fri…", "Tom: Mon 06:30–14:30, Wed 06:30–14:30, Thu…"].map((t) => (
          <li key={t} className="truncate rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS = [
  { key: "week", label: "Week grid", title: "Café Week 45", node: <WeekPreview /> },
  { key: "texts", label: "Staff texts", title: "Inbox", node: <TextsPreview /> },
  { key: "team", label: "Team hours", title: "Team", node: <TeamPreview /> },
  { key: "rules", label: "Rules", title: "Rules", node: <RulesPreview /> },
  { key: "publish", label: "Publish", title: "Publish", node: <PublishPreview /> },
];

function ProductTabs() {
  const [active, setActive] = useState("week");
  const tab = TABS.find((t) => t.key === active) ?? TABS[0]!;
  return (
    <div className="mt-10 grid items-start gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 md:flex-col" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              t.key === active ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-w-0 rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
        <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-stone-200" />
          <span className="size-2.5 rounded-full bg-stone-200" />
          <span className="size-2.5 rounded-full bg-stone-200" />
          <span className="ms-3 text-xs font-medium text-stone-400">{tab.title}</span>
        </div>
        <div className="min-h-[300px] p-4">{tab.node}</div>
      </div>
    </div>
  );
}

/* ---------- content ---------- */

const TILES = [
  { icon: IconMessage, t: "Reads the text", d: "Sick day, swap or offer of extra hours." },
  { icon: IconCalendarOff, t: "Logs time off", d: "Linked to the message it came from." },
  { icon: IconUsers, t: "Ranks cover", d: "Who asked for hours, then fewest hours, then cost." },
  { icon: IconMoon, t: "Checks rest", d: "11 hours between one shift and the next." },
  { icon: IconClockHour4, t: "Checks contracts", d: "Nobody goes past their weekly cap." },
  { icon: IconCash, t: "Watches budget", d: "Shows the labor change before you accept." },
  { icon: IconSparkles, t: "Drafts the swap", d: "A dashed shift on your grid, not a paragraph." },
  { icon: IconSend, t: "Texts the staff", d: "Only after you tap Accept." },
];

const DAY = [
  { time: "06:12", who: "Leo texts", body: "“Can't do Saturday, kid is sick.”", tag: "Inbox" },
  { time: "06:12", who: "The agent", body: "Marks Leo off Saturday and tries the barista team against the rules.", tag: "Time off" },
  { time: "06:13", who: "Rule check", body: "Priya fits. Sam would go over his 24h contract. Maya would be double-booked.", tag: "3 checked" },
  { time: "07:05", who: "You", body: "See Priya's dashed shift on Saturday. Tap Accept. Priya and Leo get a text.", tag: "1 tap" },
];

const SETUP = [
  { icon: IconBuildingStore, t: "Load the demo café", d: "10 staff, 45 shifts and two texts waiting, so you can try it before typing in your own team." },
  { icon: IconUserCheck, t: "Add your team", d: "Name, role, hourly rate and contract hours. That's all the rules need." },
  { icon: IconChecklist, t: "Set coverage and budget", d: "How many baristas from 07:00, how many in the kitchen, what the week can cost." },
  { icon: IconPlugConnected, t: "Ask from Claude or ChatGPT", d: "Rota is also an MCP server. Check who's closing Saturday without opening the app." },
];

const TEXTS = [
  { who: "Leo", c: C.barista, body: "Sorry, can't do Saturday, family thing.", did: "Logged Saturday off and proposed Priya, who'd asked for extra mornings.", chip: "Proposal", tone: "bg-indigo-100 text-indigo-700" },
  { who: "Priya", c: C.barista, body: "If anyone drops a shift this week I'm happy to pick up extra, mornings best.", did: "Put her first in line for morning cover.", chip: "Noted", tone: "bg-sky-100 text-sky-700" },
  { who: "Ana", c: C.kitchen, body: "Can't work Sunday, my kid is sick. Really sorry.", did: "Nobody could take it without going over contract, so it proposed leaving the shift open.", chip: "Open shift", tone: "bg-amber-100 text-amber-700" },
  { who: "Sam", c: C.barista, body: "Can't make Sunday, I've got a fever.", did: "Logged the day off and lined up Leo, who passes every rule.", chip: "Proposal", tone: "bg-indigo-100 text-indigo-700" },
  { who: "Noor", c: C.floor, body: "Thanks for sorting the week out!", did: "Not about the schedule. Marked it handled and stopped.", chip: "Handled", tone: "bg-stone-200 text-stone-600" },
  { who: "Maya", c: C.barista, body: "Can't do my Thursday shift, dentist appointment.", did: "Logged Thursday off. Another proposal was pending, so it waited for you.", chip: "Time off", tone: "bg-emerald-100 text-emerald-700" },
];

export default function LandingRoute() {
  return (
    <div className="min-h-screen overflow-x-hidden text-stone-900" style={{ background: CREAM }}>
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: ACCENT }}>
            R
          </span>
          <span style={DISPLAY} className="text-lg font-bold">
            Rota
          </span>
        </Link>
        <nav className="hidden gap-6 text-sm text-stone-600 md:flex">
          <a href="#product" className="hover:text-stone-900">Product</a>
          <a href="#different" className="hover:text-stone-900">How it decides</a>
          <a href="#sick-day" className="hover:text-stone-900">A sick day</a>
          <a href="#setup" className="hover:text-stone-900">Setup</a>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Link to="/dashboard" className="hidden rounded-full px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white/60 sm:block">
            Sign in
          </Link>
          <Link to="/dashboard" className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800">
            Open the dashboard
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 text-center sm:px-6 lg:pt-16">
        <PaperStack className="pointer-events-none absolute -left-4 top-6 hidden w-56 md:block lg:w-64" />
        <PhoneTexts className="pointer-events-none absolute -right-4 top-2 hidden w-56 md:block lg:w-64" />
        <h1 style={DISPLAY} className="mx-auto max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          The staff rota that finds its own cover.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-stone-600">
          Someone texts in sick. Rota checks who can take the shift without breaking rest or contract rules, and puts the swap on your grid for one tap.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95"
            style={{ background: ACCENT }}
          >
            Open the dashboard <IconArrowRight className="size-4" />
          </Link>
          <a href="#sick-day" className="rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-white">
            See a sick day
          </a>
        </div>
        <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <span className="font-semibold text-stone-500">Made for</span>
          {[
            [IconBuildingStore, "Cafés, kitchens, shops"],
            [IconUsers, "5 to 30 staff"],
            [IconMessage, "Teams who text the manager"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof IconUsers;
            return (
              <span key={label as string} className="flex items-center gap-2 text-stone-700">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#fde3cf] text-[#c2410c]">
                  <I className="size-4" />
                </span>
                {label as string}
              </span>
            );
          })}
        </div>
      </section>

      {/* product tabs */}
      <section id="product" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <H2>One page for the whole week.</H2>
        <p className="mx-auto mt-3 max-w-xl text-center text-stone-600">Shifts, texts, hours and rules sit together, so a change in one shows up in the others.</p>
        <ProductTabs />
      </section>

      {/* agent tiles */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h3 style={DISPLAY} className="text-center text-xl font-bold">What the agent does with a text</h3>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((f) => (
            <div key={f.t} className="flex gap-3 rounded-xl bg-white/70 p-3.5 ring-1 ring-stone-200/70">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ede9fe] text-[#6d28d9]">
                <f.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{f.t}</div>
                <p className="mt-0.5 text-xs leading-snug text-stone-500">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-12 text-center text-sm font-semibold text-stone-600">Every change passes the same four hard rules</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-stone-800">
          {["No double-booking", "Days off respected", "11h rest", "Contract hours"].map((r) => (
            <span key={r} style={DISPLAY} className="text-lg font-bold tracking-tight opacity-80">
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* dark section */}
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-16 w-full sm:h-24" aria-hidden>
        <path d="M0 120 Q720 -40 1440 120 Z" fill={DARK} />
      </svg>
      <section id="different" className="text-white" style={{ background: DARK }}>
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6">
          <H2>So, what makes Rota different?</H2>

          <div className="mt-14 text-center">
            <Pill>Text in, proposal out</Pill>
            <h3 style={DISPLAY} className="mt-3 text-2xl font-bold">
              It reads the text and does the legwork.
            </h3>
          </div>
          <div className="relative mx-auto mt-10 max-w-xl">
            <div className="absolute -left-32 top-16 hidden w-40 -rotate-12 rounded-xl bg-white p-3 text-stone-800 shadow-xl lg:block">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Sat 7</div>
              <div className="mt-1 rounded bg-[repeating-linear-gradient(135deg,#f5f5f4,#f5f5f4_5px,#e7e5e4_5px,#e7e5e4_10px)] px-2 py-1.5 text-xs font-medium">Leo · Off, family</div>
            </div>
            <div className="absolute -right-28 top-40 hidden w-32 rotate-12 rounded-xl bg-white p-3 text-stone-800 shadow-xl lg:block">
              <div className="flex items-center gap-2">
                <Ring pct={80} color={C.barista} />
                <div className="text-xs">
                  <div className="font-semibold">Priya</div>
                  <div className="tabular-nums text-stone-500">32/40h</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-stone-800 shadow-2xl">
              <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5 text-sm">
                <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: C.barista }}>
                  L
                </span>
                Leo: Sorry, can't do Saturday, family thing.
              </div>
              <div className="mt-4 space-y-2 px-1 text-sm leading-relaxed">
                <p>I've proposed Priya Shah for Leo's Saturday shift (08:00–14:00). It's on the grid for you to review. I haven't accepted it.</p>
                <ul className="space-y-1 text-stone-600">
                  <li>
                    <b className="text-stone-800">Why Priya:</b> she asked for extra mornings and lands on 32 of her 40 hours.
                  </li>
                  <li>
                    <b className="text-stone-800">Ruled out:</b> Elif would hit her 30h cap. Sam and Maya fail the rule check.
                  </li>
                  <li>
                    <b className="text-stone-800">Cost:</b> +$3, still under the $5,200 budget.
                  </li>
                </ul>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-md text-center text-sm text-white/60">
              That's the agent's real reply from the demo café, trimmed. With auto-handle on it runs the moment the text arrives, no chat open.
            </p>
            <div className="mt-5 text-center">
              <Link to="/dashboard" className="inline-flex rounded-full border border-white/25 px-5 py-2 text-sm font-semibold hover:bg-white/10">
                Try it on the demo café
              </Link>
            </div>
          </div>

          <blockquote style={DISPLAY} className="mx-auto mt-24 max-w-2xl text-center text-2xl font-semibold leading-snug sm:text-3xl">
            “The agent can suggest. Only you can accept.”
          </blockquote>
          <p className="mt-3 text-center text-sm text-white/50">How every change in Rota works, whether it starts from a drag, a text or Claude.</p>

          <div className="mt-24 text-center">
            <h3 style={DISPLAY} className="text-2xl font-bold">
              A schedule that checks itself.
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">One rule engine judges the grid, the server actions and the agent. A plan that breaks a hard rule never reaches your week.</p>
          </div>
          <div className="mt-8 grid gap-4 rounded-2xl bg-[#34302d] p-4 md:grid-cols-[1fr_1.2fr] md:p-6">
            <div className="flex flex-col items-start justify-center p-2">
              <Pill>Hard rules</Pill>
              <div style={DISPLAY} className="mt-3 text-xl font-bold">
                Errors block. Warnings inform.
              </div>
              <p className="mt-2 text-sm text-white/60">Double-booking, days off, rest and contract hours stop a change. Coverage gaps, budget and odd shift lengths show up in the rule check.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-stone-900">
              {[
                ["11h", "minimum rest", "bg-[#f9d8e4]"],
                ["0", "double-bookings", "bg-[#fde3cf]"],
                ["40h", "Priya's contract cap", "bg-[#d6f2e6]"],
                ["$5,200", "weekly budget", "bg-[#dbeafe]"],
              ].map(([n, l, bg]) => (
                <div key={l} className={`rounded-xl p-4 ${bg}`}>
                  <div style={DISPLAY} className="text-3xl font-extrabold tabular-nums">
                    {n}
                  </div>
                  <div className="mt-1 text-xs font-medium text-stone-600">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#34302d] p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/40">Drag and drop</div>
              <div style={DISPLAY} className="mt-1 text-lg font-bold">
                See red before you let go
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#4c1d1d] p-3 text-sm text-red-100">
                <span className="mt-0.5 size-2 shrink-0 rounded-full bg-red-400" />
                <div className="flex-1">Leo Okafor gets 9.5h rest between Tue and Wed (needs 11h). Hard rule. Nothing was saved.</div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-900">Place anyway</span>
              </div>
            </div>
            <div className="rounded-2xl bg-[#34302d] p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/40">Publish</div>
              <div style={DISPLAY} className="mt-1 text-lg font-bold">
                One tap, everyone gets their week
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {["To Priya: you're on Sat 08:00–14:00.", "To Leo: you're off Sat 08:00–14:00.", "Published. Texted 10 staff their shifts."].map((t, i) => (
                  <li key={t} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <IconSend className={`size-4 shrink-0 ${i === 2 ? "text-emerald-400" : "text-white/40"}`} />
                    <span className="truncate">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-16 w-full sm:h-24" aria-hidden>
        <path d="M0 0 Q720 160 1440 0 Z" fill={DARK} />
      </svg>

      {/* a sick day */}
      <section id="sick-day" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 style={DISPLAY} className="text-3xl font-bold tracking-tight sm:text-4xl">
          A sick day, minute by minute.
        </h2>
        <ul className="mt-8 divide-y divide-stone-300/70 border-y border-stone-300/70">
          {DAY.map((s) => (
            <li key={s.time + s.who} className="grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-1 py-5 sm:grid-cols-[72px_160px_1fr_auto]">
              <span style={DISPLAY} className="text-lg font-bold tabular-nums text-stone-400">
                {s.time}
              </span>
              <span className="font-semibold">{s.who}</span>
              <span className="col-start-2 text-sm text-stone-600 sm:col-start-auto">{s.body}</span>
              <span className="col-start-2 justify-self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 sm:col-start-auto">
                {s.tag}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* setup */}
      <section id="setup" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <H2>Running in five minutes.</H2>
        <div className="mt-12 space-y-10">
          {SETUP.map((s, i) => (
            <div key={s.t} className={`flex flex-col items-center gap-6 sm:flex-row ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
              <div className="grid size-28 shrink-0 grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
                <span className="col-span-2 flex items-center justify-center rounded-xl bg-[#ede9fe] text-[#6d28d9]">
                  <s.icon className="size-7" />
                </span>
                <span className="rounded-lg bg-[#fde3cf]" />
                <span className="flex items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-500">{i + 1}</span>
              </div>
              <div className={`max-w-md text-center ${i % 2 ? "sm:text-right" : "sm:text-left"}`}>
                <div style={DISPLAY} className="text-xl font-bold">
                  {s.t}
                </div>
                <p className="mt-1 text-stone-600">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* texts grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <H2>Texts it already knows what to do with.</H2>
        <p className="mx-auto mt-3 max-w-lg text-center text-stone-600">Real messages from the demo café and what the agent did with each one.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEXTS.map((t) => (
            <figure key={t.who + t.body} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
              <blockquote className="rounded-2xl rounded-tl-sm bg-stone-100 px-4 py-3 text-sm text-stone-800">{t.body}</blockquote>
              <p className="mt-4 flex-1 text-sm text-stone-600">{t.did}</p>
              <figcaption className="mt-5 flex items-center gap-2 text-sm">
                <span className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: t.c }}>
                  {t.who[0]}
                </span>
                <span className="font-semibold">{t.who}</span>
                <span className={`ms-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.tone}`}>{t.chip}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Stamp className="w-32" />
          <div style={DISPLAY} className="text-lg font-bold">
            Built on Agent-Native
          </div>
          <p className="max-w-sm text-sm text-stone-600">The grid, the agent and Claude all call the same actions, so they can't disagree about the rules.</p>
        </div>
      </section>

      {/* final cta */}
      <section className="relative pt-16 text-center">
        <div className="mx-auto max-w-xl px-4">
          <h2 style={DISPLAY} className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your whole week on one page.
          </h2>
          <p className="mt-3 text-stone-600">Try it with the demo café: 10 staff, 45 shifts and a phone to text yourself in sick.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>
              Open the dashboard <IconArrowRight className="size-4" />
            </Link>
            <a href="#product" className="rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-white">
              Look around first
            </a>
          </div>
        </div>
        <StreetScene className="mt-6 block w-full" />
      </section>

      {/* footer */}
      <footer className="bg-[#fffaf3]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: ACCENT }}>
                R
              </span>
              <span style={DISPLAY} className="font-bold">
                Rota
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-500">Staff scheduling for small teams. The agent drafts, you decide.</p>
          </div>
          {[
            ["App", [["Schedule", "/dashboard"], ["Inbox", "/dashboard/inbox"], ["Team", "/dashboard/team"], ["Rules", "/dashboard/rules"]]],
            ["Agent", [["Chat", "/chat"], ["A sick day", "#sick-day"], ["How it decides", "#different"]]],
            ["Start", [["Open the dashboard", "/dashboard"], ["Setup", "#setup"]]],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="text-sm font-semibold">{h as string}</div>
              <ul className="mt-3 space-y-2 text-sm text-stone-500">
                {(items as string[][]).map(([l, href]) => (
                  <li key={l}>
                    {href!.startsWith("#") ? (
                      <a href={href} className="hover:text-stone-900">{l}</a>
                    ) : (
                      <Link to={href!} className="hover:text-stone-900">{l}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-200">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-5 text-xs text-stone-400 sm:px-6">
            <IconFileText className="size-3.5" /> Built for the Builder.io Agent-Native hackathon, 2026.
          </div>
        </div>
      </footer>
    </div>
  );
}
