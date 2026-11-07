// Hand-drawn style line art for the landing page. Ink strokes on cream.
const INK = "#1c1917";
const PAPER = "#fffaf3";
const ACCENT = "#4f46e5";

const line = { stroke: INK, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Sheet({ x, y, r, w = 54, h = 68, chip }: { x: number; y: number; r: number; w?: number; h?: number; chip?: number }) {
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={PAPER} {...line} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={x + 8} x2={x + w - 8} y1={y + 14 + i * 11} y2={y + 14 + i * 11} {...line} strokeWidth={1} opacity={0.55} />
      ))}
      {chip !== undefined && <rect x={x + 8} y={y + 9 + chip * 11} width={w * 0.45} height={8} rx={2} fill={ACCENT} opacity={0.85} />}
    </g>
  );
}

/** A tall stack of paper rotas with loose sheets flying off the top. */
export function PaperStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 230" fill="none" className={className} aria-hidden>
      {/* stack body */}
      <path d="M48 120 L168 120 L168 205 L48 205 Z" fill={PAPER} {...line} />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M48 ${126 + i * 5.6} Q108 ${124 + i * 5.6 + (i % 2 ? 2 : -1)} 168 ${126 + i * 5.6}`} {...line} strokeWidth={1} />
      ))}
      {/* top sheet, seen from above */}
      <path d="M48 120 L168 120 L190 102 L70 102 Z" fill={PAPER} {...line} />
      <path d="M70 108 L176 108 M64 113 L170 113" {...line} strokeWidth={1} opacity={0.6} />
      <path d="M168 120 L190 102 L190 186 L168 205" fill={PAPER} {...line} />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M168 ${128 + i * 6} L190 ${110 + i * 6.3}`} {...line} strokeWidth={0.9} opacity={0.7} />
      ))}
      {/* flying sheets */}
      <Sheet x={20} y={30} r={-18} chip={1} />
      <Sheet x={96} y={8} r={12} w={48} h={60} />
      <Sheet x={160} y={34} r={24} w={46} h={58} chip={3} />
      <path d="M58 98 q4 -10 -2 -18 M130 78 q6 -8 2 -14 M180 96 q8 -6 6 -14" {...line} strokeWidth={1.2} strokeDasharray="2 4" />
    </svg>
  );
}

/** A phone mid-conversation, with shift chips spilling out. */
export function PhoneTexts({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 230" fill="none" className={className} aria-hidden>
      <g transform="rotate(9 120 120)">
        <rect x={72} y={34} width={104} height={182} rx={18} fill={PAPER} {...line} />
        <rect x={80} y={50} width={88} height={150} rx={8} {...line} strokeWidth={1.1} />
        <path d="M110 41 h28" {...line} />
        <rect x={86} y={62} width={64} height={26} rx={9} fill="#ece7df" {...line} strokeWidth={1.1} />
        <text x={92} y={79} fontSize={9} fontFamily="Inter, sans-serif" fill={INK}>can't do Sat</text>
        <rect x={98} y={98} width={64} height={26} rx={9} fill={ACCENT} />
        <text x={104} y={115} fontSize={9} fontFamily="Inter, sans-serif" fill="#fff">Priya can ✓</text>
        <rect x={86} y={134} width={46} height={18} rx={8} fill="#ece7df" {...line} strokeWidth={1.1} />
        <text x={92} y={146} fontSize={8} fontFamily="Inter, sans-serif" fill={INK}>thanks!</text>
      </g>
      <g transform="rotate(-14 40 70)">
        <rect x={10} y={58} width={62} height={24} rx={5} fill={PAPER} stroke={ACCENT} strokeWidth={1.4} strokeDasharray="4 3" />
        <text x={16} y={74} fontSize={9} fontFamily="Inter, sans-serif" fill={ACCENT}>08:00–14:00</text>
      </g>
      <g transform="rotate(16 210 60)">
        <rect x={180} y={44} width={56} height={24} rx={5} fill={PAPER} {...line} />
        <rect x={180} y={44} width={4} height={24} fill="#0ea5e9" />
        <text x={189} y={60} fontSize={9} fontFamily="Inter, sans-serif" fill={INK}>Off · Sat</text>
      </g>
      <g transform="rotate(-8 205 190)">
        <circle cx={205} cy={190} r={18} fill={PAPER} {...line} />
        <path d="M205 178 v12 l8 6" {...line} />
      </g>
      <path d="M44 100 q-6 14 4 26 M196 82 q10 10 4 24" {...line} strokeWidth={1.2} strokeDasharray="2 4" />
    </svg>
  );
}

/** Café storefront on a curved street, a phone and a rota board either side. */
export function StreetScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 300" fill="none" className={className} preserveAspectRatio="xMidYMax meet" aria-hidden>
      <path d="M0 290 Q600 120 1200 290" {...line} strokeWidth={2} />
      <path d="M0 300 Q600 130 1200 300 L1200 300 L0 300 Z" fill={PAPER} />
      {/* storefront */}
      <g>
        <rect x={500} y={86} width={200} height={124} fill={PAPER} {...line} strokeWidth={2} />
        <path d="M488 86 L712 86 L700 60 L500 60 Z" fill={PAPER} {...line} strokeWidth={2} />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M${488 + i * 28} 86 q14 18 28 0`} fill={i % 2 ? ACCENT : PAPER} {...line} strokeWidth={1.6} />
        ))}
        <rect x={520} y={120} width={84} height={56} rx={3} {...line} />
        <path d="M562 120 v56 M520 148 h84" {...line} strokeWidth={1} />
        <rect x={620} y={116} width={60} height={94} rx={2} fill={PAPER} {...line} />
        <circle cx={668} cy={164} r={2.5} fill={INK} />
        <rect x={532} y={30} width={136} height={26} rx={4} fill={PAPER} {...line} />
        <text x={600} y={48} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily="'Bricolage Grotesque', Inter, sans-serif" fill={INK}>
          CAFÉ · OPEN 7–9
        </text>
        <path d="M545 112 q6 -8 0 -16 M555 112 q6 -8 0 -16" {...line} strokeWidth={1.2} opacity={0.6} />
      </g>
      {/* phone leaning on the left */}
      <g transform="rotate(-12 250 170)">
        <rect x={210} y={70} width={84} height={150} rx={16} fill={PAPER} {...line} strokeWidth={2} />
        <rect x={219} y={86} width={66} height={118} rx={6} {...line} strokeWidth={1.2} />
        <rect x={226} y={98} width={46} height={20} rx={8} fill="#ece7df" {...line} strokeWidth={1} />
        <rect x={236} y={126} width={44} height={20} rx={8} fill={ACCENT} />
        <path d="M244 136 l5 5 9 -10" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* rota board on an easel, right */}
      <g transform="rotate(6 950 160)">
        <path d="M900 230 L930 110 M1000 230 L970 110 M950 230 L950 120" {...line} strokeWidth={2} />
        <rect x={880} y={70} width={140} height={110} rx={4} fill={PAPER} {...line} strokeWidth={2} />
        {Array.from({ length: 5 }, (_, r) => (
          <g key={r}>
            <path d={`M890 ${92 + r * 18} h120`} {...line} strokeWidth={0.8} opacity={0.4} />
            {[0, 1, 2, 3].map((c) =>
              (r + c) % 3 === 0 ? null : (
                <rect key={c} x={918 + c * 24} y={84 + r * 18} width={18} height={8} rx={2} fill={c === 2 && r === 1 ? "transparent" : ["#0ea5e9", "#f97316", "#10b981"][(r + c) % 3]} stroke={c === 2 && r === 1 ? ACCENT : "none"} strokeDasharray="3 2" opacity={0.85} />
              ),
            )}
          </g>
        ))}
      </g>
      {/* loose sheets in the air */}
      <Sheet x={360} y={40} r={-20} w={40} h={50} chip={2} />
      <Sheet x={780} y={30} r={14} w={40} h={50} />
      <Sheet x={1080} y={60} r={-10} w={36} h={46} chip={0} />
      <Sheet x={90} y={90} r={18} w={36} h={46} />
      <path d="M400 110 q20 20 60 10 M760 100 q-20 20 -50 14" {...line} strokeWidth={1.2} strokeDasharray="2 5" />
    </svg>
  );
}

/** Round stamp used as a badge. */
export function Stamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <path id="stamp-ring" d="M80 80 m-54 0 a54 54 0 1 1 108 0 a54 54 0 1 1 -108 0" />
      </defs>
      <g transform="rotate(-10 80 80)">
        <circle cx={80} cy={80} r={68} fill={PAPER} {...line} strokeWidth={2} />
        <circle cx={80} cy={80} r={42} {...line} strokeWidth={1.2} />
        <text fontSize={11} letterSpacing={2.4} fontFamily="Inter, sans-serif" fontWeight={600} fill={INK}>
          <textPath href="#stamp-ring">BUILT ON AGENT-NATIVE · ACTIONS · RULES ·</textPath>
        </text>
        <path d="M64 82 l11 11 22 -24" stroke={ACCENT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
