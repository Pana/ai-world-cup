"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Database, GitBranch } from "lucide-react";
import { usePrompts } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

export default function PromptsPage() {
  const { data, error, isLoading } = usePrompts();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title="Prompt transparency" description="Every prediction is tied to an immutable prompt version, match snapshot and data cutoff." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          [GitBranch, "Versioned prompts", "Changes never rewrite earlier predictions."],
          [Database, "Frozen snapshots", "Models receive the same pre-match information."],
          [Database, "Auditable output", "Raw runs, tokens and scores remain traceable."]
        ].map(([Icon, title, text]) => {
          const Component = Icon as typeof Database;
          return <div key={String(title)} className="border border-white/10 bg-white/5 p-4">
            <Component size={18} className="mb-3 text-electric" />
            <h2 className="text-sm font-bold">{String(title)}</h2>
            <p className="mt-1 text-xs text-slate-400">{String(text)}</p>
          </div>;
        })}
      </div>
      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load prompt versions." />}
      {data?.length === 0 && <EmptyState message="No prompt versions published yet." />}
      <div className="space-y-3">
        {data?.map((prompt) => (
          <article key={prompt.id} className="border border-white/10 bg-white/5">
            <button onClick={() => setOpen(open === prompt.id ? null : prompt.id)}
              aria-expanded={open === prompt.id}
              className="flex w-full items-center gap-4 p-4 text-left">
              <span className="bg-electric px-2 py-1 text-xs font-black text-night">v{prompt.version}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{prompt.name}</h2>
                <p className="truncate text-xs text-slate-400">{prompt.changeSummary ?? prompt.versionKey}</p>
              </div>
              <span className="text-xs text-slate-500">{prompt.matchCount} matches</span>
              {open === prompt.id ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            {open === prompt.id && (
              <div className="space-y-4 border-t border-white/10 p-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">System prompt</h3>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap bg-black/30 p-3 text-xs text-slate-300">{prompt.systemPrompt}</pre>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">User template</h3>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap bg-black/30 p-3 text-xs text-slate-300">{prompt.userPromptTemplate}</pre>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
