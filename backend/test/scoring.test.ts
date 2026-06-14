import { describe, expect, it } from "vitest";
import { calculateMatchRuleHits } from "../src/domain/scoring.js";

describe("calculateMatchRuleHits", () => {
  it("awards all five base points for an exact score", () => {
    const scores = calculateMatchRuleHits(
      {
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        predictedWinnerTeamId: null,
        predictedDecisionMethod: null
      },
      {
        homeScore90: 2,
        awayScore90: 1,
        winnerTeamId: 1,
        resultType: "regular_time"
      }
    );
    expect(hitCodes(scores)).toEqual(["RESULT", "GOAL_DIFF", "EXACT_SCORE"]);
  });

  it("awards extra-time and penalties only when the match enters them", () => {
    const scores = calculateMatchRuleHits(
      {
        predictedHomeScore: 1,
        predictedAwayScore: 1,
        predictedWinnerTeamId: 2,
        predictedDecisionMethod: "penalties"
      },
      {
        homeScore90: 1,
        awayScore90: 1,
        winnerTeamId: 2,
        resultType: "penalties"
      }
    );
    expect(hitCodes(scores)).toEqual([
      "RESULT",
      "GOAL_DIFF",
      "EXACT_SCORE",
      "ADVANCING_TEAM",
      "EXTRA_TIME",
      "PENALTIES"
    ]);
  });

  it("does not award extra-time points when both prediction and result are regular time", () => {
    const scores = calculateMatchRuleHits(
      {
        predictedHomeScore: 2,
        predictedAwayScore: 0,
        predictedWinnerTeamId: 1,
        predictedDecisionMethod: "regular_time"
      },
      {
        homeScore90: 2,
        awayScore90: 0,
        winnerTeamId: 1,
        resultType: "regular_time"
      }
    );
    expect(hitCodes(scores)).not.toContain("EXTRA_TIME");
    expect(hitCodes(scores)).not.toContain("PENALTIES");
  });
});

function hitCodes(
  scores: ReturnType<typeof calculateMatchRuleHits>
): string[] {
  return scores.filter((score) => score.hit).map((score) => score.code);
}
