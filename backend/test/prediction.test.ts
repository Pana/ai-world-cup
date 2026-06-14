import { describe, expect, it } from "vitest";
import {
  derivePredictedResult,
  validateKnockoutPrediction,
  type MatchPredictionOutput
} from "../src/domain/prediction.js";

const baseOutput: MatchPredictionOutput = {
  schema_version: "1.0",
  match_id: 1,
  score_90_minutes: { home: 1, away: 1 },
  probabilities: { home_win: 35, draw: 35, away_win: 30 },
  knockout_prediction: {
    advancing_team_id: 10,
    decision_method: "penalties"
  },
  confidence: 60,
  key_factors: ["Balanced teams"],
  uncertainties: [],
  public_summary: "A close match."
};

describe("prediction validation", () => {
  it("derives the 90-minute result", () => {
    expect(derivePredictedResult(2, 1)).toBe("home");
    expect(derivePredictedResult(1, 1)).toBe("draw");
    expect(derivePredictedResult(0, 2)).toBe("away");
  });

  it("accepts a valid penalty prediction", () => {
    expect(() =>
      validateKnockoutPrediction(baseOutput, "knockout", 10, 20)
    ).not.toThrow();
  });

  it("rejects extra time with a non-drawn 90-minute score", () => {
    expect(() =>
      validateKnockoutPrediction(
        {
          ...baseOutput,
          score_90_minutes: { home: 2, away: 1 }
        },
        "knockout",
        10,
        20
      )
    ).toThrow(/drawn/);
  });

  it("requires null knockout fields during the group stage", () => {
    expect(() =>
      validateKnockoutPrediction(baseOutput, "group", 10, 20)
    ).toThrow(/must be null/);
  });
});
