"use client";

import { PageHeader } from "@/components/PageHeader";
import { Loading, ErrorState, EmptyState } from "@/components/States";
import { useScoringRules } from "@/lib/api";
import { toNum } from "@/lib/format";
import type { ScoringRule } from "@/types/api";

const ruleNotes: Record<string, string> = {
  RESULT: "Correct home win, draw, or away win after 90 minutes plus stoppage time.",
  GOAL_DIFF: "Correct goal difference after 90 minutes plus stoppage time.",
  EXACT_SCORE: "Exact home and away score after 90 minutes plus stoppage time.",
  ADVANCING_TEAM: "Correct team that ultimately advances in a knockout match.",
  EXTRA_TIME: "Prediction says the match reaches extra time, and it actually does.",
  PENALTIES: "Prediction says the match reaches penalties, and it actually does.",
  CHAMPION: "Exact champion pick.",
  RUNNER_UP: "Exact runner-up pick.",
  THIRD_PLACE: "Exact third-place pick.",
  PODIUM_WRONG_POSITION: "Team appears on the podium but in a different position."
};

export default function RulesPage() {
  const { data, error, isLoading } = useScoringRules();
  const matchRules = data?.filter((rule) => rule.predictionType === "match") ?? [];
  const podiumRules = data?.filter((rule) => rule.predictionType !== "match") ?? [];
  const baseMax = pointsFor(matchRules, ["RESULT", "GOAL_DIFF", "EXACT_SCORE"]);
  const knockoutRegularMax = pointsFor(matchRules, ["RESULT", "GOAL_DIFF", "EXACT_SCORE", "ADVANCING_TEAM"]);
  const knockoutExtraTimeMax = knockoutRegularMax + pointsFor(matchRules, ["EXTRA_TIME"]);
  const knockoutPenaltyMax = knockoutExtraTimeMax + pointsFor(matchRules, ["PENALTIES"]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scoring rules"
        description="AI models are scored from their locked pre-match prediction. The score prediction is always the 90-minute result, excluding extra-time goals and penalty shootouts."
      />

      {data && data.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-4">
          <Summary label="Group max" value={baseMax} />
          <Summary label="Knockout regular" value={knockoutRegularMax} />
          <Summary label="Knockout extra time" value={knockoutExtraTimeMax} />
          <Summary label="Knockout penalties" value={knockoutPenaltyMax} />
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-bold">Principles</h2>
        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <p>Base scoring uses the 90-minute score only, including stoppage time.</p>
          <p>Extra-time goals do not change the base result, goal difference, or exact-score rules.</p>
          <p>Penalty shootout scores are shown as match context, but never count as football goals.</p>
        </div>
      </section>

      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load scoring rules." />}
      {data && data.length === 0 && <EmptyState message="No scoring rules configured." />}
      {data && data.length > 0 && (
        <>
          <RuleTable title="Match prediction rules" rules={matchRules} />
          <RuleTable title="Tournament podium rules" rules={podiumRules} />
        </>
      )}
    </div>
  );
}

function pointsFor(rules: ScoringRule[], codes: string[]): number {
  return rules
    .filter((rule) => codes.includes(rule.code))
    .reduce((sum, rule) => sum + toNum(rule.points), 0);
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-white/5 p-4">
      <div className="text-3xl font-black text-electric">{value}</div>
      <div className="mt-1 text-xs uppercase text-slate-400">{label}</div>
    </div>
  );
}

function RuleTable({ title, rules }: { title: string; rules: ScoringRule[] }) {
  if (rules.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs text-slate-400">
            <tr>
              <th className="p-3">Rule</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="font-semibold text-white">{rule.name}</div>
                  <div className="text-xs text-slate-500">{rule.code}</div>
                </td>
                <td className="p-3 text-slate-300">{ruleNotes[rule.code] ?? "Configured scoring rule."}</td>
                <td className="p-3 text-right text-base font-black text-electric">{toNum(rule.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
