"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LeaderboardRow } from "@/types/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { deriveLabel } from "@/lib/labels";
import { toNum, formatPercent } from "@/lib/format";

const toneClass: Record<string, string> = {
  gold: "bg-gold/20 text-gold",
  neon: "bg-neon/20 text-neon",
  electric: "bg-electric/20 text-electric",
  muted: "bg-white/10 text-slate-300"
};

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const label = deriveLabel(row, i, rows);
        return (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={`/models/${row.slug}`}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:border-electric/50"
            >
              <span className="w-8 text-center text-xl font-black text-slate-400">{i + 1}</span>
              <ModelAvatar slug={row.slug} name={row.name} />
              <div className="flex-1">
                <div className="font-bold">{row.name}</div>
                <div className="text-xs text-slate-400">{row.provider}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${toneClass[label.tone]}`}>
                {label.text}
              </span>
              <div className="hidden gap-6 text-center text-xs text-slate-300 sm:flex">
                <div><div className="font-bold text-white">{toNum(row.exactScoreHits)}</div>exact</div>
                <div><div className="font-bold text-white">{toNum(row.resultHits)}</div>result</div>
                <div><div className="font-bold text-white">{formatPercent(row.resultAccuracy)}</div>acc</div>
                <div><div className="font-bold text-white">{row.submittedMatches}</div>played</div>
              </div>
              <div className="w-20 text-right text-2xl font-black text-electric">
                {toNum(row.totalPoints)}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
