import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_APP_URL: z.string().default("http://localhost:3000"),
  OPENROUTER_APP_NAME: z.string().default("AI World Cup Oracle"),
  FIFA_API_BASE_URL: z.url().default("https://api.fifa.com/api/v3"),
  SCHEDULE_SOURCE: z.string().default("fifa://world-cup-2026"),
  PREDICTION_LEAD_HOURS: z.coerce.number().positive().default(24),
  PREDICTION_SCAN_CRON: z.string().default("*/15 * * * *"),
  RESULT_SYNC_CRON: z.string().default("*/10 * * * *"),
  TIME_ZONE: z.string().default("UTC")
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | undefined;

export function getConfig(): AppConfig {
  cachedConfig ??= envSchema.parse(process.env);
  return cachedConfig;
}

export function resetConfigForTests(): void {
  cachedConfig = undefined;
}
