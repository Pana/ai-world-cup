"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MatchPrediction } from "@/types/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatPercent } from "@/lib/format";
import Link from "next/link";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try { return asList(JSON.parse(value)); } catch { return []; }
  }
  return [];
}

export function PredictionCard({ p, finished }: { p: MatchPrediction; finished: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center gap-3">
        <ModelAvatar slug={p.modelSlug} name={p.modelName} size={36} />
        <Link href={`/models/${p.modelSlug}`} className="font-bold hover:text-electric">{p.modelName}</Link>
        <div className="ml-auto text-lg font-black text-electric">
          {p.predictedHomeScore} : {p.predictedAwayScore}
        </div>
        {finished && <ScoreBadge points={p.points} />}
      </div>

      <div className="mt-3"><ProbabilityBar home={p.homeWinProbability} draw={p.drawProbability} away={p.awayWinProbability} /></div>

      {p.confidence !== null && (
        <div className="mt-2 text-xs text-slate-400">Confidence: {formatPercent(p.confidence)}</div>
      )}

      {p.highlightQuote && (
        <blockquote className="mt-3 border-l-2 border-neon/60 pl-3 text-sm italic text-slate-200">
          &ldquo;{p.highlightQuote}&rdquo;
        </blockquote>
      )}

      {p.reasoning && (
        <div className="mt-3">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs text-electric hover:underline">
            {open ? "Hide reasoning" : "Show reasoning"}
          </button>
          {open && (
            <div className="mt-2 space-y-3 text-sm text-slate-300">
              <p className="whitespace-pre-wrap">{p.reasoning}</p>
              {asList(p.keyFactors).length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Key factors</div>
                  <ul className="space-y-1">{asList(p.keyFactors).map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              )}
              {asList(p.uncertainties).length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Uncertainties</div>
                  <ul className="space-y-1">{asList(p.uncertainties).map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              )}
              {p.predictedDecisionMethod && (
                <p className="text-xs text-slate-500">Decision: {p.predictedDecisionMethod.replaceAll("_", " ")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
