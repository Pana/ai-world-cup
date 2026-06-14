import { describe, expect, it } from "vitest";
import { deriveLabel } from "@/lib/labels";

const base = {
  id: 1, name: "X", slug: "x", provider: "p", icon: null,
  totalPoints: 10, submittedMatches: 5, exactScoreHits: 1,
  goalDifferenceHits: 1, resultHits: 3, advancingTeamHits: 0, resultAccuracy: 0.6
};

describe("deriveLabel", () => {
  it("labels the rank-1 model The Oracle", () => {
    expect(deriveLabel(base, 0, [base]).text).toBe("The Oracle");
  });
  it("labels a high-accuracy non-leader Sharpshooter", () => {
    const rows = [{ ...base }, { ...base, resultAccuracy: 0.8 }];
    expect(deriveLabel(rows[1], 1, rows).text).toBe("Sharpshooter");
  });
  it("labels a low-accuracy trailing model Cold Streak", () => {
    const rows = [{ ...base }, { ...base, resultAccuracy: 0.1, totalPoints: 1 }];
    expect(deriveLabel(rows[1], 1, rows).text).toBe("Cold Streak");
  });
});
