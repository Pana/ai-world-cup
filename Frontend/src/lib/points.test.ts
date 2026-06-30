import { describe, expect, it } from "vitest";
import { cumulativePoints } from "@/lib/points";
import type { ModelHistoryRow } from "@/types/api";

function row(matchNumber: number, scheduledAt: string, points: number): ModelHistoryRow {
  return {
    matchId: matchNumber, matchNumber, scheduledAt,
    homeTeam: "A", awayTeam: "B",
    predictedHomeScore: 1, predictedAwayScore: 0,
    actualHomeScore: null, actualAwayScore: null,
    actualHomeScoreAfterExtraTime: null, actualAwayScoreAfterExtraTime: null,
    actualHomePenaltyScore: null, actualAwayPenaltyScore: null,
    resultType: null,
    points, promptVersion: "match-prediction-v1"
  };
}

describe("cumulativePoints", () => {
  it("accumulates points in chronological order", () => {
    const history = [
      row(2, "2026-06-12T00:00:00Z", 5),
      row(1, "2026-06-11T00:00:00Z", 2)
    ];
    expect(cumulativePoints(history)).toEqual([
      { label: "M1", cumulative: 2 },
      { label: "M2", cumulative: 7 }
    ]);
  });
  it("returns empty array for empty history", () => {
    expect(cumulativePoints([])).toEqual([]);
  });
});
