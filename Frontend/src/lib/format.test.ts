import { describe, expect, it } from "vitest";
import { toNum, formatScore, formatMatchResult, formatPercent, formatKickoff } from "@/lib/format";

describe("toNum", () => {
  it("parses decimal strings and passes through numbers", () => {
    expect(toNum("12.50")).toBe(12.5);
    expect(toNum(7)).toBe(7);
  });
  it("returns 0 for null/invalid", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum("nope")).toBe(0);
  });
});

describe("formatScore", () => {
  it("joins two scores", () => {
    expect(formatScore(2, 1)).toBe("2 : 1");
  });
  it("shows dash when missing", () => {
    expect(formatScore(null, 1)).toBe("- : -");
  });
});

describe("formatMatchResult", () => {
  it("adds penalty shootout score when available", () => {
    expect(formatMatchResult({
      homeScore90: 1,
      awayScore90: 1,
      homePenaltyScore: 4,
      awayPenaltyScore: 3,
      resultType: "penalties"
    })).toBe("1 : 1 (4 : 3 pens)");
  });

  it("adds after-extra-time score when available", () => {
    expect(formatMatchResult({
      homeScore90: 1,
      awayScore90: 1,
      homeScoreAfterExtraTime: 2,
      awayScoreAfterExtraTime: 1,
      resultType: "extra_time"
    })).toBe("1 : 1 (AET 2 : 1)");
  });
});

describe("formatPercent", () => {
  it("formats a 0..1 ratio as percent", () => {
    expect(formatPercent("0.7")).toBe("70%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatKickoff", () => {
  it("renders an ISO date as a readable string", () => {
    expect(formatKickoff("2026-06-11T19:00:00.000Z")).toContain("2026");
  });
});
