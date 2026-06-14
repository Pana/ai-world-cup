"use client";
import { use } from "react";
import { useMatch } from "@/lib/api";
import { TeamFlag } from "@/components/TeamFlag";
import { PredictionCard } from "@/components/PredictionCard";
import { Loading, ErrorState, EmptyState } from "@/components/States";
import { formatKickoff } from "@/lib/format";
import { UserPredictionForm } from "@/components/UserPredictionForm";

export default function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading } = useMatch(id);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Could not load this match." />;
  if (!data) return <EmptyState message="Match not found." />;

  const { match: m, predictions } = data;
  const finished = m.status === "finished";
  const locked = m.status !== "scheduled" || new Date(m.scheduledAt) <= new Date();
  const homeName = m.homeTeamName ?? m.homePlaceholder ?? "TBD";
  const awayName = m.awayTeamName ?? m.awayPlaceholder ?? "TBD";

  return (
    <div className="space-y-8">
      <header className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          {m.stageName ?? m.stageCode} {m.groupCode ? `· Group ${m.groupCode}` : ""}
        </div>
        <div className="mt-3 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <TeamFlag name={m.homeTeamName} code={m.homeTeamCode} size={48} />
            <span className="max-w-32 text-center font-bold">{homeName}</span>
          </div>
          <div className="text-3xl font-black">
            {finished ? `${m.homeScore90 ?? "-"} : ${m.awayScore90 ?? "-"}` : "vs"}
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamFlag name={m.awayTeamName} code={m.awayTeamCode} size={48} />
            <span className="max-w-32 text-center font-bold">{awayName}</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-400">
          {formatKickoff(m.scheduledAt)}
          {m.venueName ? ` · ${m.venueName}` : ""}
          {m.hostCity ? `, ${m.hostCity}` : ""}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Status: {m.status}{m.promptVersion ? ` · Prompt ${m.promptVersion}` : ""}
        </div>
        {finished && m.resultType && (
          <div className="mt-2 text-xs text-slate-400">
            {m.resultType === "extra_time" && `After extra time: ${m.homeScoreAfterExtraTime}:${m.awayScoreAfterExtraTime}`}
            {m.resultType === "penalties" && `Penalties: ${m.homePenaltyScore}:${m.awayPenaltyScore}`}
          </div>
        )}
      </header>

      {!finished && <UserPredictionForm matchId={m.id} homeTeam={homeName} awayTeam={awayName} locked={locked} />}

      <section>
        <h2 className="mb-3 text-lg font-bold">Model predictions</h2>
        {predictions.length === 0 ? (
          <EmptyState message="No predictions for this match yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {predictions.map((p) => <PredictionCard key={p.id} p={p} finished={finished} />)}
          </div>
        )}
      </section>
    </div>
  );
}
