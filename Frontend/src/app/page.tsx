"use client";
import { useLeaderboard } from "@/lib/api";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { FootballSpinner } from "@/components/FootballSpinner";
import { Loading, ErrorState, EmptyState } from "@/components/States";
import { useMatches } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";

export default function Home() {
  const { data, error, isLoading } = useLeaderboard();
  const matches = useMatches({ status: "scheduled", limit: 4 });
  return (
    <div>
      <header className="mb-8 flex items-center gap-6">
        <FootballSpinner />
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            AI World Cup <span className="text-electric">Oracle</span>
          </h1>
          <p className="text-slate-400">Which AI predicts the 2026 World Cup best?</p>
        </div>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><Radio size={17} className="text-neon" /> Live standings</h2>
            <span className="text-xs text-slate-500">Refreshes every minute</span>
          </div>
          {isLoading && <Loading />}
          {error && <ErrorState message="Could not load the leaderboard." />}
          {data && (data.length ? <LeaderboardTable rows={data} /> : <EmptyState message="Models are ready. Rankings appear after the first scored prediction." />)}
        </section>
        <aside>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Next matches</h2>
            <Link href="/matches" className="flex items-center gap-1 text-xs text-electric">All fixtures <ArrowRight size={13} /></Link>
          </div>
          <div className="space-y-2">
            {matches.data?.slice(0, 4).map((match) => <MatchCard key={match.id} m={match} />)}
          </div>
        </aside>
      </div>
    </div>
  );
}
