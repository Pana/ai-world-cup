"use client";

import useSWR from "swr";
import { API_V1, TOURNAMENT_SLUG } from "@/lib/constants";
import type {
  LeaderboardRow, ModelDetail, MatchDetail, MatchSummary, Tournament
} from "@/types/api";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function useLeaderboard() {
  return useSWR<LeaderboardRow[]>(
    `${API_V1}/tournaments/${TOURNAMENT_SLUG}/leaderboard`, fetcher
  );
}

export function useModel(slug: string) {
  return useSWR<ModelDetail>(`${API_V1}/models/${slug}`, fetcher);
}

export function useMatch(id: string) {
  return useSWR<MatchDetail>(`${API_V1}/matches/${id}`, fetcher);
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
