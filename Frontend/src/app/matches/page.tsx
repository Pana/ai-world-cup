"use client";

import { useMemo, useState } from "react";
import { useMatches, useStages } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

const statuses = ["upcoming", "all", "scheduled", "live", "finished"] as const;

const statusLabels: Record<(typeof statuses)[number], string> = {
  all: "All",
  upcoming: "Upcoming",
  scheduled: "Scheduled",
  live: "Live",
  finished: "Finished"
};

export default function MatchesPage() {
  const [status, setStatus] = useState<(typeof statuses)[number]>("upcoming");
  const [stage, setStage] = useState("all");
  const matches = useMatches({
    status: status === "all" || status === "upcoming" ? undefined : status,
    stage: stage === "all" ? undefined : stage,
    limit: 104
  });
  const stages = useStages();
  const matchRows = useMemo(() => {
    if (status !== "upcoming") return matches.data;
    return matches.data?.filter((match) => match.status !== "finished");
  }, [matches.data, status]);
  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof matchRows>>();
    for (const match of matchRows ?? []) {
      const key = match.stageName ?? match.stageCode ?? "Tournament";
      map.set(key, [...(map.get(key) ?? []), match]);
    }
    return [...map.entries()];
  }, [matchRows]);

  return (
    <div>
      <PageHeader title="Match center" description="Browse all 104 fixtures, live scores and every model prediction." />
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex border border-white/10 bg-white/5 p-1">
          {statuses.map((item) => (
            <button key={item} onClick={() => setStatus(item)}
              className={`px-3 py-1.5 text-xs ${status === item ? "bg-electric font-bold text-night" : "text-slate-400"}`}>
              {statusLabels[item]}
            </button>
          ))}
        </div>
        <select aria-label="Filter by stage" value={stage} onChange={(event) => setStage(event.target.value)}
          className="border border-white/10 bg-night px-3 py-2 text-xs text-slate-200">
          <option value="all">All stages</option>
          {stages.data?.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
        </select>
      </div>
      {matches.isLoading && <Loading />}
      {matches.error && <ErrorState message="Could not load fixtures." />}
      {matchRows && grouped.length === 0 && <EmptyState message="No matches in this view." />}
      <div className="space-y-8">
        {grouped.map(([name, rows]) => (
          <section key={name}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-bold">{name}</h2>
              <span className="text-xs text-slate-500">{rows.length} matches</span>
            </div>
            <div className="space-y-2">{rows.map((match) => <MatchCard key={match.id} m={match} />)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
