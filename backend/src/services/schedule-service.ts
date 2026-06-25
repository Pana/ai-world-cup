import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows, withTransaction } from "../db.js";
import {
  scheduleDocumentSchema,
  type ScheduleDocument,
  type ScheduleMatch
} from "../domain/schedule.js";
import { toMysqlDateTime } from "../lib/time.js";
import { loadJsonSource } from "./source-loader.js";

interface IdRow extends RowDataPacket {
  id: number;
}

export async function importSchedule(source: string): Promise<{
  tournamentId: number;
  importedMatches: number;
}> {
  const document = scheduleDocumentSchema.parse(await loadJsonSource(source));
  const tournamentId = await upsertTournament(document);
  const teamIds = await loadTeamIds();

  for (const match of document.matches) {
    await upsertMatch(tournamentId, match, teamIds);
  }
  await refreshStageStatuses(tournamentId);

  return { tournamentId, importedMatches: document.matches.length };
}

async function upsertTournament(document: ScheduleDocument): Promise<number> {
  const item = document.tournament;
  await execute(
    `INSERT INTO tournaments
      (name, edition, slug, host_countries, starts_at, ends_at,
       team_count, match_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       edition = VALUES(edition),
       host_countries = VALUES(host_countries),
       starts_at = VALUES(starts_at),
       ends_at = VALUES(ends_at),
       team_count = VALUES(team_count),
       match_count = VALUES(match_count),
       status = VALUES(status)`,
    [
      item.name,
      item.edition,
      item.slug,
      JSON.stringify(item.hostCountries),
      item.startsAt,
      item.endsAt,
      item.teamCount,
      item.matchCount,
      item.status
    ]
  );
  const rows = await queryRows<IdRow[]>(
    "SELECT id FROM tournaments WHERE slug = ?",
    [item.slug]
  );
  if (!rows[0]) throw new Error(`Tournament not found after upsert: ${item.slug}`);
  return Number(rows[0].id);
}

async function loadTeamIds(): Promise<Map<string, number>> {
  const rows = await queryRows<(RowDataPacket & { id: number; code: string })[]>(
    "SELECT id, code FROM teams"
  );
  return new Map(rows.map((row) => [row.code, Number(row.id)]));
}

async function upsertMatch(
  tournamentId: number,
  match: ScheduleMatch,
  teamIds: Map<string, number>
): Promise<void> {
  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO stages
        (tournament_id, name, code, stage_type, sequence, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         stage_type = VALUES(stage_type),
         status = VALUES(status)`,
      [
        tournamentId,
        match.stageName,
        match.stageCode,
        match.stageType,
        match.stageSequence,
        match.status === "finished" ? "completed" : "upcoming"
      ]
    );
    const [stageRows] = await connection.execute<IdRow[]>(
      "SELECT id FROM stages WHERE tournament_id = ? AND code = ?",
      [tournamentId, match.stageCode]
    );
    const stageId = Number(stageRows[0]?.id);

    let groupId: number | null = null;
    if (match.groupCode && match.groupName) {
      await connection.execute(
        `INSERT INTO tournament_groups
          (tournament_id, stage_id, name, code, sequence)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           stage_id = VALUES(stage_id),
           name = VALUES(name)`,
        [
          tournamentId,
          stageId,
          match.groupName,
          match.groupCode,
          match.groupCode.charCodeAt(0) - 64
        ]
      );
      const [groupRows] = await connection.execute<IdRow[]>(
        "SELECT id FROM tournament_groups WHERE tournament_id = ? AND code = ?",
        [tournamentId, match.groupCode]
      );
      groupId = Number(groupRows[0]?.id);
    }

    const homeTeamId = resolveTeamId(match.homeTeamCode, teamIds);
    const awayTeamId = resolveTeamId(match.awayTeamCode, teamIds);
    const winnerTeamId = resolveTeamId(match.winnerTeamCode, teamIds);

    await connection.execute(
      `INSERT INTO matches
        (tournament_id, stage_id, group_id, external_id, match_number,
         home_team_id, away_team_id, home_placeholder, away_placeholder,
         venue_name, host_city, scheduled_at, status, home_score_90,
         away_score_90, home_score_after_extra_time, away_score_after_extra_time,
         home_penalty_score, away_penalty_score, winner_team_id, result_type,
         started_at, finished_at, source_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         external_id = VALUES(external_id),
         stage_id = VALUES(stage_id),
         group_id = VALUES(group_id),
         home_team_id = VALUES(home_team_id),
         away_team_id = VALUES(away_team_id),
         home_placeholder = VALUES(home_placeholder),
         away_placeholder = VALUES(away_placeholder),
         venue_name = VALUES(venue_name),
         host_city = VALUES(host_city),
         scheduled_at = VALUES(scheduled_at),
         status = VALUES(status),
         home_score_90 = VALUES(home_score_90),
         away_score_90 = VALUES(away_score_90),
         home_score_after_extra_time = VALUES(home_score_after_extra_time),
         away_score_after_extra_time = VALUES(away_score_after_extra_time),
         home_penalty_score = VALUES(home_penalty_score),
         away_penalty_score = VALUES(away_penalty_score),
         winner_team_id = VALUES(winner_team_id),
         result_type = VALUES(result_type),
         started_at = VALUES(started_at),
         finished_at = VALUES(finished_at),
         source_updated_at = VALUES(source_updated_at)`,
      [
        tournamentId,
        stageId,
        groupId,
        match.externalId,
        match.matchNumber,
        homeTeamId,
        awayTeamId,
        match.homePlaceholder ?? null,
        match.awayPlaceholder ?? null,
        match.venueName ?? null,
        match.hostCity ?? null,
        toMysqlDateTime(match.scheduledAt),
        match.status,
        match.homeScore90 ?? null,
        match.awayScore90 ?? null,
        match.homeScoreAfterExtraTime ?? null,
        match.awayScoreAfterExtraTime ?? null,
        match.homePenaltyScore ?? null,
        match.awayPenaltyScore ?? null,
        winnerTeamId,
        match.resultType ?? null,
        match.startedAt ? toMysqlDateTime(match.startedAt) : null,
        match.finishedAt ? toMysqlDateTime(match.finishedAt) : null,
        match.sourceUpdatedAt ? toMysqlDateTime(match.sourceUpdatedAt) : null
      ]
    );
  });
}

function resolveTeamId(
  code: string | null | undefined,
  teamIds: Map<string, number>
): number | null {
  if (!code) return null;
  const id = teamIds.get(code);
  if (!id) throw new Error(`Unknown team code: ${code}. Run db:seed first.`);
  return id;
}

async function refreshStageStatuses(tournamentId: number): Promise<void> {
  await execute(
    `UPDATE stages s
     JOIN (
       SELECT
         stage_id,
         COUNT(*) AS total_matches,
         SUM(status = 'finished') AS finished_matches,
         SUM(status = 'live') AS live_matches
       FROM matches
       WHERE tournament_id = ?
       GROUP BY stage_id
     ) summary ON summary.stage_id = s.id
     SET s.status =
       CASE
         WHEN summary.finished_matches = summary.total_matches THEN 'completed'
         WHEN summary.finished_matches > 0 OR summary.live_matches > 0 THEN 'active'
         ELSE 'upcoming'
       END
     WHERE s.tournament_id = ?`,
    [tournamentId, tournamentId]
  );
}
