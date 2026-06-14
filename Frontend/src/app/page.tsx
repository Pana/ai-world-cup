"use client";
import { useLeaderboard } from "@/lib/api";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { FootballSpinner } from "@/components/FootballSpinner";
import { Loading, ErrorState, EmptyState } from "@/components/States";

export default function Home() {
  const { data, error, isLoading } = useLeaderboard();
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
      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load the leaderboard." />}
      {data && (data.length ? <LeaderboardTable rows={data} /> : <EmptyState message="No predictions scored yet." />)}
    </div>
  );
}
