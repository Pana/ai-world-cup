# HTTP API

默认地址：

```text
http://localhost:3010
```

响应使用 JSON。参数校验失败返回 `400`，资源不存在返回 `404`，业务冲突返回
`409`，未处理异常返回 `500`。

通用错误格式：

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": []
}
```

## 健康检查

### `GET /health`

检查 API 和数据库连接。

```json
{
  "status": "ok",
  "timestamp": "2026-06-14T00:00:00.000Z"
}
```

## 赛事

### `GET /api/v1/tournaments`

返回赛事列表。

### `GET /api/v1/tournaments/:slug/matches`

查询赛事比赛。

可选查询参数：

| 参数 | 说明 |
| --- | --- |
| `status` | `scheduled/live/finished/postponed/cancelled` |
| `stage` | 阶段代码，例如 `GROUP` |
| `limit` | 1 至 200，默认 104 |

示例：

```text
GET /api/v1/tournaments/world-cup-2026/matches?status=scheduled&limit=20
```

### `GET /api/v1/tournaments/:slug/stages`

返回赛事阶段及各阶段比赛数量。

### `GET /api/v1/tournaments/:slug/leaderboard`

返回活动模型及聚合积分，排序顺序为：

1. 总积分
2. 准确比分命中数
3. 净胜球命中数
4. 胜负平命中率
5. 淘汰赛晋级球队命中数
6. 模型名称

只有活动模型和活动赛事配置会出现在排行榜中。

### `GET /api/v1/tournaments/:slug/prompts`

返回 Prompt 版本，包括：

- 版本号和版本键
- 变更说明和原因
- 发布状态和时间
- System Prompt
- User Prompt 模板
- 输出 JSON Schema
- 已绑定比赛数量

该接口是透明度功能的一部分。若正式产品不希望公开完整模板，应增加权限或提供单独
的公开摘要字段。

### `GET /api/v1/tournaments/:slug/debate`

返回最近比赛的模型预测摘要，前端选择同一场比赛的观点构成焦点对比。

当前接口只是聚合已有预测，不会额外调用模型生成辩论内容。

## 比赛

### `GET /api/v1/matches/:id`

返回比赛详情和全部已发布模型预测。

比赛包含：

- 阶段和小组
- 球队和国旗
- 计划开球时间、球场和城市
- 90 分钟、加时赛和点球比分
- 获胜球队和决胜方式
- 当前 Prompt 版本

预测包含：

- 模型名称和图标
- 预测比分和胜负平
- 主胜、平局、客胜概率
- 信心
- 关键因素和不确定性
- 公开分析摘要
- 淘汰赛晋级球队和决胜方式
- 已获得积分

## 模型

### `GET /api/v1/models`

返回模型目录，包括未启用模型。

### `GET /api/v1/models/:slug`

返回模型资料和预测历史。历史记录包括比赛、预测比分、实际比分、积分、Prompt
版本、推理配置、输入/输出/推理/总 Token 和调用费用。

## 用户

用户接口当前没有账号认证，使用客户端生成的 UUID。只适用于 MVP 和受控活动测试。

### `POST /api/v1/users`

创建或更新用户档案。

请求：

```json
{
  "publicId": "11111111-1111-4111-8111-111111111111",
  "displayName": "World Cup Fan",
  "trustedModelId": 6
}
```

约束：

- `publicId` 必须是 UUID。
- `displayName` 长度为 2 至 40。
- `trustedModelId` 可空。

### `POST /api/v1/users/:publicId/predictions`

提交或更新一场用户比分预测。

```json
{
  "matchId": 1,
  "homeScore": 2,
  "awayScore": 1
}
```

约束：

- 比分必须是 0 至 30 的整数。
- 比赛必须存在。
- 只能在 `scheduled` 状态且开球前提交。
- 同一用户和比赛重复提交会更新预测。

成功响应：

```json
{
  "ok": true
}
```

### `GET /api/v1/users/leaderboard`

返回用户昵称、选择的 AI 军师、预测数和总积分，最多 100 条。

## CORS

当前开发环境允许任意来源。正式环境应在 `backend/src/app.ts` 将 CORS 改为明确的
前端域名白名单。

## 缓存和实时性

API 当前不设置 HTTP 缓存头。前端使用 SWR：

- 排行榜每 60 秒刷新。
- 比赛详情每 60 秒刷新。
- 用户排行榜每 60 秒刷新。

生产环境可以为静态赛事资料增加缓存，但比赛状态、预测和排行榜应使用短缓存或主动
失效。
