# AI World Cup Frontend

项目的 Next.js 前端，默认运行在 `http://localhost:3001`，通过
`NEXT_PUBLIC_API_BASE_URL` 访问后端。

## 启动

```bash
cp .env.example .env.local
npm install
npm run dev
```

默认配置：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3010
```

## 页面

| 路径 | 说明 |
| --- | --- |
| `/` | 模型排行榜和近期比赛 |
| `/matches` | 全部赛程、状态和阶段筛选 |
| `/matches/[id]` | 比赛结果、模型预测和用户竞猜 |
| `/models` | 模型列表 |
| `/models/[slug]` | 模型信息、积分曲线和预测历史 |
| `/prompts` | Prompt 版本透明度 |
| `/debate` | 模型观点对比 |
| `/play` | 用户设置、用户排行榜和分享海报 |
| `/info` | 世界杯赛制和计分规则 |

## 数据访问

所有请求封装在 `src/lib/api.ts`，使用 SWR 管理加载、错误和刷新状态。

- 排行榜、比赛详情和互动排行榜每 60 秒刷新。
- API 类型位于 `src/types/api.ts`。
- 默认赛事由 `src/lib/constants.ts` 中的 `TOURNAMENT_SLUG` 指定。

## 素材

- 国旗：`public/flags/`
- 模型图标：`public/models/`

组件会在图片缺失时显示代码或名称缩写。

## 用户互动

当前用户身份是浏览器本地生成的 UUID，保存在 `localStorage`：

```text
ai-world-cup-user-id
ai-world-cup-display-name
ai-world-cup-model-id
```

这是一套活动 MVP 身份机制，不等同于正式账号系统。清理浏览器存储后会丢失本地
身份关联。

分享海报使用浏览器 Canvas 生成 PNG，不需要服务端图片渲染。

## 开发检查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

生产运行：

```bash
npm run build
npm start
```

## 设计约定

- 网站展示文案使用英文。
- 比赛时间由浏览器按本地时区格式化。
- 移动端导航允许横向滚动。
- 正式比分以 90 分钟含补时为主要展示口径。
- 加时赛和点球信息作为淘汰赛补充信息展示。
