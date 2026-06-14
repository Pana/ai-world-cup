import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows } from "../db.js";
import {
  calculateMatchRuleHits,
  type MatchRuleCode
} from "../domain/scoring.js";

interface PredictionRow extends RowDataPacket {
  prediction_id: number;
  tournament_id: number;
  match_id: number;
  ai_model_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner_team_id: number | null;
  predicted_decision_method: "regular_time" | "extra_time" | "penalties" | null;
  home_score_90: number;
  away_score_90: number;
  winner_team_id: number | null;
  result_type: "regular_time" | "extra_time" | "penalties";
}

interface RuleRow extends RowDataPacket {
  id: number;
  code: MatchRuleCode;
  points: number;
}

export async function calculateFinishedMatchScores(options: {
  matchId?: number;
} = {}): Promise<{ predictions: number; scoreRows: number }> {
  const values: unknown[] = [];
  const matchFilter = options.matchId ? "AND m.id = ?" : "";
  if (options.matchId) values.push(options.matchId);

  const predictions = await queryRows<PredictionRow[]>(
    `SELECT
       p.id AS prediction_id, p.tournament_id, p.match_id, p.ai_model_id,
       p.predicted_home_score, p.predicted_away_score,
       p.predicted_winner_team_id, p.predicted_decision_method,
       m.home_score_90, m.away_score_90, m.winner_team_id, m.result_type
     FROM predictions p
     JOIN matches m ON m.id = p.match_id
     WHERE p.status = 'published'
       AND m.status = 'finished'
       AND m.home_score_90 IS NOT NULL
       AND m.away_score_90 IS NOT NULL
       AND m.result_type IS NOT NULL
       ${matchFilter}`,
    values
  );

  const rulesByTournament = new Map<number, Map<MatchRuleCode, RuleRow>>();
  let scoreRows = 0;

  for (const prediction of predictions) {
    let rules = rulesByTournament.get(prediction.tournament_id);
    if (!rules) {
      const rows = await queryRows<RuleRow[]>(
        `SELECT id, code, points
         FROM scoring_rules
         WHERE tournament_id = ?
           AND prediction_type = 'match'
           AND is_active = 1
           AND effective_from <= UTC_TIMESTAMP(3)
           AND (effective_to IS NULL OR effective_to > UTC_TIMESTAMP(3))`,
        [prediction.tournament_id]
      );
      rules = new Map(rows.map((row) => [row.code, row]));
      rulesByTournament.set(prediction.tournament_id, rules);
    }

    const hits = calculateMatchRuleHits(
      {
        predictedHomeScore: prediction.predicted_home_score,
        predictedAwayScore: prediction.predicted_away_score,
        predictedWinnerTeamId: prediction.predicted_winner_team_id,
        predictedDecisionMethod: prediction.predicted_decision_method
      },
      {
        homeScore90: prediction.home_score_90,
        awayScore90: prediction.away_score_90,
        winnerTeamId: prediction.winner_team_id,
        resultType: prediction.result_type
      }
    );

    for (const hit of hits) {
      const rule = rules.get(hit.code);
      if (!rule) continue;
      const points = hit.hit ? Number(rule.points) : 0;
      const idempotencyKey =
        `prediction:${prediction.prediction_id}:rule:${rule.id}`;
      await execute(
        `INSERT INTO prediction_scores
          (prediction_id, scoring_rule_id, ai_model_id, match_id, points,
           is_hit, calculation_detail, idempotency_key, calculated_at,
           calculation_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), 1)
         ON DUPLICATE KEY UPDATE
           points = VALUES(points),
           is_hit = VALUES(is_hit),
           calculation_detail = VALUES(calculation_detail),
           calculated_at = VALUES(calculated_at),
           calculation_version = calculation_version + 1`,
        [
          prediction.prediction_id,
          rule.id,
          prediction.ai_model_id,
          prediction.match_id,
          points,
          hit.hit ? 1 : 0,
          JSON.stringify(hit.detail),
          idempotencyKey
        ]
      );
      scoreRows += 1;
    }
  }

  await execute(
    `UPDATE user_match_predictions ump
     JOIN matches m ON m.id = ump.match_id
     SET ump.points =
       (CASE
          WHEN SIGN(ump.predicted_home_score - ump.predicted_away_score)
             = SIGN(m.home_score_90 - m.away_score_90) THEN 2
          ELSE 0
        END)
       + (CASE
            WHEN ump.predicted_home_score - ump.predicted_away_score
               = m.home_score_90 - m.away_score_90 THEN 1
            ELSE 0
          END)
       + (CASE
            WHEN ump.predicted_home_score = m.home_score_90
             AND ump.predicted_away_score = m.away_score_90 THEN 2
            ELSE 0
          END),
       ump.scored_at = UTC_TIMESTAMP(3)
     WHERE m.status = 'finished'
       AND m.home_score_90 IS NOT NULL
       AND m.away_score_90 IS NOT NULL
       ${options.matchId ? "AND m.id = ?" : ""}`,
    options.matchId ? [options.matchId] : []
  );

  return { predictions: predictions.length, scoreRows };
}
