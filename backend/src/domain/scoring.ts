export type MatchRuleCode =
  | "RESULT"
  | "GOAL_DIFF"
  | "EXACT_SCORE"
  | "ADVANCING_TEAM"
  | "EXTRA_TIME"
  | "PENALTIES";

export interface ScoreablePrediction {
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinnerTeamId: number | null;
  predictedDecisionMethod: "regular_time" | "extra_time" | "penalties" | null;
}

export interface OfficialMatchResult {
  homeScore90: number;
  awayScore90: number;
  winnerTeamId: number | null;
  resultType: "regular_time" | "extra_time" | "penalties";
}

export interface RuleScore {
  code: MatchRuleCode;
  hit: boolean;
  detail: Record<string, unknown>;
}

export function calculateMatchRuleHits(
  prediction: ScoreablePrediction,
  result: OfficialMatchResult
): RuleScore[] {
  const predictedResult = resultLabel(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore
  );
  const actualResult = resultLabel(result.homeScore90, result.awayScore90);
  const predictedGoalDiff =
    prediction.predictedHomeScore - prediction.predictedAwayScore;
  const actualGoalDiff = result.homeScore90 - result.awayScore90;
  const actualEnteredExtraTime =
    result.resultType === "extra_time" || result.resultType === "penalties";
  const predictedExtraTime =
    prediction.predictedDecisionMethod === "extra_time" ||
    prediction.predictedDecisionMethod === "penalties";

  return [
    {
      code: "RESULT",
      hit: predictedResult === actualResult,
      detail: { predicted: predictedResult, actual: actualResult }
    },
    {
      code: "GOAL_DIFF",
      hit: predictedGoalDiff === actualGoalDiff,
      detail: { predicted: predictedGoalDiff, actual: actualGoalDiff }
    },
    {
      code: "EXACT_SCORE",
      hit:
        prediction.predictedHomeScore === result.homeScore90 &&
        prediction.predictedAwayScore === result.awayScore90,
      detail: {
        predicted: [
          prediction.predictedHomeScore,
          prediction.predictedAwayScore
        ],
        actual: [result.homeScore90, result.awayScore90]
      }
    },
    {
      code: "ADVANCING_TEAM",
      hit:
        result.winnerTeamId !== null &&
        prediction.predictedWinnerTeamId === result.winnerTeamId,
      detail: {
        predicted: prediction.predictedWinnerTeamId,
        actual: result.winnerTeamId
      }
    },
    {
      code: "EXTRA_TIME",
      hit: predictedExtraTime && actualEnteredExtraTime,
      detail: { predicted: predictedExtraTime, actual: actualEnteredExtraTime }
    },
    {
      code: "PENALTIES",
      hit:
        prediction.predictedDecisionMethod === "penalties" &&
        result.resultType === "penalties",
      detail: {
        predicted: prediction.predictedDecisionMethod === "penalties",
        actual: result.resultType === "penalties"
      }
    }
  ];
}

function resultLabel(
  homeScore: number,
  awayScore: number
): "home" | "draw" | "away" {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}
