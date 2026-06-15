import { describe, expect, it } from "vitest";
import { extractOpenRouterUsage } from "./openrouter-client.js";

describe("extractOpenRouterUsage", () => {
  it("extracts cost and detailed token usage", () => {
    expect(
      extractOpenRouterUsage({
        usage: {
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800,
          cost: 0.00125,
          completion_tokens_details: {
            reasoning_tokens: 180
          }
        }
      })
    ).toEqual({
      inputTokens: 500,
      outputTokens: 300,
      reasoningTokens: 180,
      totalTokens: 800,
      cost: 0.00125
    });
  });

  it("extracts usage from an error details wrapper", () => {
    expect(
      extractOpenRouterUsage({
        raw: {
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      reasoningTokens: null,
      totalTokens: 30,
      cost: null
    });
  });
});
