import type { ModelHistoryRow } from "@/types/api";
import { toNum } from "@/lib/format";

export interface PointPoint { label: string; cumulative: number; }

export function cumulativePoints(history: ModelHistoryRow[]): PointPoint[] {
  const sorted = [...history].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  let running = 0;
  return sorted.map((r) => {
    running += toNum(r.points);
    return { label: `M${r.matchNumber}`, cumulative: running };
  });
}
