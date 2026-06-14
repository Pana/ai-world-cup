import cron, { type ScheduledTask } from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { getConfig } from "./config.js";
import { runAuditedJob } from "./services/job-service.js";
import { runDuePredictions } from "./services/prediction-service.js";
import { importSchedule } from "./services/schedule-service.js";
import { calculateFinishedMatchScores } from "./services/scoring-service.js";

export function startScheduler(logger: FastifyBaseLogger): ScheduledTask[] {
  const config = getConfig();
  const tasks: ScheduledTask[] = [];

  tasks.push(
    cron.schedule(
      config.PREDICTION_SCAN_CRON,
      async () => {
        try {
          const result = await runAuditedJob(
            "predictions:run",
            "cron",
            { leadHours: config.PREDICTION_LEAD_HOURS },
            () =>
              runDuePredictions({
                leadHours: config.PREDICTION_LEAD_HOURS
              })
          );
          logger.info({ result }, "Prediction scan completed");
        } catch (error) {
          logger.error({ error }, "Prediction scan failed");
        }
      },
      { timezone: config.TIME_ZONE }
    )
  );

  tasks.push(
    cron.schedule(
      config.RESULT_SYNC_CRON,
      async () => {
        try {
          const result = await runAuditedJob(
            "results:sync",
            "cron",
            { source: config.SCHEDULE_SOURCE },
            async () => {
              const imported = await importSchedule(config.SCHEDULE_SOURCE);
              const scored = await calculateFinishedMatchScores();
              return { imported, scored };
            }
          );
          logger.info({ result }, "Result sync completed");
        } catch (error) {
          logger.error({ error }, "Result sync failed");
        }
      },
      { timezone: config.TIME_ZONE }
    )
  );

  return tasks;
}
