import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { execute, queryRows } from "../db.js";
import {
  defaultSystemPrompt,
  defaultUserPromptTemplate,
  matchPredictionJsonSchema
} from "../domain/prediction.js";
import { hashJson, sha256 } from "../lib/hash.js";
import { toMysqlDateTime } from "../lib/time.js";

const modelCatalogSchema = z.array(
  z.object({
    name: z.string(),
    provider: z.string(),
    slug: z.string(),
    modelKey: z.string(),
    version: z.string(),
    avatarUrl: z.string(),
    reasoning: z.boolean(),
    reasoningEffort: z.string().nullable().optional(),
    active: z.boolean()
  })
);

const flagManifestSchema = z.array(
  z.object({
    name: z.string(),
    fifaCode: z.string().length(3),
    flagCode: z.string(),
    icon: z.string()
  })
);

const teamListSchema = z.array(
  z.object({
    name: z.string(),
    continent: z.string()
  })
);

const confederationMap: Record<string, string> = {
  Asia: "AFC",
  Africa: "CAF",
  Europe: "UEFA",
  "South America": "CONMEBOL",
  CONCACAF: "CONCACAF",
  Oceania: "OFC"
};

export async function seedDatabase(): Promise<Record<string, number>> {
  const tournamentId = await seedTournament();
  const teamCount = await seedTeams();
  const modelCount = await seedModels(tournamentId);
  const promptCount = await seedPrompt(tournamentId);
  const scoringRuleCount = await seedScoringRules(tournamentId);

  return { tournamentId, teamCount, modelCount, promptCount, scoringRuleCount };
}

async function seedTournament(): Promise<number> {
  await execute(
    `INSERT INTO tournaments
      (name, edition, slug, host_countries, starts_at, ends_at, team_count, match_count, status, rules)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       host_countries = VALUES(host_countries),
       starts_at = VALUES(starts_at),
       ends_at = VALUES(ends_at),
       team_count = VALUES(team_count),
       match_count = VALUES(match_count),
       rules = VALUES(rules)`,
    [
      "FIFA World Cup",
      "2026",
      "world-cup-2026",
      JSON.stringify(["US", "CA", "MX"]),
      "2026-06-11",
      "2026-07-19",
      48,
      104,
      "upcoming",
      JSON.stringify({ groupCount: 12, knockoutSize: 32 })
    ]
  );
  const rows = await queryRows<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM tournaments WHERE slug = ?",
    ["world-cup-2026"]
  );
  return Number(rows[0]?.id);
}

async function seedTeams(): Promise<number> {
  const [flagsRaw, teamsRaw] = await Promise.all([
    readFile(path.resolve("../assets/flags/manifest.json"), "utf8"),
    readFile(path.resolve("../teams.json"), "utf8")
  ]);
  const flags = flagManifestSchema.parse(JSON.parse(flagsRaw));
  const teams = teamListSchema.parse(JSON.parse(teamsRaw));
  const continentByName = new Map(teams.map((team) => [team.name, team.continent]));

  for (const flag of flags) {
    const continent = continentByName.get(flag.name);
    if (!continent) throw new Error(`Missing continent for ${flag.name}`);
    await execute(
      `INSERT INTO teams
        (name, short_name, code, country_code, confederation, flag_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         short_name = VALUES(short_name),
         country_code = VALUES(country_code),
         confederation = VALUES(confederation),
         flag_url = VALUES(flag_url)`,
      [
        flag.name,
        flag.name,
        flag.fifaCode,
        flag.flagCode,
        confederationMap[continent] ?? continent,
        flag.icon
      ]
    );
  }
  return flags.length;
}

async function seedModels(tournamentId: number): Promise<number> {
  const raw = await readFile(path.resolve("data/models.example.json"), "utf8");
  const models = modelCatalogSchema.parse(JSON.parse(raw));

  for (const model of models) {
    await execute(
      `INSERT INTO ai_models
        (provider, name, model_key, version, slug, avatar_url,
         is_reasoning_enabled, reasoning_effort, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         provider = VALUES(provider),
         name = VALUES(name),
         avatar_url = VALUES(avatar_url),
         is_reasoning_enabled = VALUES(is_reasoning_enabled),
         reasoning_effort = VALUES(reasoning_effort)`,
      [
        model.provider,
        model.name,
        model.modelKey || `unconfigured/${model.slug}`,
        model.version,
        model.slug,
        model.avatarUrl,
        model.reasoning ? 1 : 0,
        model.reasoningEffort ?? null,
        model.active ? 1 : 0
      ]
    );

    if (model.active && model.modelKey) {
      const rows = await queryRows<(RowDataPacket & { id: number })[]>(
        "SELECT id FROM ai_models WHERE slug = ?",
        [model.slug]
      );
      const modelId = Number(rows[0]?.id);
      await execute(
        `UPDATE model_configs
         SET is_active = 0
         WHERE ai_model_id = ? AND tournament_id = ?`,
        [modelId, tournamentId]
      );
      await execute(
        `INSERT INTO model_configs
          (ai_model_id, tournament_id, version, temperature, top_p,
           max_output_tokens, seed, config, is_active, published_at)
         VALUES (?, ?, 1, 0.2, 1, 2000, 20260611, ?, 1, CURRENT_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE is_active = 1`,
        [
          modelId,
          tournamentId,
          JSON.stringify({ provider: { require_parameters: true } })
        ]
      );
    }
  }
  return models.length;
}

async function seedPrompt(tournamentId: number): Promise<number> {
  const contentHash = sha256(
    `${defaultSystemPrompt}\n${defaultUserPromptTemplate}\n${hashJson(matchPredictionJsonSchema)}`
  );
  await execute(
    `INSERT INTO prompt_versions
      (tournament_id, prompt_type, name, version, version_key, system_prompt,
       user_prompt_template, output_json_schema, schema_version, change_summary,
       change_reason, content_hash, status, published_at)
     VALUES (?, 'match', 'Match Prediction V1', 1, 'match-prediction-v1',
       ?, ?, ?, '1.0', 'Initial fair prediction prompt',
       'Initial production version', ?, 'published', CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE version_key = version_key`,
    [
      tournamentId,
      defaultSystemPrompt,
      defaultUserPromptTemplate,
      JSON.stringify(matchPredictionJsonSchema),
      contentHash
    ]
  );
  return 1;
}

async function seedScoringRules(tournamentId: number): Promise<number> {
  const rules = [
    ["RESULT", "90-minute result", "match", 2, 10],
    ["GOAL_DIFF", "90-minute goal difference", "match", 1, 20],
    ["EXACT_SCORE", "90-minute exact score", "match", 2, 30],
    ["ADVANCING_TEAM", "Knockout advancing team", "match", 2, 40],
    ["EXTRA_TIME", "Match enters extra time", "match", 1, 50],
    ["PENALTIES", "Match enters penalties", "match", 1, 60],
    ["CHAMPION", "Champion exact position", "tournament_podium", 30, 70],
    ["RUNNER_UP", "Runner-up exact position", "tournament_podium", 20, 80],
    ["THIRD_PLACE", "Third place exact position", "tournament_podium", 10, 90],
    ["PODIUM_WRONG_POSITION", "Podium team wrong position", "tournament_podium", 5, 100]
  ] as const;

  for (const [code, name, type, points, priority] of rules) {
    await execute(
      `INSERT INTO scoring_rules
        (tournament_id, code, name, prediction_type, points, priority,
         is_stackable, conditions, effective_from, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         points = VALUES(points),
         priority = VALUES(priority),
         is_active = 1`,
      [
        tournamentId,
        code,
        name,
        type,
        points,
        priority,
        JSON.stringify({ version: 1 }),
        toMysqlDateTime(new Date("2026-01-01T00:00:00.000Z"))
      ]
    );
  }
  return rules.length;
}
