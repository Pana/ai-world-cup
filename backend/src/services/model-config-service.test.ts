import { describe, expect, it } from "vitest";
import { buildModelGatewayConfig } from "./model-config-service.js";

describe("buildModelGatewayConfig", () => {
  it("pins Qwen 3.7 Max to the compatible Alibaba provider", () => {
    expect(
      buildModelGatewayConfig("qianwen", "qwen/qwen3.7-max")
    ).toEqual({
      provider: {
        require_parameters: true,
        order: ["Alibaba"],
        allow_fallbacks: false
      }
    });
  });

  it("omits unsupported Doubao parameters and disables reasoning", () => {
    expect(
      buildModelGatewayConfig("doubao", "bytedance-seed/seed-2.0-mini")
    ).toEqual({
      provider: { require_parameters: true },
      disabledParameters: ["seed"],
      reasoning: { effort: "none", exclude: true }
    });
  });
});
