"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { getGuestId } from "@/lib/guest";
import { saveUser, submitUserPrediction } from "@/lib/api";

function ScoreStepper({ value, onChange, label }: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" title={`Decrease ${label}`} onClick={() => onChange(Math.max(0, value - 1))}
        className="grid size-9 place-items-center border border-white/15 hover:border-electric">
        <Minus size={16} />
      </button>
      <output className="w-10 text-center text-2xl font-black">{value}</output>
      <button type="button" title={`Increase ${label}`} onClick={() => onChange(Math.min(30, value + 1))}
        className="grid size-9 place-items-center border border-white/15 hover:border-electric">
        <Plus size={16} />
      </button>
    </div>
  );
}

export function UserPredictionForm({ matchId, homeTeam, awayTeam, locked }: {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  locked: boolean;
}) {
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(1);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setState("saving");
    try {
      const publicId = getGuestId();
      await saveUser({ publicId, displayName: "World Cup Fan" });
      await submitUserPrediction(publicId, { matchId, homeScore: home, awayScore: away });
      setState("saved");
      setMessage("Prediction locked in.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not save prediction.");
    }
  }

  return (
    <section className="border border-white/10 bg-white/5 p-4">
      <div className="mb-4">
        <h2 className="font-bold">Your prediction</h2>
        <p className="text-xs text-slate-400">Earn up to 5 points using the same scoring rules as the AI models.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs text-slate-400">{homeTeam}</div>
          <ScoreStepper value={home} onChange={setHome} label={homeTeam} />
        </div>
        <div>
          <div className="mb-1 text-xs text-slate-400">{awayTeam}</div>
          <ScoreStepper value={away} onChange={setAway} label={awayTeam} />
        </div>
        <button type="button" disabled={locked || state === "saving"} onClick={submit}
          className="flex h-10 items-center gap-2 bg-electric px-4 text-sm font-bold text-night disabled:cursor-not-allowed disabled:opacity-40">
          <Check size={16} />
          {locked ? "Locked" : state === "saving" ? "Saving" : "Submit"}
        </button>
      </div>
      {message && <p className={`mt-3 text-xs ${state === "error" ? "text-red-300" : "text-neon"}`}>{message}</p>}
    </section>
  );
}
