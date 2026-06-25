import { getConfig } from "../config.js";
import type { ScheduleDocument, ScheduleMatch } from "../domain/schedule.js";

const WORLD_CUP_2026_COMPETITION_ID = "17";
const WORLD_CUP_2026_SEASON_ID = "285023";

const stageMap: Record<
  string,
  { code: string; name: string; type: "group" | "knockout"; sequence: number }
> = {
  "First Stage": {
    code: "GROUP",
    name: "Group Stage",
    type: "group",
    sequence: 1
  },
  "Round of 32": {
    code: "R32",
    name: "Round of 32",
    type: "knockout",
    sequence: 2
  },
  "Round of 16": {
    code: "R16",
    name: "Round of 16",
    type: "knockout",
    sequence: 3
  },
  "Quarter-final": {
    code: "QF",
    name: "Quarter-finals",
    type: "knockout",
    sequence: 4
  },
  "Semi-final": {
    code: "SF",
    name: "Semi-finals",
    type: "knockout",
    sequence: 5
  },
  "Play-off for third place": {
    code: "THIRD_PLACE",
    name: "Third-place play-off",
    type: "knockout",
    sequence: 6
  },
  Final: {
    code: "FINAL",
    name: "Final",
    type: "knockout",
    sequence: 7
  }
};

export async function fetchFifaWorldCup2026Schedule(): Promise<ScheduleDocument> {
  const config = getConfig();
  const url = new URL(`${config.FIFA_API_BASE_URL}/calendar/matches`);
  url.searchParams.set("idCompetition", WORLD_CUP_2026_COMPETITION_ID);
  url.searchParams.set("idSeason", WORLD_CUP_2026_SEASON_ID);
  url.searchParams.set("language", "en");
  url.searchParams.set("count", "200");

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    throw new Error(`FIFA schedule API returned HTTP ${response.status}`);
  }

  return transformFifaSchedule(await response.json(), new Date());
}

export function transformFifaSchedule(
  payload: unknown,
  fetchedAt: Date
): ScheduleDocument {
  const records = asRecord(payload);
  const results = Array.isArray(records.Results) ? records.Results : [];

  return {
    tournament: {
      slug: "world-cup-2026",
      name: "FIFA World Cup",
      edition: "2026",
      hostCountries: ["US", "CA", "MX"],
      startsAt: "2026-06-11",
      endsAt: "2026-07-19",
      teamCount: 48,
      matchCount: 104,
      status: "active"
    },
    matches: results
      .map((item) => transformFifaMatch(asRecord(item), fetchedAt))
      .sort((a, b) => a.matchNumber - b.matchNumber)
  };
}

function transformFifaMatch(
  match: Record<string, unknown>,
  fetchedAt: Date
): ScheduleMatch {
  const rawStage = localizedText(match.StageName);
  const stage = stageMap[rawStage ?? ""];
  if (!stage) throw new Error(`Unknown FIFA stage: ${rawStage ?? "missing"}`);

  const rawGroup = localizedText(match.GroupName);
  const status = matchStatus(match);

  return {
    externalId: `fifa-${stringValue(match.IdMatch)}`,
    matchNumber: numberValue(match.MatchNumber),
    stageCode: stage.code,
    stageName: stage.name,
    stageType: stage.type,
    stageSequence: stage.sequence,
    groupCode: groupCode(rawGroup),
    groupName: rawGroup,
    homeTeamCode: teamCode(match.Home),
    awayTeamCode: teamCode(match.Away),
    homePlaceholder: stringOrNull(match.PlaceHolderA),
    awayPlaceholder: stringOrNull(match.PlaceHolderB),
    venueName: localizedText(asRecord(match.Stadium).Name),
    hostCity: localizedText(asRecord(match.Stadium).CityName),
    scheduledAt: stringValue(match.Date),
    status,
    homeScore90: status === "finished" ? nullableNumber(match.HomeTeamScore) : null,
    awayScore90: status === "finished" ? nullableNumber(match.AwayTeamScore) : null,
    homeScoreAfterExtraTime: null,
    awayScoreAfterExtraTime: null,
    homePenaltyScore: nullableNumber(match.HomeTeamPenaltyScore),
    awayPenaltyScore: nullableNumber(match.AwayTeamPenaltyScore),
    winnerTeamCode: winnerCode(match),
    resultType: resultType(match, status),
    startedAt: status === "finished" ? stringValue(match.Date) : null,
    finishedAt: status === "finished" ? stringValue(match.Date) : null,
    sourceUpdatedAt: fetchedAt.toISOString()
  };
}

function matchStatus(match: Record<string, unknown>): ScheduleMatch["status"] {
  const resultTypeValue = nullableNumber(match.ResultType);
  const homeScore = nullableNumber(match.HomeTeamScore);
  const awayScore = nullableNumber(match.AwayTeamScore);
  if (
    resultTypeValue !== null &&
    resultTypeValue > 0 &&
    homeScore !== null &&
    awayScore !== null
  ) {
    return "finished";
  }

  const statusValue = nullableNumber(match.MatchStatus);
  if (statusValue === 3 || statusValue === 4) return "live";
  return "scheduled";
}

function resultType(
  match: Record<string, unknown>,
  status: ScheduleMatch["status"]
): ScheduleMatch["resultType"] {
  if (status !== "finished") return null;
  const value = nullableNumber(match.ResultType);
  if (value === 2) return "extra_time";
  if (value === 3) return "penalties";
  return "regular_time";
}

function winnerCode(match: Record<string, unknown>): string | null {
  const winner = stringOrNull(match.Winner);
  if (!winner) return null;

  const home = asRecord(match.Home);
  if (stringOrNull(home.IdTeam) === winner) return teamCode(home);

  const away = asRecord(match.Away);
  if (stringOrNull(away.IdTeam) === winner) return teamCode(away);

  return null;
}

function teamCode(value: unknown): string | null {
  const team = asRecord(value);
  return stringOrNull(team.Abbreviation);
}

function groupCode(groupName: string | null): string | null {
  const match = /^Group\s+([A-L])$/.exec(groupName ?? "");
  return match?.[1] ?? null;
}

function localizedText(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const first = asRecord(value[0]);
  return stringOrNull(first.Description);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected non-empty FIFA string value");
  }
  return value;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  const result = nullableNumber(value);
  if (result === null) throw new Error("Expected FIFA number value");
  return result;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
