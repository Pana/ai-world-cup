import { describe, expect, it } from "vitest";
import { toNum, formatScore, formatPercent, formatKickoff } from "@/lib/format";

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
