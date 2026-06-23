# AI World Cup Oracle

AI World Cup Oracle 是一个面向 2026 世界杯的多模型预测竞赛系统。系统通过
OpenRouter 调用不同厂商的大模型，在统一 Prompt、统一数据快照和统一锁定时间下
预测比赛，并在官方结果确认后自动计分和生成排行榜。

项目同时提供赛程浏览、模型档案、Prompt 透明度、用户竞猜、AI 观点对比和分享海报。
网站界面使用英文，项目文档使用中文。

## 当前状态

截至 2026 年 6 月 14 日：

- 前后端功能已经形成可运行的 MVP。
- MySQL 8.0 数据库迁移和种子数据可用。
- OpenRouter 调用链路已经完成真实测试。
- 当前 DeepSeek 模型为 `deepseek/deepseek-v4-pro`。
- 此前使用 V4 Flash 完成了一条示例预测：United States `2:1` Mexico。
- 该次历史调用使用 457 个输入 Token、280 个输出 Token，费用为
  `0.000102 USD`。
- 正式 104 场赛程尚未导入。
- 其他参赛模型尚未配置。
- 前端 `3001` 和后端 `3010` 服务当前默认按需启动，不要求常驻。

测试数据只能用于验证系统，不应作为正式比赛预测发布。

## 核心能力

- 从本地 JSON 或 HTTP 数据源幂等导入赛程和比赛结果。
- 在开球前按定时任务或手动命令生成模型预测。
- 通过 OpenRouter 统一接入 GPT、Claude、Gemini、Grok、DeepSeek 等模型。
- 为每场比赛锁定 Prompt 版本、输入数据快照和数据截止时间。
- 保存模型请求、响应、Token、费用、耗时和失败原因。
- 按 90 分钟比分及淘汰赛结果自动计算积分。
- 展示模型排行榜、模型详情、积分曲线和预测历史。
- 展示赛程、比赛详情、概率、信心、关键因素和不确定性。
- 公开 Prompt 版本和变更记录。
- 支持匿名用户竞猜、用户排行榜和分享海报。
- 提供焦点比赛的 AI 观点对比页面。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js 15、React 19、TypeScript、Tailwind CSS、SWR、Framer Motion |
| 后端 | Node.js 20+、TypeScript、Fastify、Zod、node-cron |
| 数据库 | MySQL 8.0、mysql2 |
| 模型网关 | OpenRouter |
| 测试 | Vitest、Testing Library |
| 图标 | Lucide、项目本地球队国旗和模型图标 |

## 项目结构

```text
ai-world-cup/
├── Frontend/                 Next.js 前端
│   ├── public/               国旗和模型图标
│   └── src/
│       ├── app/              页面和路由
│       ├── components/       UI 组件
│       ├── lib/              API、格式化和前端业务工具
│       └── types/            API 类型
├── backend/                  TypeScript 后端
│   ├── data/                 示例赛程、模型和 Prompt
│   ├── migrations/           MySQL 迁移
│   ├── src/
│   │   ├── api/              HTTP API
│   │   ├── domain/           预测、赛程和计分规则
│   │   ├── integrations/     OpenRouter 客户端
│   │   └── services/         导入、预测、计分和配置服务
│   └── test/                 后端单元测试
├── assets/                   原始国旗和模型图标
├── scripts/                  素材下载脚本
├── docs/                     API 和运维文档
├── database-design.md        数据库字段和关系设计
├── idea.md                   产品设想和最终计分规则
├── website.md                网站原始需求
└── teams.json                球队和洲际足联数据
```

## 系统架构

```mermaid
flowchart LR
    Browser["Next.js frontend"] --> API["Fastify API"]
    API --> MySQL["MySQL 8.0"]
    Scheduler["Cron scheduler"] --> Import["Schedule/result import"]
    Scheduler --> Predict["Prediction service"]
    Scheduler --> Score["Scoring service"]
    Import --> Source["JSON file or HTTP source"]
    Import --> MySQL
    Predict --> OpenRouter["OpenRouter"]
    Predict --> MySQL
    Score --> MySQL
```

每场比赛的核心流程：

1. 导入赛程并建立赛事、阶段、小组和比赛记录。
2. 在预测窗口内为比赛绑定当前已发布的 Prompt 版本。
3. 冻结比赛数据快照，并为每个启用模型发起一次 OpenRouter 调用。
4. 校验结构化输出，将正式预测锁定写入数据库。
5. 比赛结束后同步官方比分。
6. 对每条模型预测和用户竞猜执行幂等计分。
7. API 根据得分明细实时聚合排行榜。

## 本地启动

### 1. 环境要求

- Node.js 20 或更高版本
- npm
- MySQL 8.0
- 可选：Docker Desktop
- OpenRouter API Key，仅在测试模型调用时需要

### 2. 启动 MySQL

项目提供 MySQL Docker Compose：

```bash
cd backend
docker compose up -d
```

也可以使用已有 MySQL 8.0，并在 `backend/.env` 中修改 `DATABASE_URL`。

### 3. 初始化后端

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
```

开发启动：

```bash
npm run dev
```

后端默认地址：`http://localhost:3010`

### 4. 初始化前端

```bash
cd Frontend
cp .env.example .env.local
npm install
npm run dev
```

前端默认地址：`http://localhost:3001`

## 环境变量

后端主要配置位于 `backend/.env`：

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3010
LOG_LEVEL=info

DATABASE_URL=mysql://root:password@127.0.0.1:3306/ai_world_cup

OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_URL=http://localhost:3001
OPENROUTER_APP_NAME=AI World Cup Oracle

SCHEDULE_SOURCE=./data/schedule.fifa-2026.json
PREDICTION_LEAD_HOURS=24
PREDICTION_SCAN_CRON=*/15 * * * *
RESULT_SYNC_CRON=*/10 * * * *
TIME_ZONE=UTC
```

前端配置位于 `Frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3010
```

安全要求：

- 不要把 `OPENROUTER_API_KEY` 写入代码、文档或 Git。
- 不要在日志中输出完整 Key。
- 正式环境应使用平台 Secret 或密钥管理服务。

## 配置 OpenRouter 模型

模型必须使用 OpenRouter 的准确模型 ID。每执行一次配置命令，系统会创建新的
`model_configs` 版本，并停用该模型之前的活动配置。

```bash
cd backend

npm run models:configure -- \
  --slug deepseek \
  --model-key deepseek/deepseek-v4-pro \
  --version deepseek-v4-pro
```

可用的内置模型 `slug`：

```text
gpt
claude
gemini
grok
kimi
deepseek
glm
qianwen
doubao
```

建议先使用一个低价模型和一场测试比赛完成冒烟测试，再逐个启用正式参赛模型。

## 赛程导入

默认赛程快照见
[`backend/data/schedule.fifa-2026.json`](backend/data/schedule.fifa-2026.json)。
赛程契约格式示例见
[`backend/data/schedule.example.json`](backend/data/schedule.example.json)。

```bash
cd backend

# 使用 SCHEDULE_SOURCE
npm run schedule:import

# 指定本地文件
npm run schedule:import -- --source ./data/schedule.fifa-2026.json

# 指定 HTTP JSON 数据源
npm run schedule:import -- --source https://example.com/world-cup.json
```

同一场比赛重复导入时会更新已有记录，不会重复创建比赛。

## 生成预测

```bash
cd backend

# 扫描预测窗口内的全部比赛
npm run predictions:run

# 只运行一场比赛
npm run predictions:run -- --match-id 1
```

同一场比赛、同一模型只能存在一条正式预测。重复执行时，已有预测会被跳过。
失败调用保存在 `prediction_runs`，可修复问题后再次尝试。

系统会兼容模型常见格式差异：

- 将小数舍入后未严格合计 100 的概率按比例归一化。
- 将 `0-1` 表示的信心值转换为 `0-100`。
- 仍会拒绝缺字段、非法比分、错误比赛 ID 和不符合淘汰赛规则的响应。

## Prompt 版本

Prompt 版本是不可变的正式配置：

- 每个版本保存 System Prompt、User Prompt 模板、JSON Schema 和内容哈希。
- 每场比赛在首次预测前绑定一个版本。
- 同场所有模型使用同一个版本和同一份数据快照。
- 发布新版本只影响未来尚未锁定的比赛。
- 历史预测不会因为 Prompt 更新而重新生成。

发布新版本：

```bash
cd backend
npm run prompts:publish -- \
  --file ./data/prompt-version.example.json \
  --tournament world-cup-2026
```

## 计分规则

所有比分预测统一使用常规时间 90 分钟加补时结束时的比分。

| 项目 | 得分 |
| --- | ---: |
| 胜负平正确 | 2 |
| 净胜球正确 | +1 |
| 准确比分 | +2 |
| 淘汰赛晋级球队正确 | +2 |
| 正确预测进入加时赛 | +1 |
| 正确预测进入点球大战 | +1 |

基础比赛最高 5 分，淘汰赛最高 9 分。详细规则、异常比赛处理和排行榜同分规则见
[`idea.md`](idea.md)。

同步结果并计分：

```bash
cd backend

npm run results:sync
npm run scores:calculate -- --match-id 1
```

得分以明细行保存在 `prediction_scores`，重复计算会更新已有结果而不是重复加分。

## 定时任务

后端启动后会注册两个任务：

- `PREDICTION_SCAN_CRON`：扫描即将开球的比赛并生成预测。
- `RESULT_SYNC_CRON`：导入最新比赛结果并重新计分。

正式环境建议使用 UTC，并确保只有一个后端实例执行内置定时任务。如果部署多个
实例，应将调度器拆为独立 Worker，或增加分布式锁。

## 前端页面

| 路径 | 功能 |
| --- | --- |
| `/` | AI 总积分排行榜和近期比赛 |
| `/matches` | 赛程、状态筛选和阶段筛选 |
| `/matches/:id` | 比赛信息、AI 预测和用户竞猜 |
| `/models` | 参赛模型列表 |
| `/models/:slug` | 模型资料、积分曲线和预测历史 |
| `/prompts` | Prompt 版本和完整模板 |
| `/debate` | 焦点比赛模型观点对比 |
| `/play` | 用户档案、AI 军师、用户排行榜和分享海报 |
| `/info` | 世界杯赛制和计分说明 |

用户功能目前使用浏览器生成的匿名 UUID，没有账号密码和跨设备身份恢复能力。
正式开放前应增加身份验证、防刷和提交频率限制。

## 数据库

数据库使用 MySQL 8.0、InnoDB、`utf8mb4` 和 UTC 时间。当前主要业务表包括：

- 赛事：`tournaments`、`stages`、`tournament_groups`
- 球队：`teams`、`tournament_teams`
- 比赛：`matches`
- 模型：`ai_models`、`model_configs`
- Prompt：`prompt_versions`、`match_prompt_versions`
- 预测：`prediction_runs`、`predictions`、`tournament_predictions`
- 计分：`scoring_rules`、`prediction_scores`
- 用户：`user_profiles`、`user_match_predictions`
- 运维：`job_runs`、`schema_migrations`

完整字段、索引、约束和关系见
[`database-design.md`](database-design.md)，实际建表以
[`backend/migrations`](backend/migrations) 为准。

## API

主要接口：

```text
GET  /health
GET  /api/v1/tournaments
GET  /api/v1/tournaments/:slug/matches
GET  /api/v1/tournaments/:slug/stages
GET  /api/v1/tournaments/:slug/leaderboard
GET  /api/v1/tournaments/:slug/prompts
GET  /api/v1/tournaments/:slug/debate
GET  /api/v1/matches/:id
GET  /api/v1/models
GET  /api/v1/models/:slug
POST /api/v1/users
POST /api/v1/users/:publicId/predictions
GET  /api/v1/users/leaderboard
```

详细请求、响应和错误格式见 [`docs/api.md`](docs/api.md)。

## 测试与质量检查

前端：

```bash
cd Frontend
npm run lint
npm run typecheck
npm test
npm run build
```

后端：

```bash
cd backend
npm run typecheck
npm test
npm run build
```

单元测试不会调用 OpenRouter。真实模型测试必须手动执行，并留意账户额度。

## 生产上线前检查

- 导入并核对正式 104 场赛程。
- 配置全部正式参赛模型及准确版本。
- 为球队补齐排名、Elo、阵容、伤停和近期比赛数据。
- 确认正式 Prompt 版本和输出 Schema。
- 移除或隔离示例比赛和测试预测。
- 为用户接口增加认证、限流、防刷和内容安全。
- 限制 CORS 来源，不要在生产环境使用 `origin: true`。
- 配置 HTTPS、数据库备份、日志和监控告警。
- 设置 OpenRouter 预算、调用上限和失败告警。
- 确保只有一个调度器执行正式预测和结果同步。
- 对比赛延期、取消和官方结果更正进行演练。

## 延伸文档

- [前端开发说明](Frontend/README.md)
- [后端开发说明](backend/README.md)
- [运行与值守手册](docs/operations.md)
- [HTTP API](docs/api.md)
- [数据库设计](database-design.md)
- [产品设想与计分规则](idea.md)
- [网站原始需求](website.md)
- [世界杯基础资料](basic-info.md)
