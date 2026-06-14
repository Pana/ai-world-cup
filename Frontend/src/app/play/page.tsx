"use client";

import { useEffect, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { mutate } from "swr";
import { useModels, useUserLeaderboard, saveUser } from "@/lib/api";
import { API_V1 } from "@/lib/constants";
import { getGuestId } from "@/lib/guest";
import { toNum } from "@/lib/format";
import { ModelAvatar } from "@/components/ModelAvatar";
import { PageHeader } from "@/components/PageHeader";
import { SharePoster } from "@/components/SharePoster";
import { ErrorState, Loading } from "@/components/States";

export default function PlayPage() {
  const models = useModels();
  const leaderboard = useUserLeaderboard();
  const [name, setName] = useState("World Cup Fan");
  const [modelId, setModelId] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("ai-world-cup-display-name") ?? "World Cup Fan");
    setModelId(localStorage.getItem("ai-world-cup-model-id") ?? "");
  }, []);

  async function save() {
    await saveUser({
      publicId: getGuestId(),
      displayName: name,
      trustedModelId: modelId ? Number(modelId) : null
    });
    localStorage.setItem("ai-world-cup-display-name", name);
    localStorage.setItem("ai-world-cup-model-id", modelId);
    setSaved(true);
    await mutate(`${API_V1}/users/leaderboard`);
  }

  const me = leaderboard.data?.find((row) => {
    if (typeof window === "undefined") return false;
    return row.publicId === localStorage.getItem("ai-world-cup-user-id");
  });
  const advisor = models.data?.find((model) => String(model.id) === modelId);

  return (
    <div>
      <PageHeader title="Fan challenge" description="Pick an AI advisor, submit your own scores on match pages and climb the human leaderboard."
        action={<SharePoster name={name} advisor={advisor?.name ?? "No AI"} points={toNum(me?.points)} />} />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="border border-white/10 bg-white/5 p-5">
          <Sparkles size={20} className="mb-4 text-gold" />
          <h2 className="font-bold">Your profile</h2>
          <label className="mt-4 block text-xs text-slate-400">
            Display name
            <input value={name} maxLength={40} onChange={(event) => { setName(event.target.value); setSaved(false); }}
              className="mt-1 w-full border border-white/15 bg-night px-3 py-2 text-sm text-white outline-none focus:border-electric" />
          </label>
          <label className="mt-4 block text-xs text-slate-400">
            AI advisor
            <select value={modelId} onChange={(event) => { setModelId(event.target.value); setSaved(false); }}
              className="mt-1 w-full border border-white/15 bg-night px-3 py-2 text-sm text-white">
              <option value="">Choose a model</option>
              {models.data?.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            </select>
          </label>
          <button onClick={save} disabled={name.trim().length < 2}
            className="mt-4 flex items-center gap-2 bg-electric px-4 py-2 text-sm font-bold text-night disabled:opacity-40">
            <Save size={16} /> {saved ? "Saved" : "Save profile"}
          </button>
        </section>

        <section>
          <h2 className="mb-3 font-bold">Fan leaderboard</h2>
          {leaderboard.isLoading && <Loading />}
          {leaderboard.error && <ErrorState message="Could not load fan standings." />}
          <div className="border border-white/10">
            {leaderboard.data?.map((row, index) => (
              <div key={row.publicId} className="flex items-center gap-3 border-b border-white/10 p-3 last:border-b-0">
                <span className="w-7 text-center font-black text-slate-500">{index + 1}</span>
                {row.trustedModelSlug
                  ? <ModelAvatar slug={row.trustedModelSlug} name={row.trustedModelName ?? "AI"} size={32} />
                  : <div className="size-8 border border-white/10" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{row.displayName}</div>
                  <div className="text-xs text-slate-500">{row.trustedModelName ?? "Independent"} · {row.predictions} picks</div>
                </div>
                <strong className="text-xl text-electric">{toNum(row.points)}</strong>
              </div>
            ))}
            {leaderboard.data?.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Be the first fan on the board.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
