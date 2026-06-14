import { describe, expect, it } from "vitest";
import {
  matchPredictionSchema,
  normalizePredictionProbabilities
} from "./prediction.js";

describe("normalizePredictionProbabilities", () => {
  it("normalizes rounded model probabilities to exactly 100", () => {
    const normalized = normalizePredictionProbabilities({
      schema_version: "1.0",
      match_id: 1,
      score_90_minutes: { home: 1, away: 1 },
      probabilities: { home_win: 35, draw: 30, away_win: 34 },
      knockout_prediction: {
        advancing_team_id: null,
        decision_method: null
      },
      confidence: 0.65,
      key_factors: ["Home advantage"],
      uncertainties: [],
      public_summary: "A balanced match."
    });

    const output = matchPredictionSchema.parse(normalized);
    expect(
      output.probabilities.home_win +
      output.probabilities.draw +
      output.probabilities.away_win
    ).toBeCloseTo(100, 10);
    expect(output.confidence).toBe(65);
  });
});
