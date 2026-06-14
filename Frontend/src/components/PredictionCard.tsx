"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MatchPrediction } from "@/types/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatPercent } from "@/lib/format";

export function PredictionCard({ p, finished }: { p: MatchPrediction; finished: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center gap-3">
        <ModelAvatar slug={p.modelSlug} name={p.modelName} size={36} />
        <div className="font-bold">{p.modelName}</div>
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
          "{p.highlightQuote}"
        </blockquote>
      )}

      {p.reasoning && (
        <div className="mt-3">
          <button onClick={() => setOpen((o) => !o)} className="text-xs text-electric hover:underline">
            {open ? "Hide reasoning" : "Show reasoning"}
          </button>
          {open && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{p.reasoning}</p>}
        </div>
      )}
    </motion.div>
  );
}
