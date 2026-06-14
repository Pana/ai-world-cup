import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { execute, queryRows } from "../db.js";

const slugParams = z.object({ slug: z.string().min(1) });
const idParams = z.object({ id: z.coerce.number().int().positive() });
const userIdParams = z.object({ publicId: z.string().uuid() });

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    await queryRows<RowDataPacket[]>("SELECT 1 AS ok");
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/api/v1/tournaments", async () => {
    return queryRows<RowDataPacket[]>(
      `SELECT id, name, edition, slug, host_countries AS hostCountries,
              starts_at AS startsAt, ends_at AS endsAt, team_count AS teamCount,
              match_count AS matchCount, status
       FROM tournaments
       ORDER BY starts_at DESC`
    );
  });

  app.get("/api/v1/tournaments/:slug/matches", async (request) => {
    const { slug } = slugParams.parse(request.params);
    const query = z
      .object({
        status: z
          .enum(["scheduled", "live", "finished", "postponed", "cancelled"])
          .optional(),
        stage: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(104)
      })
      .parse(request.query);
    const conditions = ["t.slug = ?"];
    const values: unknown[] = [slug];
    if (query.status) {
      conditions.push("m.status = ?");
      values.push(query.status);
    }
    if (query.stage) {
      conditions.push("s.code = ?");
      values.push(query.stage);
    }
    return queryRows<RowDataPacket[]>(
      `SELECT
         m.id, m.match_number AS matchNumber, m.external_id AS externalId,
         m.scheduled_at AS scheduledAt, m.status, s.code AS stageCode,
         s.name AS stageName, s.stage_type AS stageType,
         g.code AS groupCode, m.venue_name AS venueName, m.host_city AS hostCity,
         ht.id AS homeTeamId, ht.name AS homeTeamName, ht.code AS homeTeamCode,
         ht.flag_url AS homeTeamFlag,
         at.id AS awayTeamId, at.name AS awayTeamName, at.code AS awayTeamCode,
         at.flag_url AS awayTeamFlag,
         m.home_placeholder AS homePlaceholder,
         m.away_placeholder AS awayPlaceholder,
         m.home_score_90 AS homeScore90, m.away_score_90 AS awayScore90,
         m.home_score_after_extra_time AS homeScoreAfterExtraTime,
         m.away_score_after_extra_time AS awayScoreAfterExtraTime,
         m.home_penalty_score AS homePenaltyScore,
         m.away_penalty_score AS awayPenaltyScore,
         m.winner_team_id AS winnerTeamId, m.result_type AS resultType
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       JOIN stages s ON s.id = m.stage_id
       LEFT JOIN tournament_groups g ON g.id = m.group_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY m.scheduled_at, m.match_number
       LIMIT ${query.limit}`,
      values
    );
  });

  app.get("/api/v1/matches/:id", async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const matches = await queryRows<RowDataPacket[]>(
      `SELECT
         m.id, m.match_number AS matchNumber, m.external_id AS externalId,
         m.scheduled_at AS scheduledAt, m.status,
         m.home_placeholder AS homePlaceholder, m.away_placeholder AS awayPlaceholder,
         m.venue_name AS venueName, m.host_city AS hostCity,
         m.home_score_90 AS homeScore90, m.away_score_90 AS awayScore90,
         m.home_score_after_extra_time AS homeScoreAfterExtraTime,
         m.away_score_after_extra_time AS awayScoreAfterExtraTime,
         m.home_penalty_score AS homePenaltyScore, m.away_penalty_score AS awayPenaltyScore,
         m.winner_team_id AS winnerTeamId, m.result_type AS resultType,
         s.name AS stageName, s.code AS stageCode, s.stage_type AS stageType,
         g.code AS groupCode,
         ht.id AS homeTeamId,
         ht.name AS homeTeamName, ht.code AS homeTeamCode, ht.flag_url AS homeTeamFlag,
         at.id AS awayTeamId,
         at.name AS awayTeamName, at.code AS awayTeamCode, at.flag_url AS awayTeamFlag,
         pv.version_key AS promptVersion
       FROM matches m
       JOIN stages s ON s.id = m.stage_id
       LEFT JOIN tournament_groups g ON g.id = m.group_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN match_prompt_versions mpv ON mpv.match_id = m.id AND mpv.is_current = 1
       LEFT JOIN prompt_versions pv ON pv.id = mpv.prompt_version_id
       WHERE m.id = ?`,
      [id]
    );
    if (!matches[0]) return reply.notFound("Match not found");

    const predictions = await queryRows<RowDataPacket[]>(
      `SELECT
         p.id, am.name AS modelName, am.slug AS modelSlug, am.avatar_url AS modelIcon,
         p.predicted_result AS predictedResult,
         p.predicted_home_score AS predictedHomeScore,
         p.predicted_away_score AS predictedAwayScore,
         p.predicted_winner_team_id AS predictedWinnerTeamId,
         p.predicted_decision_method AS predictedDecisionMethod,
         p.home_win_probability AS homeWinProbability,
         p.draw_probability AS drawProbability,
         p.away_win_probability AS awayWinProbability,
         p.confidence, p.reasoning, p.highlight_quote AS highlightQuote,
         p.key_factors AS keyFactors, p.uncertainties,
         p.predicted_at AS predictedAt,
         COALESCE(SUM(ps.points), 0) AS points
       FROM predictions p
       JOIN ai_models am ON am.id = p.ai_model_id
       LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
       WHERE p.match_id = ? AND p.status = 'published'
       GROUP BY p.id, am.id
       ORDER BY points DESC, am.name`,
      [id]
    );

    return { match: matches[0], predictions };
  });

  app.get("/api/v1/tournaments/:slug/leaderboard", async (request) => {
    const { slug } = slugParams.parse(request.params);
    return queryRows<RowDataPacket[]>(
      `SELECT
         am.id, am.name, am.slug, am.provider, am.avatar_url AS icon,
         COALESCE(SUM(ps.points), 0) AS totalPoints,
         COUNT(DISTINCT p.match_id) AS submittedMatches,
         SUM(CASE WHEN sr.code = 'EXACT_SCORE' AND ps.is_hit = 1 THEN 1 ELSE 0 END)
           AS exactScoreHits,
         SUM(CASE WHEN sr.code = 'GOAL_DIFF' AND ps.is_hit = 1 THEN 1 ELSE 0 END)
           AS goalDifferenceHits,
         SUM(CASE WHEN sr.code = 'RESULT' AND ps.is_hit = 1 THEN 1 ELSE 0 END)
           AS resultHits,
         SUM(CASE WHEN sr.code = 'ADVANCING_TEAM' AND ps.is_hit = 1 THEN 1 ELSE 0 END)
           AS advancingTeamHits,
         ROUND(
           SUM(CASE WHEN sr.code = 'RESULT' AND ps.is_hit = 1 THEN 1 ELSE 0 END)
           / NULLIF(SUM(CASE WHEN sr.code = 'RESULT' THEN 1 ELSE 0 END), 0),
           4
         ) AS resultAccuracy
       FROM ai_models am
       JOIN model_configs mc ON mc.ai_model_id = am.id AND mc.is_active = 1
       JOIN tournaments t ON t.id = mc.tournament_id AND t.slug = ?
       LEFT JOIN predictions p ON p.ai_model_id = am.id AND p.tournament_id = t.id
       LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
       LEFT JOIN scoring_rules sr ON sr.id = ps.scoring_rule_id
       WHERE am.is_active = 1
       GROUP BY am.id
       ORDER BY totalPoints DESC, exactScoreHits DESC, goalDifferenceHits DESC,
                resultAccuracy DESC, advancingTeamHits DESC, am.name`,
      [slug]
    );
  });

  app.get("/api/v1/models", async () => {
    return queryRows<RowDataPacket[]>(
      `SELECT
         id, provider, name, model_key AS modelKey, version, slug,
         avatar_url AS icon, personality,
         is_reasoning_enabled AS reasoningEnabled,
         reasoning_effort AS reasoningEffort, is_active AS active
       FROM ai_models
       ORDER BY name`
    );
  });

  app.get("/api/v1/models/:slug", async (request, reply) => {
    const { slug } = slugParams.parse(request.params);
    const models = await queryRows<RowDataPacket[]>(
      `SELECT
         id, provider, name, model_key AS modelKey, version, slug,
         avatar_url AS icon, description, personality,
         is_reasoning_enabled AS reasoningEnabled,
         reasoning_effort AS reasoningEffort, is_active AS active
       FROM ai_models WHERE slug = ?`,
      [slug]
    );
    if (!models[0]) return reply.notFound("Model not found");

    const history = await queryRows<RowDataPacket[]>(
      `SELECT
         m.id AS matchId, m.match_number AS matchNumber, m.scheduled_at AS scheduledAt,
         ht.name AS homeTeam, at.name AS awayTeam,
         p.predicted_home_score AS predictedHomeScore,
         p.predicted_away_score AS predictedAwayScore,
         m.home_score_90 AS actualHomeScore, m.away_score_90 AS actualAwayScore,
         COALESCE(SUM(ps.points), 0) AS points,
         pv.version_key AS promptVersion
       FROM predictions p
       JOIN ai_models am ON am.id = p.ai_model_id
       JOIN matches m ON m.id = p.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
       JOIN prediction_runs pr ON pr.id = p.prediction_run_id
       JOIN prompt_versions pv ON pv.id = pr.prompt_version_id
       LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
       WHERE am.slug = ?
       GROUP BY p.id, m.id, ht.id, at.id, pv.id
       ORDER BY m.scheduled_at`,
      [slug]
    );
    return { model: models[0], history };
  });

  app.get("/api/v1/tournaments/:slug/prompts", async (request) => {
    const { slug } = slugParams.parse(request.params);
    return queryRows<RowDataPacket[]>(
      `SELECT
         pv.id, pv.prompt_type AS promptType, pv.name, pv.version,
         pv.version_key AS versionKey, pv.schema_version AS schemaVersion,
         pv.change_summary AS changeSummary, pv.change_reason AS changeReason,
         pv.status, pv.published_at AS publishedAt,
         pv.system_prompt AS systemPrompt,
         pv.user_prompt_template AS userPromptTemplate,
         pv.output_json_schema AS outputJsonSchema,
         COUNT(DISTINCT mpv.match_id) AS matchCount
       FROM prompt_versions pv
       JOIN tournaments t ON t.id = pv.tournament_id
       LEFT JOIN match_prompt_versions mpv ON mpv.prompt_version_id = pv.id
       WHERE t.slug = ?
       GROUP BY pv.id
       ORDER BY pv.prompt_type, pv.version`,
      [slug]
    );
  });

  app.get("/api/v1/tournaments/:slug/stages", async (request) => {
    const { slug } = slugParams.parse(request.params);
    return queryRows<RowDataPacket[]>(
      `SELECT s.id, s.name, s.code, s.stage_type AS stageType, s.sequence,
              COUNT(m.id) AS matchCount
       FROM stages s
       JOIN tournaments t ON t.id = s.tournament_id
       LEFT JOIN matches m ON m.stage_id = s.id
       WHERE t.slug = ?
       GROUP BY s.id
       ORDER BY s.sequence`,
      [slug]
    );
  });

  app.get("/api/v1/tournaments/:slug/debate", async (request) => {
    const { slug } = slugParams.parse(request.params);
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT p.id, p.match_id AS matchId, am.name AS modelName,
              am.slug AS modelSlug, am.personality,
              p.predicted_home_score AS predictedHomeScore,
              p.predicted_away_score AS predictedAwayScore,
              COALESCE(p.highlight_quote, p.reasoning) AS statement,
              ht.name AS homeTeam, at.name AS awayTeam
       FROM predictions p
       JOIN tournaments t ON t.id = p.tournament_id
       JOIN ai_models am ON am.id = p.ai_model_id
       JOIN matches m ON m.id = p.match_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE t.slug = ? AND p.status = 'published'
       ORDER BY m.scheduled_at DESC, p.confidence DESC
       LIMIT 12`,
      [slug]
    );
    return rows;
  });

  app.post("/api/v1/users", async (request) => {
    const body = z.object({
      publicId: z.string().uuid(),
      displayName: z.string().trim().min(2).max(40).default("World Cup Fan"),
      trustedModelId: z.coerce.number().int().positive().nullable().optional()
    }).parse(request.body);
    await execute(
      `INSERT INTO user_profiles (public_id, display_name, trusted_model_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         trusted_model_id = VALUES(trusted_model_id)`,
      [body.publicId, body.displayName, body.trustedModelId ?? null]
    );
    const rows = await queryRows<RowDataPacket[]>(
      `SELECT up.public_id AS publicId, up.display_name AS displayName,
              up.trusted_model_id AS trustedModelId, am.name AS trustedModelName,
              COALESCE(SUM(ump.points), 0) AS points,
              COUNT(ump.id) AS predictions
       FROM user_profiles up
       LEFT JOIN ai_models am ON am.id = up.trusted_model_id
       LEFT JOIN user_match_predictions ump ON ump.user_id = up.id
       WHERE up.public_id = ?
       GROUP BY up.id, am.id`,
      [body.publicId]
    );
    return rows[0];
  });

  app.post("/api/v1/users/:publicId/predictions", async (request, reply) => {
    const { publicId } = userIdParams.parse(request.params);
    const body = z.object({
      matchId: z.coerce.number().int().positive(),
      homeScore: z.coerce.number().int().min(0).max(30),
      awayScore: z.coerce.number().int().min(0).max(30)
    }).parse(request.body);
    const users = await queryRows<(RowDataPacket & { id: number })[]>(
      "SELECT id FROM user_profiles WHERE public_id = ?",
      [publicId]
    );
    if (!users[0]) return reply.notFound("User not found");
    const matches = await queryRows<(RowDataPacket & { status: string; scheduledAt: Date })[]>(
      "SELECT status, scheduled_at AS scheduledAt FROM matches WHERE id = ?",
      [body.matchId]
    );
    if (!matches[0]) return reply.notFound("Match not found");
    if (matches[0].status !== "scheduled" || new Date(matches[0].scheduledAt) <= new Date()) {
      return reply.conflict("Predictions are locked for this match");
    }
    await execute(
      `INSERT INTO user_match_predictions
        (user_id, match_id, predicted_home_score, predicted_away_score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         predicted_home_score = VALUES(predicted_home_score),
         predicted_away_score = VALUES(predicted_away_score),
         submitted_at = CURRENT_TIMESTAMP(3)`,
      [users[0].id, body.matchId, body.homeScore, body.awayScore]
    );
    return { ok: true };
  });

  app.get("/api/v1/users/leaderboard", async () => {
    return queryRows<RowDataPacket[]>(
      `SELECT up.public_id AS publicId, up.display_name AS displayName,
              am.name AS trustedModelName, am.slug AS trustedModelSlug,
              COALESCE(SUM(ump.points), 0) AS points,
              COUNT(ump.id) AS predictions
       FROM user_profiles up
       LEFT JOIN ai_models am ON am.id = up.trusted_model_id
       LEFT JOIN user_match_predictions ump ON ump.user_id = up.id
       GROUP BY up.id, am.id
       ORDER BY points DESC, predictions DESC, up.created_at
       LIMIT 100`
    );
  });
}
