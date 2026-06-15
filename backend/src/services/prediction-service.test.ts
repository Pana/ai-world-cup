import { describe, expect, it } from "vitest";
import { resolveReasoningConfig } from "./prediction-service.js";

describe("resolveReasoningConfig", () => {
  it("uses an explicit model config override", () => {
    expect(
      resolveReasoningConfig(
        { is_reasoning_enabled: 1, reasoning_effort: "medium" },
        { reasoning: { effort: "low", exclude: true } }
      )
    ).toEqual({ effort: "low", exclude: true });
  });

  it("enables reasoning with the model effort", () => {
    expect(
      resolveReasoningConfig(
        { is_reasoning_enabled: 1, reasoning_effort: "high" },
        {}
      )
    ).toEqual({ effort: "high", exclude: true });
  });

  it("explicitly disables reasoning for non-reasoning models", () => {
    expect(
      resolveReasoningConfig(
        { is_reasoning_enabled: 0, reasoning_effort: null },
        {}
      )
    ).toEqual({ effort: "none", exclude: true });
  });
});
