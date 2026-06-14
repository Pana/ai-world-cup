"use client";
import { use } from "react";
import Link from "next/link";
import { useModel } from "@/lib/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { PointsCurve } from "@/components/PointsCurve";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Loading, ErrorState, EmptyState } from "@/components/States";
import { formatScore, formatKickoff, toNum } from "@/lib/format";

export default function ModelDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, error, isLoading } = useModel(slug);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Could not load this model." />;
  if (!data) return <EmptyState message="Model not found." />;

  const { model, history } = data;
  const total = history.reduce((s, h) => s + toNum(h.points), 0);

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-slate-400 hover:text-electric">← Leaderboard</Link>

      <header className="flex items-center gap-5">
        <ModelAvatar slug={model.slug} name={model.name} size={64} />
        <div>
          <h1 className="text-3xl font-black">{model.name}</h1>
          <p className="text-slate-400">{model.provider} · {model.version}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {model.personality && <span className="rounded-full bg-white/10 px-2 py-0.5">{model.personality}</span>}
            <span className="rounded-full bg-white/10 px-2 py-0.5">
              {model.reasoningEnabled ? `Reasoning: ${model.reasoningEffort ?? "on"}` : "No reasoning"}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5">{model.active ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-4xl font-black text-electric">{total}</div>
          <div className="text-xs text-slate-400">total points</div>
        </div>
      </header>

      {model.description && <p className="text-slate-300">{model.description}</p>}

      <section>
        <h2 className="mb-2 text-lg font-bold">Points curve</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <PointsCurve history={history} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Prediction history</h2>
        {history.length === 0 ? (
          <EmptyState message="No predictions yet." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs text-slate-400">
                <tr>
                  <th className="p-3">Match</th><th className="p-3">Predicted</th>
                  <th className="p-3">Actual</th><th className="p-3">Prompt</th><th className="p-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.matchId} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <Link href={`/matches/${h.matchId}`} className="hover:text-electric">
                        {h.homeTeam} vs {h.awayTeam}
                      </Link>
                      <div className="text-xs text-slate-500">{formatKickoff(h.scheduledAt)}</div>
                    </td>
                    <td className="p-3">{formatScore(h.predictedHomeScore, h.predictedAwayScore)}</td>
                    <td className="p-3">{formatScore(h.actualHomeScore, h.actualAwayScore)}</td>
                    <td className="p-3 text-xs text-slate-400">{h.promptVersion ?? "—"}</td>
                    <td className="p-3 text-right"><ScoreBadge points={h.points} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
