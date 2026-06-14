"use client";

import useSWR from "swr";
import { API_V1, TOURNAMENT_SLUG } from "@/lib/constants";
import type {
  DebateStatement, LeaderboardRow, ModelDetail, ModelSummary, MatchDetail,
  MatchSummary, PromptVersion, Stage, Tournament, UserLeaderboardRow, UserProfile
} from "@/types/api";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function useLeaderboard() {
  return useSWR<LeaderboardRow[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/leaderboard`, fetcher,
    { refreshInterval: 60_000 }
  );
}

export function useModel(slug: string) {
  return useSWR<ModelDetail>(`${API_V1}/models/${slug}`, fetcher);
}

export function useMatch(id: string) {
  return useSWR<MatchDetail>(`${API_V1}/matches/${id}`, fetcher, {
    refreshInterval: 60_000
  });
}

export function useMatches(params?: { status?: string; stage?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.stage) qs.set("stage", params.stage);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return useSWR<MatchSummary[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/matches${suffix}`, fetcher
  );
}

export function useTournaments() {
  return useSWR<Tournament[]>(`${API_V1}/tournaments`, fetcher);
}

export function useModels() {
  return useSWR<ModelSummary[]>(`${API_V1}/models`, fetcher);
}

export function usePrompts() {
  return useSWR<PromptVersion[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/prompts`, fetcher
  );
}

export function useStages() {
  return useSWR<Stage[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/stages`, fetcher
  );
}

export function useDebate() {
  return useSWR<DebateStatement[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/debate`, fetcher,
    { refreshInterval: 60_000 }
  );
}

export function useUserLeaderboard() {
  return useSWR<UserLeaderboardRow[]>(`${API_V1}/users/leaderboard`, fetcher, {
    refreshInterval: 60_000
  });
}

async function send<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function saveUser(body: {
  publicId: string;
  displayName: string;
  trustedModelId?: number | null;
}) {
  return send<UserProfile>(`${API_V1}/users`, body);
}

export function submitUserPrediction(publicId: string, body: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  return send<{ ok: true }>(`${API_V1}/users/${publicId}/predictions`, body);
}
