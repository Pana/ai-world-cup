import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows } from "../db.js";
import { errorMessage } from "../lib/errors.js";

export type JobTrigger = "cron" | "manual" | "api";

export async function runAuditedJob<T>(
  jobName: string,
  trigger: JobTrigger,
  input: Record<string, unknown>,
  task: () => Promise<T>
): Promise<T> {
  const bucket = new Date().toISOString().slice(0, 16);
  const idempotencyKey =
    trigger === "cron"
      ? `${jobName}:${trigger}:${bucket}`
      : `${jobName}:${trigger}:${randomUUID()}`;

  const existing = await queryRows<(RowDataPacket & { id: number; status: string })[]>(
    "SELECT id, status FROM job_runs WHERE idempotency_key = ?",
    [idempotencyKey]
  );
  if (existing.length > 0) {
    throw new Error(`Job already started for idempotency key ${idempotencyKey}`);
  }

  const run = await execute(
    `INSERT INTO job_runs
      (job_name, trigger_type, idempotency_key, status, input, started_at)
     VALUES (?, ?, ?, 'running', ?, UTC_TIMESTAMP(3))`,
    [jobName, trigger, idempotencyKey, JSON.stringify(input)]
  );

  try {
    const result = await task();
    await execute(
      `UPDATE job_runs
       SET status = 'succeeded', result = ?, finished_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [JSON.stringify(result), run.insertId]
    );
    return result;
  } catch (error) {
    await execute(
      `UPDATE job_runs
       SET status = 'failed', error_message = ?, finished_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [errorMessage(error), run.insertId]
    );
    throw error;
  }
}
