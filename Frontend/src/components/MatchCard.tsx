"use client";
import Link from "next/link";
import type { MatchSummary } from "@/types/api";
import { TeamFlag } from "@/components/TeamFlag";
import { formatKickoff } from "@/lib/format";

export function MatchCard({ m }: { m: MatchSummary }) {
  const finished = m.status === "finished";
  return (
    <Link
      href={`/matches/${m.id}`}
      className="grid grid-cols-[2rem_1fr_auto_1fr] items-center gap-2 border border-white/10 bg-white/5 p-3 hover:border-electric/50 sm:grid-cols-[3rem_1fr_auto_1fr_10rem]"
    >
      <span className="text-xs text-slate-500">#{m.matchNumber}</span>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate text-right text-xs sm:text-sm">{m.homeTeamName ?? m.homePlaceholder ?? "TBD"}</span>
        <TeamFlag name={m.homeTeamName} code={m.homeTeamCode} />
      </div>
      <span className="px-2 text-sm font-bold">
        {finished ? `${m.homeScore90 ?? "-"}:${m.awayScore90 ?? "-"}` : "vs"}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <TeamFlag name={m.awayTeamName} code={m.awayTeamCode} />
        <span className="truncate text-xs sm:text-sm">{m.awayTeamName ?? m.awayPlaceholder ?? "TBD"}</span>
      </div>
      <span className="hidden w-40 text-right text-xs text-slate-500 sm:block">{formatKickoff(m.scheduledAt)}</span>
    </Link>
  );
}
