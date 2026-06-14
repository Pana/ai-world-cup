export type Num = number | string | null;

export interface LeaderboardRow {
  id: number;
  name: string;
  slug: string;
  provider: string;
  icon: string | null;
  totalPoints: Num;
  submittedMatches: number;
  exactScoreHits: Num;
  goalDifferenceHits: Num;
  resultHits: Num;
  advancingTeamHits: Num;
  resultAccuracy: Num;
}

export interface ModelSummary {
  id: number;
  provider: string;
  name: string;
  modelKey: string;
  version: string;
  slug: string;
  icon: string | null;
  description?: string;
  personality: string | null;
  reasoningEnabled: 0 | 1;
  reasoningEffort: string | null;
  active: 0 | 1;
}

export interface ModelHistoryRow {
  matchId: number;
  matchNumber: number;
  scheduledAt: string;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  points: Num;
  promptVersion: string | null;
}

export interface ModelDetail {
  model: ModelSummary;
  history: ModelHistoryRow[];
}

export interface MatchSummary {
  id: number;
  matchNumber: number;
  scheduledAt: string;
  status: string;
  stageName?: string;
  stageCode?: string;
  stageType?: string;
  groupCode?: string | null;
  venueName?: string | null;
  hostCity?: string | null;
  homeTeamName?: string | null;
  homeTeamId?: number | null;
  homeTeamCode?: string | null;
  homeTeamFlag?: string | null;
  awayTeamName?: string | null;
  awayTeamId?: number | null;
  awayTeamCode?: string | null;
  awayTeamFlag?: string | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  homeScore90?: number | null;
  awayScore90?: number | null;
  homeScoreAfterExtraTime?: number | null;
  awayScoreAfterExtraTime?: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  winnerTeamId?: number | null;
  resultType?: string | null;
  promptVersion?: string | null;
}

export interface MatchPrediction {
  id: number;
  modelName: string;
  modelSlug: string;
  modelIcon: string | null;
  predictedResult: "home" | "draw" | "away";
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinnerTeamId: number | null;
  predictedDecisionMethod: string | null;
  homeWinProbability: Num;
  drawProbability: Num;
  awayWinProbability: Num;
  confidence: Num;
  reasoning: string | null;
  highlightQuote: string | null;
  keyFactors?: unknown;
  uncertainties?: unknown;
  predictedAt: string;
  points: Num;
}

export interface MatchDetail {
  match: MatchSummary;
  predictions: MatchPrediction[];
}

export interface Tournament {
  id: number;
  name: string;
  edition: string;
  slug: string;
  hostCountries: string[] | string;
  startsAt: string;
  endsAt: string;
  teamCount: number;
  matchCount: number;
  status: string;
}

export interface PromptVersion {
  id: number;
  promptType: string;
  name: string;
  version: number;
  versionKey: string;
  schemaVersion: string;
  changeSummary: string | null;
  changeReason: string | null;
  status: string;
  publishedAt: string | null;
  systemPrompt: string;
  userPromptTemplate: string;
  outputJsonSchema: unknown;
  matchCount: number;
}

export interface Stage {
  id: number;
  name: string;
  code: string;
  stageType: "group" | "knockout";
  sequence: number;
  matchCount: number;
}

export interface DebateStatement {
  id: number;
  matchId: number;
  modelName: string;
  modelSlug: string;
  personality: string | null;
  predictedHomeScore: number;
  predictedAwayScore: number;
  statement: string;
  homeTeam: string | null;
  awayTeam: string | null;
}

export interface UserProfile {
  publicId: string;
  displayName: string;
  trustedModelId: number | null;
  trustedModelName: string | null;
  points: Num;
  predictions: number;
}

export interface UserLeaderboardRow {
  publicId: string;
  displayName: string;
  trustedModelName: string | null;
  trustedModelSlug: string | null;
  points: Num;
  predictions: number;
}
