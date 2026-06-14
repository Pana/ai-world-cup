import { Command } from "commander";
import { getConfig } from "./config.js";
import { closePool, runMigrations } from "./db.js";
import { runAuditedJob } from "./services/job-service.js";
import { configureModel } from "./services/model-config-service.js";
import { runDuePredictions } from "./services/prediction-service.js";
import { publishPromptVersion } from "./services/prompt-service.js";
import { importSchedule } from "./services/schedule-service.js";
import { calculateFinishedMatchScores } from "./services/scoring-service.js";
import { seedDatabase } from "./services/seed-service.js";

const program = new Command();
program.name("ai-world-cup").description("AI World Cup backend operations");

program.command("db:migrate").action(async () => {
  console.log(JSON.stringify({ applied: await runMigrations() }, null, 2));
});

program.command("db:seed").action(async () => {
  console.log(JSON.stringify(await seedDatabase(), null, 2));
});

program
  .command("models:configure")
  .requiredOption("--slug <slug>", "Model slug, for example gpt")
  .requiredOption("--model-key <modelKey>", "Exact OpenRouter model ID")
  .requiredOption("--version <version>", "Human-readable model version")
  .option("--tournament <slug>", "Tournament slug", "world-cup-2026")
  .action(
    async (options: {
      slug: string;
      modelKey: string;
      version: string;
      tournament: string;
    }) => {
      console.log(
        JSON.stringify(
          await configureModel({
            slug: options.slug,
            modelKey: options.modelKey,
            version: options.version,
            tournamentSlug: options.tournament
          }),
          null,
          2
        )
      );
    }
  );

program
  .command("prompts:publish")
  .requiredOption("--file <file>", "Prompt version JSON file")
  .option("--tournament <slug>", "Tournament slug", "world-cup-2026")
  .action(async (options: { file: string; tournament: string }) => {
    console.log(
      JSON.stringify(
        await publishPromptVersion({
          tournamentSlug: options.tournament,
          file: options.file
        }),
        null,
        2
      )
    );
  });

program
  .command("schedule:import")
  .option("-s, --source <source>", "JSON file path or HTTP URL")
  .action(async (options: { source?: string }) => {
    const source = options.source ?? getConfig().SCHEDULE_SOURCE;
    const result = await runAuditedJob(
      "schedule:import",
      "manual",
      { source },
      () => importSchedule(source)
    );
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("predictions:run")
  .option("-m, --match-id <id>", "Run a specific match", Number)
  .option("-l, --lead-hours <hours>", "Prediction lead window", Number)
  .action(async (options: { matchId?: number; leadHours?: number }) => {
    const leadHours = options.leadHours ?? getConfig().PREDICTION_LEAD_HOURS;
    const result = await runAuditedJob(
      "predictions:run",
      "manual",
      { matchId: options.matchId, leadHours },
      () =>
        runDuePredictions({
          leadHours,
          ...(options.matchId === undefined ? {} : { matchId: options.matchId })
        })
    );
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("scores:calculate")
  .option("-m, --match-id <id>", "Score a specific match", Number)
  .action(async (options: { matchId?: number }) => {
    const result = await runAuditedJob(
      "scores:calculate",
      "manual",
      { matchId: options.matchId },
      () =>
        calculateFinishedMatchScores(
          options.matchId === undefined ? {} : { matchId: options.matchId }
        )
    );
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("results:sync")
  .option("-s, --source <source>", "JSON file path or HTTP URL")
  .action(async (options: { source?: string }) => {
    const source = options.source ?? getConfig().SCHEDULE_SOURCE;
    const result = await runAuditedJob(
      "results:sync",
      "manual",
      { source },
      async () => ({
        imported: await importSchedule(source),
        scored: await calculateFinishedMatchScores()
      })
    );
    console.log(JSON.stringify(result, null, 2));
  });

program.command("jobs:run").action(async () => {
  const config = getConfig();
  const imported = await importSchedule(config.SCHEDULE_SOURCE);
  const predicted = await runDuePredictions({
    leadHours: config.PREDICTION_LEAD_HOURS
  });
  const scored = await calculateFinishedMatchScores();
  console.log(JSON.stringify({ imported, predicted, scored }, null, 2));
});

try {
  await program.parseAsync(process.argv);
} finally {
  await closePool();
}
