# AI World Cup Backend

TypeScript + Node.js backend for importing World Cup fixtures, generating AI
predictions through OpenRouter, calculating scores, and serving frontend APIs.

This service lives in the repository's `backend/` directory. Run all commands
in this document from that directory.

## Stack

- Node.js 20+
- TypeScript
- Fastify
- MySQL 8.0
- OpenRouter
- node-cron
- Zod
- Vitest

## Features

- Import or update fixtures and official results from a local or remote JSON source.
- Run predictions automatically before kickoff or manually for one match.
- Lock a Prompt version and data snapshot before calling any model.
- Call multiple OpenRouter models with strict structured output.
- Validate and persist predictions, request metadata, cost, tokens, and failures.
- Calculate the agreed 90-minute and knockout-stage scores idempotently.
- Expose tournaments, fixtures, predictions, models, leaderboards, and Prompt versions.
- Audit cron and manual jobs in `job_runs`.

## Setup

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
```

Before enabling predictions:

1. Run `npm run db:seed` to create the model catalog.
2. Configure each selected model with the command below.
3. Add `OPENROUTER_API_KEY` to `.env`.

```bash
npx tsx src/cli.ts models:configure \
  --slug gpt \
  --model-key openai/example-model-id \
  --version example-version
```

Use an exact model ID from the OpenRouter model catalog. Repeat for each model
that should participate.

Publish a new immutable Prompt version:

```bash
npm run prompts:publish -- \
  --file ./data/prompt-version.example.json \
  --tournament world-cup-2026
```

The file must contain the complete Prompt and complete JSON Schema. A newly
published version is selected only when a future match receives its first locked
Prompt assignment.

Model IDs are intentionally not hardcoded because OpenRouter model versions and
availability change. The selected ID is stored in `ai_models.model_key` and every
request records both the requested and resolved model IDs.

## Run

Development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

Default URL: `http://localhost:3010`

## Manual Commands

```bash
# Import fixtures/results from SCHEDULE_SOURCE
npm run schedule:import

# Import from another local file or HTTP JSON endpoint
npm run schedule:import -- --source ./data/schedule.fifa-2026.json

# Import from the built-in FIFA API adapter
npm run schedule:import -- --source fifa://world-cup-2026

# Run all matches inside the configured prediction window
npm run predictions:run

# Force one match through the prediction workflow
npm run predictions:run -- --match-id 1

# Import latest results and calculate scores
npm run results:sync

# Recalculate one match idempotently
npm run scores:calculate -- --match-id 1

# Run import, prediction scan, and scoring once
npm run jobs:run
```

## Scheduled Jobs

The server registers:

- `PREDICTION_SCAN_CRON`: scans for matches occurring within
  `PREDICTION_LEAD_HOURS`.
- `RESULT_SYNC_CRON`: imports the configured schedule source and recalculates
  completed-match scores.

Both schedules use `TIME_ZONE`. Production should keep it at `UTC`.

## Schedule Source Contract

`SCHEDULE_SOURCE` can be:

- `fifa://world-cup-2026`, which fetches FIFA's official calendar API and
  transforms it into the internal schedule contract.
- A local JSON file.
- An HTTP or HTTPS endpoint returning the same JSON shape.

See [data/schedule.fifa-2026.json](data/schedule.fifa-2026.json) for the
offline schedule snapshot and
[data/schedule.example.json](data/schedule.example.json) for the compact
contract example. The source adapter
upserts tournaments, stages, groups, fixtures, official scores, extra-time data,
penalty scores, and winning teams.

## Prompt Versioning

Prompt content is stored in `prompt_versions`. Each match is explicitly bound to
one immutable version through `match_prompt_versions`.

- All models in the same match receive the same Prompt version and snapshot.
- Published Prompt content cannot be edited.
- New versions affect only future unlocked matches.
- Every request stores the fully rendered prompts and data snapshot hash.
- Historical predictions are never rerun merely because a newer Prompt exists.

The initial `match-prediction-v1` is inserted by `npm run db:seed`.

## Scoring

All score predictions use the result after 90 minutes plus stoppage time:

| Rule | Points |
| --- | ---: |
| Correct home/draw/away result | 2 |
| Correct goal difference | +1 |
| Exact score | +2 |
| Correct knockout advancing team | +2 |
| Correctly predicts extra time | +1 |
| Correctly predicts penalties | +1 |

Scores are stored as individual rows in `prediction_scores`; leaderboard totals
are derived from those rows.

## API

```text
GET /health
GET /api/v1/tournaments
GET /api/v1/tournaments/:slug/matches
GET /api/v1/tournaments/:slug/stages
GET /api/v1/matches/:id
GET /api/v1/tournaments/:slug/leaderboard
GET /api/v1/models
GET /api/v1/models/:slug
GET /api/v1/tournaments/:slug/prompts
GET /api/v1/tournaments/:slug/debate
POST /api/v1/users
POST /api/v1/users/:publicId/predictions
GET /api/v1/users/leaderboard
```

Match list filters:

```text
?status=scheduled
?stage=GROUP
?limit=50
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Database integration requires a running MySQL instance. Unit tests do not call
OpenRouter or require an API key.
