import { buildApp } from "./app.js";
import { getConfig } from "./config.js";
import { closePool } from "./db.js";
import { startScheduler } from "./scheduler.js";

const config = getConfig();
const app = await buildApp();
const tasks = startScheduler(app.log);

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down");
  for (const task of tasks) task.stop();
  await app.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: config.HOST, port: config.PORT });
