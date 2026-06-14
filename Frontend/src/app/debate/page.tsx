"use client";

import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { useDebate } from "@/lib/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

export default function DebatePage() {
  const { data, error, isLoading } = useDebate();
  const match = data?.[0];
  const statements = data?.filter((item) => item.matchId === match?.matchId) ?? [];
  return (
    <div>
      <PageHeader title="AI debate room" description="One fixture, competing forecasts and very different football philosophies." />
      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load the debate." />}
      {data?.length === 0 && <EmptyState message="The debate opens when model predictions arrive." />}
      {match && (
        <>
          <div className="mb-5 flex items-center justify-between border-y border-white/10 py-4">
            <div>
              <div className="text-xs uppercase text-slate-500">Featured match</div>
              <h2 className="mt-1 text-xl font-black">{match.homeTeam} vs {match.awayTeam}</h2>
            </div>
            <Link href={`/matches/${match.matchId}`} className="text-sm text-electric hover:underline">Match details</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {statements.map((item) => (
              <article key={item.id} className="border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <ModelAvatar slug={item.modelSlug} name={item.modelName} size={36} />
                  <div>
                    <h3 className="font-bold">{item.modelName}</h3>
                    <p className="text-xs text-slate-500">{item.personality ?? "Football analyst"}</p>
                  </div>
                  <strong className="ml-auto text-xl text-electric">{item.predictedHomeScore}:{item.predictedAwayScore}</strong>
                </div>
                <blockquote className="mt-4 flex gap-2 text-sm leading-6 text-slate-300">
                  <MessageSquareQuote size={18} className="mt-1 shrink-0 text-neon" />
                  <span>{item.statement}</span>
                </blockquote>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
