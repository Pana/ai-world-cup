import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { execute, queryRows } from "../db.js";
import { hashJson, sha256 } from "../lib/hash.js";

const promptFileSchema = z.object({
  promptType: z.enum(["match", "tournament_podium"]),
  name: z.string().min(1),
  schemaVersion: z.string().min(1),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().min(1),
  outputJsonSchema: z.record(z.string(), z.unknown()),
  changeSummary: z.string().min(1),
  changeReason: z.string().min(1)
});

export async function publishPromptVersion(options: {
  tournamentSlug: string;
  file: string;
}): Promise<{ id: number; version: number; versionKey: string }> {
  const raw = await readFile(path.resolve(options.file), "utf8");
  const prompt = promptFileSchema.parse(JSON.parse(raw));
  const tournaments = await queryRows<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM tournaments WHERE slug = ?",
    [options.tournamentSlug]
  );
  const tournamentId = Number(tournaments[0]?.id);
  if (!tournamentId) {
    throw new Error(`Unknown tournament slug: ${options.tournamentSlug}`);
  }

  const versions = await queryRows<(RowDataPacket & { next_version: number })[]>(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
     FROM prompt_versions
     WHERE tournament_id = ? AND prompt_type = ?`,
    [tournamentId, prompt.promptType]
  );
  const version = Number(versions[0]?.next_version ?? 1);
  const versionKey = `${prompt.promptType.replace("_", "-")}-prediction-v${version}`;
  const contentHash = sha256(
    `${prompt.systemPrompt}\n${prompt.userPromptTemplate}\n${hashJson(prompt.outputJsonSchema)}`
  );

  const result = await execute(
    `INSERT INTO prompt_versions
      (tournament_id, prompt_type, name, version, version_key, system_prompt,
       user_prompt_template, output_json_schema, schema_version,
       change_summary, change_reason, content_hash, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', UTC_TIMESTAMP(3))`,
    [
      tournamentId,
      prompt.promptType,
      prompt.name,
      version,
      versionKey,
      prompt.systemPrompt,
      prompt.userPromptTemplate,
      JSON.stringify(prompt.outputJsonSchema),
      prompt.schemaVersion,
      prompt.changeSummary,
      prompt.changeReason,
      contentHash
    ]
  );

  return { id: result.insertId, version, versionKey };
}
