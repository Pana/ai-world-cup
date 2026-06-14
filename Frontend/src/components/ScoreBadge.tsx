import { toNum } from "@/lib/format";
import type { Num } from "@/types/api";

export function ScoreBadge({ points }: { points: Num }) {
  const p = toNum(points);
  const tone = p >= 5 ? "bg-gold/20 text-gold" : p > 0 ? "bg-neon/20 text-neon" : "bg-white/10 text-slate-400";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{p} pts</span>;
}
