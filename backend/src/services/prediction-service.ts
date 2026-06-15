import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, queryRows, withTransaction } from "../db.js";
import {
  derivePredictedResult,
  validateKnockoutPrediction
} from "../domain/prediction.js";
import { createMatchPrediction } from "../integrations/openrouter-client.js";
import { AppError, errorMessage } from "../lib/errors.js";
import { hashJson } from "../lib/hash.js";
import { toMysqlDateTime } from "../lib/time.js";

interface DueMatchRow extends RowDataPacket {
  id: number;
  tournament_id: number;
  match_number: number;
  stage_type: "group" | "knockout";
  stage_name: string;
  scheduled_at: Date;
  venue_name: string | null;
  host_city: string | null;
  home_team_id: number;
  home_team_name: string;
  home_team_code: string;
  home_fifa_ranking: number | null;
  home_elo_rating: number | null;
  away_team_id: number;
  away_team_name: string;
  away_team_code: string;
  away_fifa_ranking: number | null;
  away_elo_rating: number | null;
}

interface PromptRow extends RowDataPacket {
  id: number;
  system_prompt: string;
  user_prompt_template: string;
  output_json_schema: string | object;
  version_key: string;
}

interface AssignmentRow extends RowDataPacket {
  id: number;
  prompt_version_id: number;
  data_snapshot: string | object;
  data_snapshot_hash: string;
}

interface ModelConfigRow extends RowDataPacket {
  config_id: number;
  ai_model_id: number;
  model_key: string;
  temperature: number | null;
  top_p: number | null;
  max_output_tokens: number | null;
  seed: number | null;
  config: string | object | null;
}

export interface PredictionRunSummary {
  matches: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export async function runDuePredictions(options: {
  leadHours: number;
  matchId?: number;
}): Promise<PredictionRunSummary> {
  const matches = await findDueMatches(options);
  const summary: PredictionRunSummary = {
    matches: matches.length,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  };

  for (const match of matches) {
    const assignment = await ensurePromptAssignment(match);
    const models = await loadActiveModelConfigs(match.tournament_id);
    for (const model of models) {
      const result = await runOnePrediction(match, assignment, model);
      summary.attempted += result === "skipped" ? 0 : 1;
      summary[result] += 1;
    }
  }
  return summary;
}

async function findDueMatches(options: {
  leadHours: number;
  matchId?: number;
}): Promise<DueMatchRow[]> {
  const values: unknown[] = [];
  let where: string;

  if (options.matchId) {
    where = "m.id = ?";
    values.push(options.matchId);
  } else {
    where = `
      m.status = 'scheduled'
      AND m.scheduled_at <= DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? HOUR)
      AND m.scheduled_at > UTC_TIMESTAMP(3)
    `;
    values.push(options.leadHours);
  }

  return queryRows<DueMatchRow[]>(
    `SELECT
       m.id, m.tournament_id, m.match_number, m.scheduled_at,
       m.venue_name, m.host_city, s.stage_type, s.name AS stage_name,
       ht.id AS home_team_id, ht.name AS home_team_name, ht.code AS home_team_code,
       ht.fifa_ranking AS home_fifa_ranking, ht.elo_rating AS home_elo_rating,
       at.id AS away_team_id, at.name AS away_team_name, at.code AS away_team_code,
       at.fifa_ranking AS away_fifa_ranking, at.elo_rating AS away_elo_rating
     FROM matches m
     JOIN stages s ON s.id = m.stage_id
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE ${where}
     ORDER BY m.scheduled_at, m.match_number`,
    values
  );
}

async function ensurePromptAssignment(match: DueMatchRow): Promise<AssignmentRow> {
  const current = await queryRows<AssignmentRow[]>(
    `SELECT id, prompt_version_id, data_snapshot, data_snapshot_hash
     FROM match_prompt_versions
     WHERE match_id = ? AND is_current = 1`,
    [match.id]
  );
  if (current[0]) {
    if (typeof current[0].data_snapshot === "string") {
      current[0].data_snapshot = JSON.parse(current[0].data_snapshot) as object;
    }
    return current[0];
  }

  const prompts = await queryRows<PromptRow[]>(
    `SELECT id, system_prompt, user_prompt_template, output_json_schema, version_key
     FROM prompt_versions
     WHERE tournament_id = ? AND prompt_type = 'match' AND status = 'published'
     ORDER BY version DESC
     LIMIT 1`,
    [match.tournament_id]
  );
  const prompt = prompts[0];
  if (!prompt) throw new Error(`No published match prompt for tournament ${match.tournament_id}`);

  const snapshot = buildMatchSnapshot(match);
  const snapshotHash = hashJson(snapshot);
  const result = await execute(
    `INSERT INTO match_prompt_versions
       (match_id, prompt_version_id, assignment_version, data_snapshot,
        data_snapshot_hash, data_cutoff_at, locked_at, status, is_current)
     VALUES (?, ?, 1, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 'locked', 1)`,
    [match.id, prompt.id, JSON.stringify(snapshot), snapshotHash]
  ).catch(async (error: unknown) => {
    if (!isDuplicateEntry(error)) throw error;
    const rows = await queryRows<AssignmentRow[]>(
      `SELECT id, prompt_version_id, data_snapshot, data_snapshot_hash
       FROM match_prompt_versions
       WHERE match_id = ? AND is_current = 1`,
      [match.id]
    );
    if (!rows[0]) throw error;
    return { insertId: Number(rows[0].id) } as ResultSetHeader;
  });

  const winner = await queryRows<AssignmentRow[]>(
    `SELECT id, prompt_version_id, data_snapshot, data_snapshot_hash
     FROM match_prompt_versions WHERE id = ?`,
    [result.insertId]
  );
  if (winner[0]) {
    if (typeof winner[0].data_snapshot === "string") {
      winner[0].data_snapshot = JSON.parse(winner[0].data_snapshot) as object;
    }
    return winner[0];
  }

  return {
    id: result.insertId,
    prompt_version_id: prompt.id,
    data_snapshot: snapshot,
    data_snapshot_hash: snapshotHash
  } as AssignmentRow;
}

function buildMatchSnapshot(match: DueMatchRow): Record<string, unknown> {
  return {
    match: {
      match_id: match.id,
      match_number: match.match_number,
      stage: match.stage_name,
      stage_type: match.stage_type,
      scheduled_at: new Date(match.scheduled_at).toISOString(),
      venue_name: match.venue_name,
      host_city: match.host_city,
      home_team: {
        id: match.home_team_id,
        name: match.home_team_name,
        code: match.home_team_code,
        fifa_ranking: match.home_fifa_ranking,
        elo_rating: match.home_elo_rating
      },
      away_team: {
        id: match.away_team_id,
        name: match.away_team_name,
        code: match.away_team_code,
        fifa_ranking: match.away_fifa_ranking,
        elo_rating: match.away_elo_rating
      }
    },
    data_cutoff_at: new Date().toISOString(),
    notice:
      "Only fields present in this snapshot may be used. Missing data must be treated as unknown."
  };
}

async function loadActiveModelConfigs(
  tournamentId: number
): Promise<ModelConfigRow[]> {
  const rows = await queryRows<ModelConfigRow[]>(
    `SELECT
       mc.id AS config_id, am.id AS ai_model_id, am.model_key,
       mc.temperature, mc.top_p, mc.max_output_tokens, mc.seed, mc.config
     FROM model_configs mc
     JOIN ai_models am ON am.id = mc.ai_model_id
     WHERE mc.tournament_id = ?
       AND mc.is_active = 1
       AND am.is_active = 1
       AND am.model_key NOT LIKE 'unconfigured/%'
     ORDER BY am.id`,
    [tournamentId]
  );
  for (const row of rows) {
    if (typeof row.config === "string") {
      row.config = JSON.parse(row.config) as object;
    }
  }
  return rows;
}

async function runOnePrediction(
  match: DueMatchRow,
  assignment: AssignmentRow,
  model: ModelConfigRow
): Promise<"succeeded" | "failed" | "skipped"> {
  const existing = await queryRows<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM predictions WHERE match_id = ? AND ai_model_id = ?",
    [match.id, model.ai_model_id]
  );
  if (existing.length > 0) return "skipped";

  const prompts = await queryRows<PromptRow[]>(
    `SELECT id, system_prompt, user_prompt_template, output_json_schema, version_key
     FROM prompt_versions WHERE id = ?`,
    [assignment.prompt_version_id]
  );
  const prompt = prompts[0];
  if (!prompt) throw new Error(`Prompt ${assignment.prompt_version_id} not found`);

  const snapshot =
    typeof assignment.data_snapshot === "string"
      ? JSON.parse(assignment.data_snapshot)
      : assignment.data_snapshot;
  const renderedUserPrompt = prompt.user_prompt_template.replace(
    "{{MATCH_DATA_JSON}}",
    JSON.stringify(snapshot, null, 2)
  );

  const priorRuns = await queryRows<(RowDataPacket & { attempts: number })[]>(
    `SELECT COUNT(*) AS attempts
     FROM prediction_runs
     WHERE match_id = ? AND model_config_id = ? AND prompt_version_id = ?`,
    [match.id, model.config_id, prompt.id]
  );
  const attempt = Number(priorRuns[0]?.attempts ?? 0) + 1;
  const idempotencyKey =
    `match:${match.id}:model-config:${model.config_id}:prompt:${prompt.id}:attempt:${attempt}`;
  const requestPayload = {
    model: model.model_key,
    temperature: model.temperature,
    top_p: model.top_p,
    max_tokens: model.max_output_tokens,
    seed: model.seed,
    prompt_version: prompt.version_key,
    data_snapshot_hash: assignment.data_snapshot_hash
  };

  let run: ResultSetHeader;
  try {
    run = await execute(
      `INSERT INTO prediction_runs
      (model_config_id, prompt_version_id, match_prompt_version_id, match_id,
       prediction_type, idempotency_key, requested_model_key,
       rendered_system_prompt, rendered_user_prompt, data_snapshot_hash,
       request_payload, status, attempt_number, started_at)
     VALUES (?, ?, ?, ?, 'match', ?, ?, ?, ?, ?, ?, 'running', ?, UTC_TIMESTAMP(3))`,
    [
      model.config_id,
      prompt.id,
      assignment.id,
      match.id,
      idempotencyKey,
      model.model_key,
      prompt.system_prompt,
      renderedUserPrompt,
      assignment.data_snapshot_hash,
      JSON.stringify(requestPayload),
      attempt
      ]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) return "skipped";
    throw error;
  }

  try {
    const response = await createMatchPrediction({
      model: model.model_key,
      systemPrompt: prompt.system_prompt,
      userPrompt: renderedUserPrompt,
      temperature: model.temperature,
      topP: model.top_p,
      maxOutputTokens: model.max_output_tokens,
      seed: model.seed,
      extraConfig: asObject(model.config),
      jsonSchema: asObject(
        typeof prompt.output_json_schema === "string"
          ? JSON.parse(prompt.output_json_schema)
          : prompt.output_json_schema
      )
    });

    validateKnockoutPrediction(
      response.output,
      match.stage_type,
      match.home_team_id,
      match.away_team_id
    );
    if (Number(response.output.match_id) !== Number(match.id)) {
      throw new Error(
        `Model returned match_id ${String(response.output.match_id)} for match ${match.id}`
      );
    }

    await withTransaction(async (connection) => {
      const output = response.output;
      const homeScore = output.score_90_minutes.home;
      const awayScore = output.score_90_minutes.away;
      await connection.execute(
        `INSERT INTO predictions
          (tournament_id, match_id, ai_model_id, model_config_id,
           prediction_run_id, predicted_result, predicted_home_score,
           predicted_away_score, predicted_goal_diff, predicted_winner_team_id,
           predicted_decision_method, home_win_probability, draw_probability,
           away_win_probability, confidence, reasoning, highlight_quote,
           key_factors, uncertainties, predicted_at, locked_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 'published')`,
        [
          match.tournament_id,
          match.id,
          model.ai_model_id,
          model.config_id,
          run.insertId,
          derivePredictedResult(homeScore, awayScore),
          homeScore,
          awayScore,
          homeScore - awayScore,
          output.knockout_prediction.advancing_team_id === null
            ? null
            : Number(output.knockout_prediction.advancing_team_id),
          output.knockout_prediction.decision_method,
          output.probabilities.home_win / 100,
          output.probabilities.draw / 100,
          output.probabilities.away_win / 100,
          output.confidence / 100,
          output.public_summary,
          output.public_summary,
          JSON.stringify(output.key_factors),
          JSON.stringify(output.uncertainties)
        ]
      );
      await connection.execute(
        `UPDATE prediction_runs
         SET gateway_request_id = ?, resolved_model_key = ?, raw_response = ?,
             status = 'succeeded', input_tokens = ?, output_tokens = ?,
             cost_amount = ?, cost_currency = 'USD', latency_ms = ?,
             finished_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [
          response.id,
          response.model,
          JSON.stringify(response.raw),
          response.inputTokens,
          response.outputTokens,
          response.cost,
          response.latencyMs,
          run.insertId
        ]
      );
    });
    return "succeeded";
  } catch (error) {
    const rawResponse =
      error instanceof AppError && error.details !== undefined
        ? JSON.stringify(error.details)
        : null;
    await execute(
      `UPDATE prediction_runs
       SET status = 'failed', error_code = ?, error_message = ?,
           raw_response = ?,
           finished_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [
        error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage(error).slice(0, 65_535),
        rawResponse,
        run.insertId
      ]
    );
    return "failed";
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}
