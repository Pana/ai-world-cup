import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchFifaWorldCup2026Schedule } from "../integrations/fifa-schedule-client.js";

export async function loadJsonSource(source: string): Promise<unknown> {
  if (source === "fifa://world-cup-2026") {
    return fetchFifaWorldCup2026Schedule();
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      throw new Error(`Source returned HTTP ${response.status}`);
    }
    return response.json();
  }

  const content = await readFile(path.resolve(source), "utf8");
  return JSON.parse(content) as unknown;
}
