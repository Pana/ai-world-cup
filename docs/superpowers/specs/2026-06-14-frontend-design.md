# AI World Cup 前端设计文档

日期: 2026-06-14
状态: 待 review

## 1. 目标

为「AI 世界杯预测大比拼」实现前端,展示各大模型对 2026 世界杯比赛的预测与得分。
前端是一个独立的 Next.js 应用,放在项目根目录的 `Frontend/` 子目录,通过 HTTP 调用现有后端 API 获取数据,自身不直接访问数据库。

核心交付 3 个页面,外加 1 个世界杯信息页:

1. 总积分排行榜(首页)
2. 大模型详情页
3. 比赛详情页
4. 世界杯信息页

## 2. 技术栈与约定

- **框架**: Next.js(App Router),React + TypeScript
- **数据获取**: 纯客户端拉取(client components + `fetch`,用 SWR 做缓存/重试/loading 态)
- **样式**: Tailwind CSS
- **动画**: Framer Motion(转场、足球旋转、卡片入场等)
- **语言**: 界面全英文(符合 website.md 要求)
- **主题**: 2026 世界杯主题 + AI 炫酷感(深色背景、霓虹/渐变点缀、足球元素)
- **静态资源**: 把 `assets/flags/*.svg` 和 `assets/models/*.svg` 复制到 `Frontend/public/flags` 与 `Frontend/public/models`,前端自给自足,不依赖后端托管
- **后端地址**: 通过环境变量 `NEXT_PUBLIC_API_BASE_URL` 配置,默认 `http://localhost:3000`
- **赛事 slug**: 默认 `world-cup-2026`,以常量形式集中配置

后端 CORS 已是 `origin: true`,跨域可直接调用,无需改后端。

## 3. 目录结构(建议)

```
Frontend/
  public/
    flags/            # 复制自 assets/flags
    models/           # 复制自 assets/models
  src/
    app/
      layout.tsx              # 全局布局 + 导航 + 主题
      page.tsx                # 排行榜(首页)
      models/[slug]/page.tsx  # 大模型详情页
      matches/[id]/page.tsx   # 比赛详情页
      info/page.tsx           # 世界杯信息页
      globals.css
    components/
      Nav.tsx
      FootballSpinner.tsx     # 旋转足球动画
      LeaderboardTable.tsx
      ModelAvatar.tsx
      TeamFlag.tsx
      PointsCurve.tsx         # 积分曲线
      PredictionCard.tsx
      MatchCard.tsx
      ScoreBadge.tsx
      Loading.tsx / ErrorState.tsx / EmptyState.tsx
    lib/
      api.ts                  # API 客户端 + 类型
      constants.ts            # TOURNAMENT_SLUG、API base 等
      labels.ts               # 趣味标签逻辑(The Oracle / Cold Streak 等)
      format.ts               # 时间/比分/概率格式化
    types/
      api.ts                  # 后端响应 TypeScript 类型
  next.config.js
  tailwind.config.ts
  tsconfig.json
  package.json
  .env.example
```

## 4. API 对接(基于现有后端)

所有接口前缀 `${NEXT_PUBLIC_API_BASE_URL}/api/v1`。

| 用途 | 方法/路径 | 返回 |
| -- | -- | -- |
| 赛事列表 | `GET /tournaments` | 数组,用于拿默认赛事/状态 |
| 排行榜 | `GET /tournaments/:slug/leaderboard` | 模型排名数组 |
| 比赛列表 | `GET /tournaments/:slug/matches?status=&stage=&limit=` | 比赛数组 |
| 比赛详情 | `GET /matches/:id` | `{ match, predictions }` |
| 模型列表 | `GET /models` | 模型数组 |
| 模型详情 | `GET /models/:slug` | `{ model, history }` |
| Prompt 版本 | `GET /tournaments/:slug/prompts` | Prompt 版本数组 |

字段以后端 `src/api/routes.ts` 返回的 camelCase 为准(如 `totalPoints`、`exactScoreHits`、`predictedHomeScore`、`highlightQuote`、`promptVersion` 等)。`types/api.ts` 据此定义类型。

## 5. 页面需求

### 5.1 排行榜(首页 `/`)

**数据**: `GET /tournaments/:slug/leaderboard`

- 顶部 Hero:标题、世界杯 2026 主题、旋转足球动画。
- 排行榜主体:按 `totalPoints` 降序的模型列表,每行/卡展示:
  - 名次(前三名高亮/奖牌样式)
  - 模型头像(`/models/{slug}.svg`)+ 名称 + 厂商
  - 总积分 `totalPoints`
  - 已预测场次 `submittedMatches`
  - 命中统计:`resultHits` / `goalDifferenceHits` / `exactScoreHits` / `advancingTeamHits`
  - 胜负平准确率 `resultAccuracy`(百分比)
  - 趣味标签(前端按规则生成,见 §6)
- 点击任一模型 → 跳转 `/models/{slug}`。
- 卡片入场动画(Framer Motion stagger)。
- loading / error / empty 三态。

### 5.2 大模型详情页(`/models/[slug]`)

**数据**: `GET /models/:slug` → `{ model, history }`

- **基本信息区**: 头像、名称、厂商、版本、人设 `personality`、是否开推理 `reasoningEnabled`、推理强度 `reasoningEffort`、描述 `description`、是否参赛 `active`。
- **积分曲线**: 用 `history`(按 `scheduledAt` 排序)计算累计积分,绘制折线/面积图(`PointsCurve`)。展示总积分。
- **预测历史表**: 每场一行:
  - 比赛(`homeTeam` vs `awayTeam`)、时间 `scheduledAt`
  - 预测比分 `predictedHomeScore:predictedAwayScore`
  - 实际比分 `actualHomeScore:actualAwayScore`(未结束显示占位)
  - 本场得分 `points`(`ScoreBadge`)
  - Prompt 版本 `promptVersion`
  - 点击行 → 跳 `/matches/{matchId}`
- loading / error / empty(模型不存在 → 友好提示)。

### 5.3 比赛详情页(`/matches/[id]`)

**数据**: `GET /matches/:id` → `{ match, predictions }`

- **比赛信息区**: 阶段(`stageName`)、小组、时间、球场 `venue_name` / 城市、双方球队(国旗 + 名称)、状态。
  - 若已结束(`status = finished`):展示 90 分钟比分 `home_score_90:away_score_90`,以及加时/点球(如有)、胜者。
  - 显示该场 `promptVersion`。
- **各模型预测区**: 遍历 `predictions`,每张卡:
  - 模型头像 + 名称
  - 预测结果 `predictedResult`(home/draw/away)+ 预测比分
  - 概率条:`homeWinProbability` / `drawProbability` / `awayWinProbability`
  - 信心 `confidence`
  - 神评论 `highlightQuote`(突出展示,便于截图传播)
  - 完整理由 `reasoning`(可折叠)
  - 淘汰赛附加:`predictedWinnerTeamId` / `predictedDecisionMethod`(如有)
  - 若比赛已结束:展示该模型本场得分 `points`(`ScoreBadge`),并按得分排序。
- loading / error / empty(比赛不存在)。

### 5.4 世界杯信息页(`/info`)

**数据**: `GET /tournaments`(取默认赛事)+ `GET /tournaments/:slug/matches`

- 赛事基本信息:举办国、球队数(48)、总场次(104)、时间区间、状态。
- 赛制简介(小组赛 → 32 强淘汰赛 → … → 决赛),内容取自 `basic-info.md`,静态文案。
- 赛程列表:按 stage / group 分组展示比赛,可按 `status` 过滤;每场可点进 `/matches/{id}`。
- 计分规则简要说明(基础积分 / 淘汰赛附加 / 天眼预测),取自 `idea.md`。

## 6. 趣味标签逻辑(前端派生)

排行榜标签由前端基于排行榜数据计算,纯展示用,英文:

- 第 1 名 → `The Oracle`(神算子)
- `resultAccuracy` 高于阈值(如 ≥ 0.7)→ `Sharpshooter`
- `exactScoreHits` 最高 → `Bullseye`
- 排名靠后或准确率很低 → `Cold Streak`(毒奶)

阈值与措辞集中在 `lib/labels.ts`,便于调整。

## 7. 错误与边界处理

- 每个页面统一 loading / error / empty 三态组件。
- 后端字段可能为 `null`(如未确定球队用 placeholder、未结束比赛无比分):统一在格式化层兜底显示。
- 数值字段(积分、概率)后端为 `DECIMAL` 字符串,前端解析为 number 再格式化。
- 模型头像/国旗按 slug / code 映射到本地 svg,缺图时显示占位。

## 8. 不在本期范围(YAGNI)

- 用户登录、站队、虚拟竞猜(后端用户表本期未实现)。
- AI 辩论室、分享海报、极客透明度面板的深度交互。
- 天眼预测(前三名)专属页面 —— 后端暂无对应只读接口,先不做。
- SSR/SEO 优化、国际化切换 —— 固定英文。

## 9. 验收标准

- `Frontend/` 下 `npm run dev` 可启动,三个核心页 + 信息页可正常访问。
- 在后端运行(`npm run dev` 于根目录)且有种子数据时,各页能拉到真实数据并正确渲染。
- 排行榜可点进模型详情;模型详情/比赛列表可点进比赛详情。
- 无数据/接口报错时显示友好占位,不白屏崩溃。
- `npm run build` 通过,`npm run lint` 与 `tsc` 无错误。
