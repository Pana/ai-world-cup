import type { Num } from "@/types/api";

export function toNum(v: Num | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatScore(home: number | null | undefined, away: number | null | undefined): string {
  const h = home ?? null;
  const a = away ?? null;
  // If either score is missing, the match result is unknown — show fully blank
  if (h === null || a === null) return "- : -";
  return `${h} : ${a}`;
}

export function formatMatchResult(result: {
  homeScore90?: number | null;
  awayScore90?: number | null;
  homeScoreAfterExtraTime?: number | null;
  awayScoreAfterExtraTime?: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  resultType?: string | null;
}): string {
  const regularScore = formatScore(result.homeScore90, result.awayScore90);
  if (regularScore === "- : -") return regularScore;

  if (
    result.resultType === "penalties" &&
    result.homePenaltyScore !== null &&
    result.homePenaltyScore !== undefined &&
    result.awayPenaltyScore !== null &&
    result.awayPenaltyScore !== undefined
  ) {
    return `${regularScore} (${result.homePenaltyScore} : ${result.awayPenaltyScore} pens)`;
  }

  if (
    result.resultType === "extra_time" &&
    result.homeScoreAfterExtraTime !== null &&
    result.homeScoreAfterExtraTime !== undefined &&
    result.awayScoreAfterExtraTime !== null &&
    result.awayScoreAfterExtraTime !== undefined
  ) {
    return `${regularScore} (AET ${result.homeScoreAfterExtraTime} : ${result.awayScoreAfterExtraTime})`;
  }

  return regularScore;
}

export function formatPercent(v: Num | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return `${Math.round(toNum(v) * 100)}%`;
}

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
