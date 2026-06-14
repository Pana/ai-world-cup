"use client";

import Link from "next/link";
import { Cpu } from "lucide-react";
import { useModels } from "@/lib/api";
import { ModelAvatar } from "@/components/ModelAvatar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, Loading } from "@/components/States";

export default function ModelsPage() {
  const { data, error, isLoading } = useModels();
  return (
    <div>
      <PageHeader title="AI contenders" description="The models competing under the same data cutoff, prompt version and scoring rules." />
      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load models." />}
      {data?.length === 0 && <EmptyState message="No models configured yet." />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((model) => (
          <Link key={model.id} href={`/models/${model.slug}`}
            className="border border-white/10 bg-white/5 p-4 hover:border-electric/60">
            <div className="flex items-center gap-3">
              <ModelAvatar slug={model.slug} name={model.name} size={44} />
              <div className="min-w-0">
                <h2 className="truncate font-bold">{model.name}</h2>
                <p className="text-xs text-slate-400">{model.provider} · {model.version}</p>
              </div>
              <Cpu size={16} className={model.active ? "ml-auto text-neon" : "ml-auto text-slate-600"} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-400">{model.description ?? model.personality ?? "AI football analyst"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
