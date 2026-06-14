import { toNum } from "@/lib/format";
import type { Num } from "@/types/api";

export function ProbabilityBar({ home, draw, away }: { home: Num; draw: Num; away: Num }) {
  const h = toNum(home), d = toNum(draw), a = toNum(away);
  const total = h + d + a || 1;
  const pct = (x: number) => `${(x / total) * 100}%`;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="bg-electric" style={{ width: pct(h) }} />
        <div className="bg-slate-400" style={{ width: pct(d) }} />
        <div className="bg-neon" style={{ width: pct(a) }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>H {Math.round((h / total) * 100)}%</span>
        <span>D {Math.round((d / total) * 100)}%</span>
        <span>A {Math.round((a / total) * 100)}%</span>
      </div>
    </div>
  );
}
