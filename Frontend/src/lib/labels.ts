import type { LeaderboardRow } from "@/types/api";
import { toNum } from "@/lib/format";

export interface Label { text: string; tone: "gold" | "neon" | "electric" | "muted"; }

export function deriveLabel(row: LeaderboardRow, index: number, all: LeaderboardRow[]): Label {
  if (index === 0) return { text: "The Oracle", tone: "gold" };

  const acc = toNum(row.resultAccuracy);
  if (acc >= 0.7) return { text: "Sharpshooter", tone: "neon" };

  // Cold Streak check comes BEFORE Bullseye: a trailing model with poor accuracy
  // should not be rescued by tying on exactScoreHits.
  const isTrailing = index >= all.length - 1;
  if (isTrailing && acc < 0.3) return { text: "Cold Streak", tone: "muted" };

  const topExact = Math.max(...all.map((r) => toNum(r.exactScoreHits)));
  if (topExact > 0 && toNum(row.exactScoreHits) === topExact) {
    return { text: "Bullseye", tone: "electric" };
  }

  return { text: "Contender", tone: "muted" };
}
