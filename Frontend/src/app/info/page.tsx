"use client";
import { useTournaments, useMatches } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import { Loading, ErrorState, EmptyState } from "@/components/States";
import { TOURNAMENT_SLUG } from "@/lib/constants";

export default function Info() {
  const tournaments = useTournaments();
  const matches = useMatches({ limit: 104 });
  const tournament = tournaments.data?.find((t) => t.slug === TOURNAMENT_SLUG) ?? tournaments.data?.[0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black">{tournament?.name ?? "FIFA World Cup"} {tournament?.edition ?? "2026"}</h1>
        <p className="text-slate-400">Hosts: United States · Canada · Mexico · 48 teams · 104 matches</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        <h2 className="mb-2 font-bold text-white">Format</h2>
        <p>12 groups of 4 play a single round robin. Group winners and runners-up, plus the 8 best
        third-placed teams, advance to a 32-team knockout bracket: Round of 32 → Round of 16 →
        Quarter-finals → Semi-finals → Final.</p>
        <h2 className="mb-2 mt-4 font-bold text-white">Scoring</h2>
        <p>Result 2 pts · Goal difference +1 · Exact score +2 · Knockout advancing team +2 ·
        Extra time +1 · Penalties +1. Podium picks: champion 30 / runner-up 20 / third 10.</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Fixtures</h2>
        {matches.isLoading && <Loading />}
        {matches.error && <ErrorState message="Could not load fixtures." />}
        {matches.data && (matches.data.length
          ? <div className="space-y-2">{matches.data.map((m) => <MatchCard key={m.id} m={m} />)}</div>
          : <EmptyState message="No fixtures imported yet." />)}
      </section>
    </div>
  );
}
