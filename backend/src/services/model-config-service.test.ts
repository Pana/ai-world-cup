import { describe, expect, it } from "vitest";
import { buildModelGatewayConfig } from "./model-config-service.js";

describe("buildModelGatewayConfig", () => {
  it("pins the compatible Qianwen provider", () => {
    expect(
      buildModelGatewayConfig("qianwen", "qwen/qwen3-235b-a22b-2507")
    ).toEqual({
      provider: {
        require_parameters: true,
        order: ["DeepInfra"],
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
