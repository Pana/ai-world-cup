# 运行与值守手册

本文面向本地开发、测试环境和正式比赛期间的系统值守。

## 服务清单

| 服务 | 默认端口 | 启动目录 | 启动命令 |
| --- | ---: | --- | --- |
| MySQL | 3306 | `backend` | `docker compose up -d` |
| Backend | 3010 | `backend` | `npm run dev` |
| Frontend | 3001 | `Frontend` | `npm run dev` |

检查端口：

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:3010 -sTCP:LISTEN
lsof -nP -iTCP:3306 -sTCP:LISTEN
```

检查后端：

```bash
curl http://127.0.0.1:3010/health
```

## 首次初始化

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
```

```bash
cd ../Frontend
cp .env.example .env.local
npm install
```

迁移是增量且幂等的，已经记录在 `schema_migrations` 的文件不会重复执行。

## 日常启动

终端一：

```bash
cd backend
npm run dev
```

终端二：

```bash
cd Frontend
npm run dev
```

关闭开发服务时，在对应终端按 `Ctrl+C`。不要直接关闭 MySQL 容器，除非确认当前
没有导入、预测或计分任务。

## 比赛前流程

建议至少在首场比赛前完成一次完整演练。

1. 导入最新赛程。
2. 核对比赛时间、球队、阶段和数据源更新时间。
3. 确认本场绑定的 Prompt 版本。
4. 确认参赛模型和模型配置版本。
5. 检查 OpenRouter 余额和模型可用性。
6. 手动运行一场低成本测试。
7. 确认 `prediction_runs`、`predictions` 和前端展示。

命令：

```bash
cd backend
npm run schedule:import
npm run predictions:run -- --match-id MATCH_ID
```

正式预测锁定后，不应手动修改 `predictions`。

## 比赛后流程

```bash
cd backend
npm run results:sync
npm run scores:calculate -- --match-id MATCH_ID
```

核对：

- `matches.status` 为 `finished`。
- `home_score_90` 和 `away_score_90` 是 90 分钟含补时比分。
- 淘汰赛的 `winner_team_id` 和 `result_type` 正确。
- `prediction_scores` 已生成各规则明细。
- 前端排行榜积分和比赛详情一致。

## 定时任务

后端服务启动后会自动运行：

```text
PREDICTION_SCAN_CRON=*/15 * * * *
RESULT_SYNC_CRON=*/10 * * * *
```

默认含义：

- 每 15 分钟扫描预测窗口。
- 每 10 分钟同步结果并计分。

`PREDICTION_LEAD_HOURS=24` 表示在开球前 24 小时内允许自动生成预测。

默认 `SCHEDULE_SOURCE=fifa://world-cup-2026`，因此 `RESULT_SYNC_CRON` 会直接抓取
FIFA 官方 API 并把最新赛程/比分写入数据库，然后重新计算已完赛比赛得分。也可以把
`SCHEDULE_SOURCE` 临时切回 `./data/schedule.fifa-2026.json` 使用离线快照。

注意：

- 多实例会重复触发定时任务。
- `job_runs` 和预测幂等键可以避免多数重复写入，但不能替代单实例调度或分布式锁。
- 正式部署推荐将调度任务放到独立 Worker。

## OpenRouter 成本控制

1. 首次只启用一个低价模型。
2. 只对一场测试比赛执行 `--match-id`。
3. 查看 `prediction_runs.reasoning_config`、`input_tokens`、`output_tokens`、
   `reasoning_tokens`、`total_tokens` 和 `cost_amount`。
4. 确认成功后再增加模型。
5. 在 OpenRouter 控制台设置预算和告警。

当前模型默认参数：

```text
temperature: 0.2
top_p: 1
max_output_tokens: 800
seed: 20260611
reasoning: 根据模型的 reasoningEnabled/reasoningEffort 发送
```

每次调用都会固化实际推理配置，并记录 OpenRouter 返回的输入、输出、推理和总 Token
以及总费用。`reasoning_tokens` 是否有值取决于具体供应商是否返回该明细。

单次失败不会写入 `predictions`，但供应商可能已经产生调用费用。不要无上限自动重试。

## 常见故障

### 后端无法连接 MySQL

检查：

```bash
docker compose ps
```

确认 `DATABASE_URL` 的主机、端口、用户名、密码和数据库名正确。

### OpenRouter 未配置

错误：

```text
OPENROUTER_NOT_CONFIGURED
```

处理：在 `backend/.env` 设置 `OPENROUTER_API_KEY`，然后重新启动后端或重新执行 CLI。

### OpenRouter 返回空内容

可能原因：

- 当前模型或供应商不完整支持结构化输出。
- 免费模型繁忙或路由器更换了供应商。
- 输出 Token 上限不足。

处理：查看 `prediction_runs.error_message`，更换支持 `structured_outputs` 的准确模型 ID。

当前已确认的模型兼容配置：

- Qianwen 使用 `qwen/qwen3.7-max`，固定到明确支持严格结构化输出的
  `Alibaba` 端点。
- Doubao 使用 `bytedance-seed/seed-2.0-mini`，请求中省略供应商不支持的 `seed`，
  并开启中等强度 reasoning。

### 概率不严格合计 100

系统会将合法的非负概率按比例归一化。缺失概率、负数或总和为零仍会被拒绝。

### 预测被跳过

同一比赛和模型已经存在正式 `predictions` 时，系统返回 `skipped`。这是正常的幂等
保护。

### 前端无法访问 API

检查 `Frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3010
```

修改后需重启 Next.js。

### Next.js 开发缓存异常

如果出现 `.next/server` 缺少 chunk，可停止前端、删除 `Frontend/.next`，然后重新运行
`npm run dev`。不要删除源码或 `node_modules`。

## 日志和审计

- Fastify 日志输出到标准输出。
- 手动任务和定时任务记录在 `job_runs`。
- 模型调用记录在 `prediction_runs`。
- 正式预测记录在 `predictions`。
- 计分明细记录在 `prediction_scores`。

建议生产环境采集：

- HTTP 5xx 数量
- 定时任务失败数量
- 模型调用成功率和延迟
- 单模型 Token 和费用
- 临近开球但没有预测的比赛
- 已结束但尚未计分的比赛

## 备份与恢复

正式比赛期间至少每天备份一次 MySQL，并在每轮淘汰赛前增加一次备份。

重点表：

```text
matches
prompt_versions
match_prompt_versions
model_configs
prediction_runs
predictions
prediction_scores
job_runs
```

恢复后应先暂停调度器，核对迁移版本和最新比赛状态，再恢复自动任务。

## 发布检查

```bash
cd Frontend
npm run lint
npm run typecheck
npm test
npm run build

cd ../backend
npm run typecheck
npm test
npm run build
```

正式发布还应确认：

- `.env` 未进入 Git。
- 数据库迁移已执行。
- CORS 只允许正式前端域名。
- 前后端使用 HTTPS。
- 用户接口有认证、限流和防刷。
- 示例赛程和测试预测已隔离。
