import { getConfig } from "../config.js";
import {
  matchPredictionSchema,
  normalizePredictionProbabilities,
  type MatchPredictionOutput
} from "../domain/prediction.js";
import { AppError } from "../lib/errors.js";

export interface OpenRouterRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number | null;
  topP: number | null;
  maxOutputTokens: number | null;
  seed: number | null;
  extraConfig: Record<string, unknown>;
  jsonSchema: Record<string, unknown>;
}

export interface OpenRouterResult {
  id: string | null;
  model: string | null;
  output: MatchPredictionOutput;
  raw: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
  latencyMs: number;
}

export interface OpenRouterUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
}

export async function createMatchPrediction(
  request: OpenRouterRequest
): Promise<OpenRouterResult> {
  const config = getConfig();
  if (!config.OPENROUTER_API_KEY) {
    throw new AppError(
      "OPENROUTER_API_KEY is not configured",
      500,
      "OPENROUTER_NOT_CONFIGURED"
    );
  }

  const body: Record<string, unknown> = {
    model: request.model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt }
    ],
    stream: false,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "match_prediction",
        strict: true,
        schema: request.jsonSchema
      }
    },
    provider: {
      require_parameters: true,
      ...(asObject(request.extraConfig.provider) ?? {})
    }
  };

  const disabledParameters = new Set(
    stringArray(request.extraConfig.disabledParameters)
  );
  if (
    request.temperature !== null &&
    !disabledParameters.has("temperature")
  ) {
    body.temperature = request.temperature;
  }
  if (request.topP !== null && !disabledParameters.has("top_p")) {
    body.top_p = request.topP;
  }
  if (
    request.maxOutputTokens !== null &&
    !disabledParameters.has("max_tokens")
  ) {
    body.max_tokens = request.maxOutputTokens;
  }
  if (request.seed !== null && !disabledParameters.has("seed")) {
    body.seed = request.seed;
  }
  const reasoning = asObject(request.extraConfig.reasoning);
  if (reasoning && !disabledParameters.has("reasoning")) body.reasoning = reasoning;

  const startedAt = performance.now();
  const response = await fetch(`${config.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "HTTP-Referer": config.OPENROUTER_APP_URL,
      "X-Title": config.OPENROUTER_APP_NAME
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000)
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const raw = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      asObject(raw.error)?.message ?? `OpenRouter returned HTTP ${response.status}`;
    throw new AppError(String(message), 502, "OPENROUTER_ERROR", raw);
  }

  const choices = Array.isArray(raw.choices) ? raw.choices : [];
  const message = asObject(asObject(choices[0])?.message);
  const content = message?.content;
  if (typeof content !== "string") {
    throw new AppError(
      "OpenRouter response did not contain string content",
      502,
      "INVALID_OPENROUTER_RESPONSE",
      { raw }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError(
      "OpenRouter response was not valid JSON",
      502,
      "INVALID_MODEL_JSON",
      { raw, content }
    );
  }

  const normalized = normalizePredictionProbabilities(parsed);
  const validated = matchPredictionSchema.safeParse(normalized);
  if (!validated.success) {
    throw new AppError(
      "OpenRouter response did not match the prediction schema",
      502,
      "INVALID_MODEL_SCHEMA",
      {
        raw,
        parsed,
        issues: validated.error.issues
      }
    );
  }
  const output = validated.data;
  const usage = extractOpenRouterUsage(raw);

  return {
    id: typeof raw.id === "string" ? raw.id : null,
    model: typeof raw.model === "string" ? raw.model : null,
    output,
    raw,
    ...usage,
    latencyMs
  };
}

export function extractOpenRouterUsage(value: unknown): OpenRouterUsage {
  const root = asObject(value);
  const nestedRaw = asObject(root?.raw);
  const raw = nestedRaw ?? root;
  const usage = asObject(raw?.usage);
  const completionTokenDetails = asObject(usage?.completion_tokens_details);

  return {
    inputTokens: numberOrNull(usage?.prompt_tokens),
    outputTokens: numberOrNull(usage?.completion_tokens),
    reasoningTokens: numberOrNull(completionTokenDetails?.reasoning_tokens),
    totalTokens: numberOrNull(usage?.total_tokens),
    cost: numberOrNull(usage?.cost)
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
