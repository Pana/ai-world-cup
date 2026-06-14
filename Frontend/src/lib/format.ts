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
