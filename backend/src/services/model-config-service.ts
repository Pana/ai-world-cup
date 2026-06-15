import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows, withTransaction } from "../db.js";

interface ModelRow extends RowDataPacket {
  id: number;
}

interface TournamentRow extends RowDataPacket {
  id: number;
}

export async function configureModel(options: {
  slug: string;
  modelKey: string;
  version: string;
  tournamentSlug: string;
}): Promise<{ modelId: number; configVersion: number }> {
  const models = await queryRows<ModelRow[]>(
    "SELECT id FROM ai_models WHERE slug = ?",
    [options.slug]
  );
  const tournaments = await queryRows<TournamentRow[]>(
    "SELECT id FROM tournaments WHERE slug = ?",
    [options.tournamentSlug]
  );
  if (!models[0]) throw new Error(`Unknown model slug: ${options.slug}`);
  if (!tournaments[0]) {
    throw new Error(`Unknown tournament slug: ${options.tournamentSlug}`);
  }

  const modelId = Number(models[0].id);
  const tournamentId = Number(tournaments[0].id);
  const versions = await queryRows<(RowDataPacket & { next_version: number })[]>(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
     FROM model_configs
     WHERE ai_model_id = ? AND tournament_id = ?`,
    [modelId, tournamentId]
  );
  const configVersion = Number(versions[0]?.next_version ?? 1);

  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE ai_models
       SET model_key = ?, version = ?, is_active = 1, retired_at = NULL
       WHERE id = ?`,
      [options.modelKey, options.version, modelId]
    );
    await connection.execute(
      `UPDATE model_configs
       SET is_active = 0
       WHERE ai_model_id = ? AND tournament_id = ?`,
      [modelId, tournamentId]
    );
    await connection.execute(
      `INSERT INTO model_configs
        (ai_model_id, tournament_id, version, temperature, top_p,
         max_output_tokens, seed, config, is_active, published_at)
       VALUES (?, ?, ?, 0.2, 1, 2000, 20260611, ?, 1, UTC_TIMESTAMP(3))`,
      [
        modelId,
        tournamentId,
        configVersion,
        JSON.stringify(buildModelGatewayConfig(options.slug, options.modelKey))
      ]
    );
  });

  return { modelId, configVersion };
}

export function buildModelGatewayConfig(
  slug: string,
  modelKey: string
): Record<string, unknown> {
  if (
    slug === "qianwen" &&
    modelKey === "qwen/qwen3-235b-a22b-2507"
  ) {
    return {
      provider: {
        require_parameters: true,
        order: ["DeepInfra"],
        allow_fallbacks: false
      }
    };
  }

  if (slug === "doubao") {
    return {
      provider: { require_parameters: true },
      disabledParameters: ["seed"],
      reasoning: { effort: "none", exclude: true }
    };
  }

  return { provider: { require_parameters: true } };
}
