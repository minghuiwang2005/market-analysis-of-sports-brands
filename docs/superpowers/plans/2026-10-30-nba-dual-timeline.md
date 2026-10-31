# NBA 双轨历史时间轴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/sports/nba` 改为以 Neon 数据驱动、从现在倒序至 1946 年的双轨时间轴，左侧显示 NBA 大事件，右侧显示有来源支持的 Nike/Jordan 球星签约事件。

**Architecture:** 在 Drizzle schema 增加通用体育时间轴事件及来源表，用一条 migration 保留并迁移现有 NBA 事件、加入核验后的签约事件；server-only 查询层将记录按年份聚合，页面用中央轴线呈现两条轨道。桌面端轴线居中，窄屏轴线移至左边并改为单列布局。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Drizzle ORM、Neon PostgreSQL、CSS Modules。

**Spec:** `docs/superpowers/specs/2026-10-30-nba-dual-timeline-design.md`

## Global Constraints

- NBA 事件与球星签约事件都从 Neon 读取，React 页面不包含事件事实常量。
- 年份组从最近到最早排序，覆盖 1946 年；仅渲染存在事件的年份。
- 桌面中轴两侧分别为 NBA 事件和球星签约；窄屏改为单列并保持由新到旧。
- 不把首代签名鞋发售时间、首次穿着品牌鞋或仍在销售的鞋款误作签约时间。
- 只显示来源明确支持的日期精度；来源不支持精确日期时不推测日/月。
- 每个已发布事件至少有一条来源支持其事实主张；待复核事件不公开显示。
- 不增加公众 CRUD、管理后台或其它运动项目内容。
- 本计划不包含新增或执行自动化测试。

## Review Focus

- 月份/日期未知的事件：页面只显示来源支持的年份或年月，不将存储精度扩写成假日期。
- 同一年左右两侧都有事件：聚合到同一年节点，左右栏保持同序对齐。
- 同一年同一侧多事件：按年月日精度与稳定 sort order 排列，重复执行迁移不重复插入。
- 已有 NBA 条目：14 条精选事件的年份、文案、类别和来源迁移后均有对应 Neon 记录。
- Neon 未配置或查询失败：展示应用数据库错误状态，不回退到静态数组伪装成成功。

---

## 文件与边界

- `src/lib/db/schema.ts`：只定义时间轴事件和来源的数据结构、索引、检查约束。
- `drizzle/0002_*.sql` 与 `drizzle/meta/*`：由 Drizzle 生成并补充稳定种子数据和来源记录。
- `src/lib/sports-timeline/queries.ts`：server-only 查询、排序和按年份分组；不负责页面格式化。
- `src/app/sports/nba/page.tsx`：保留介绍区，读取服务端数据并输出两轨语义结构；删除静态 `events` 常量。
- `src/app/sports/nba/page.module.css`：实现桌面居中轴线、左右事件轨道、类别色、签约色和窄屏单列。

## 执行任务

### Task 1: 核验并整理 Neon 时间轴种子资料

**Files:**
- Read: `src/app/sports/nba/page.tsx`
- Read: `docs/superpowers/specs/2026-10-30-nba-dual-timeline-design.md`
- Output: `drizzle/0002_*.sql` 中的事件与来源 seed（在 Task 2 生成 schema migration 后补入）

**Interfaces:**
- Consumes: 设计稿中 `league_milestone` / `athlete_signing` 事件类别与来源标准。
- Produces: 一组可写入数据库的 NBA 事件、球星签约事件和来源记录；稳定 event key 用于 migration 幂等。

- [x] **Step 1: 建立现有 NBA 事件迁移清单**

  逐条复制当前页面中 14 个事件的年份、日期说明、标题、描述、类别及来源 URL；逐项对照确保无漏项或字段错配。

- [x] **Step 2: 核验并录入球星签约来源**

  以可支持“签约/合作公告”的官方资料或可信的一手同期资料为准。记录球星、Nike/Jordan 品牌、公开日期精度、中文事件标题/说明、来源标题、发布方、URL、证据摘要和核验状态。日期不清楚的资料不生成 `athlete_signing` 事件，也不以签名鞋发售年份代替。

- [x] **Step 3: 生成稳定且去重的事件键**

  为迁入的 NBA 事件及核验签约事件分配稳定 `event_key`；相同键的重新应用必须更新或忽略现有记录，不新增重复行。

**Deliverable:** 可直接作为 Drizzle SQL migration 种子的事件/来源记录；左侧保留现有 14 条 NBA 节点，右侧只加入有签约证据的档案。

### Task 2: 建立 Neon 时间轴 schema 与迁移

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0002_*.sql` 与后续约束修正 migration `drizzle/0003_*.sql`（由 Drizzle 生成）
- Modify: `drizzle/meta/_journal.json` 与生成的 snapshot（由 Drizzle 更新）

**Interfaces:**
- Consumes: Task 1 的事件键、字段值和来源记录。
- Produces: `sportsTimelineEvents` 与 `sportsTimelineEventSources` Drizzle 表定义和可迁移 PostgreSQL 结构。

- [x] **Step 1: 在 schema 中定义事件表**

  定义字段 `id`, `eventKey`, `sport`, `eventType`, `category`, `occurredYear`, `occurredMonth`, `occurredDay`, `datePrecision`, `athleteNameZh`, `athleteNameEn`, `organization`, `title`, `description`, `sortOrder`, `published`, `createdAt`, `updatedAt`。`eventKey` 唯一；年份必填；月份限制 1–12、日期限制 1–31，并以 SQL check 确保 day 不能脱离 month、`datePrecision` 与已提供日期列一致。`eventType` 限制为 `league_milestone` 或 `athlete_signing`；球员/品牌字段仅签约事件必填。

- [x] **Step 2: 定义事件来源表**

  定义字段 `id`, `eventId`, `url`, `publisher`, `sourceTitle`, `publishedAt`, `claimScope`, `evidenceNote`, `checkedAt`, `verificationStatus`, `createdAt`。`eventId` 外键使用 restrict；核验状态限制为 `verified` 或 `needs_review`。

- [x] **Step 3: 添加查询索引与公开数据一致性约束**

  为 `(sport, published, occurredYear, sortOrder)` 建查询索引，为 `(eventId, verificationStatus)` 建来源索引；已发布事件必须至少拥有一条 verified 来源。若不能用普通 check 约束保证跨表条件，则在查询层排除无核验来源的事件，并在 seed 清单审查中确保约束满足。

- [x] **Step 4: 生成并整理数据库迁移**

  执行 `pnpm db:generate`，检查生成的 `drizzle/0002_*.sql` 与 schema 差异；向 migration 增加 Task 1 的幂等种子 SQL。保留 Drizzle journal 和 snapshot 更新，不手改历史 migration。

- [x] **Step 5: 静态核对迁移**

  用 `pnpm db:check` 检查 migration 序列，并核对 SQL 中 14 条 NBA 事件及全部核验来源记录的稳定 key、精度和字段值。

**Deliverable:** 新 Neon 表和可重复部署的迁移，能保存现有 NBA 历史事件、来源与已核验签约事件。

### Task 3: 创建 server-only 时间轴查询层

**Files:**
- Create: `src/lib/sports-timeline/queries.ts`
- Read: `src/lib/db/index.ts`
- Read: `src/lib/db/schema.ts`

**Interfaces:**
- Consumes: Task 2 的 `sportsTimelineEvents` / `sportsTimelineEventSources` schema。
- Produces: `getSportsTimelineGroups(sport: "nba"): Promise<TimelineYearGroup[]>`。
- `TimelineYearGroup = { year: number; nbaEvents: TimelineEvent[]; signingEvents: TimelineEvent[] }`。
- `TimelineEvent = { id: string; eventType: "league_milestone" | "athlete_signing"; category: string; occurredYear: number; occurredMonth: number | null; occurredDay: number | null; datePrecision: "year" | "month" | "day"; athleteNameZh: string | null; athleteNameEn: string | null; organization: string | null; title: string; description: string; sources: { url: string; publisher: string; sourceTitle: string; evidenceNote: string }[] }`。

- [x] **Step 1: 定义服务端时间轴 DTO**

  在查询模块导出上述两个类型；模块顶部导入 `server-only`。

- [x] **Step 2: 查询可公开展示的事件和核验来源**

  使用 `getDatabase()` 查询 `sport = "nba"` 且 `published = true` 的事件；只有存在至少一条 `verificationStatus = "verified"` 来源的事件才能返回。连接/查询错误向上抛出，由既有应用错误边界处理，不捕获后返回静态默认数据。

- [x] **Step 3: 排序并按年份分组**

  先按 `occurredYear DESC`，再按有值的 `occurredMonth DESC`、`occurredDay DESC`、`sortOrder ASC` 和稳定 `eventKey ASC` 排序。组内按 `eventType` 分派为 NBA 与签约轨道；不为没有事件的年份插入占位组。

**Deliverable:** 页面只需调用一个有类型的函数，即可得到倒序年份节点及两侧事件和来源。

### Task 4: 改造 NBA 页面语义结构

**Files:**
- Modify: `src/app/sports/nba/page.tsx`

**Interfaces:**
- Consumes: Task 3 的 `getSportsTimelineGroups("nba")` 与 `TimelineYearGroup[]`。
- Produces: 服务端渲染的 NBA 介绍区和分组时间轴；不包含事件事实静态数组。

- [x] **Step 1: 移除 `events` 页面常量**

  删除 `events` 中的内嵌事实；保留事件分类图例定义，或将显示名映射移到同文件中的纯呈现常量，不把数据来源事实放回页面。

- [x] **Step 2: 读取 Neon 分组并输出语义结构**

  将 `NbaPage` 改为异步 server component，调用查询函数。用 `<ol>` 呈现年份组，每个组含中轴节点、左栏 NBA 事件列表和右栏签约事件列表；年份作为 `<li>` 的可访问标题。

- [x] **Step 3: 实现事件卡展示和来源链接**

  为每张卡显示精度正确的年份/年月/日期、类型/类别、标题、说明及来源链接。外链使用 `target="_blank"`、`rel="noopener noreferrer"`；事件颜色通过 `data-category` 或 `data-event-type` 映射 CSS，不通过标题内容判断。

- [x] **Step 4: 处理无数据与数据库错误**

  对已查询成功但事件为空的结果显示空状态；数据库错误按项目既有数据库错误展示约定向上交给页面边界，不渲染硬编码事件列表。

**Deliverable:** 数据从 Neon 到页面卡片的完整服务端呈现链路，事件文本不再散落于 TSX。

### Task 5: 实现中央轴线与响应式双轨视觉

**Files:**
- Modify: `src/app/sports/nba/page.module.css`

**Interfaces:**
- Consumes: Task 4 的年份组、`data-category`、`data-event-type` 和左右轨道 class。
- Produces: 大屏居中轴线及窄屏单列时间轴样式。

- [x] **Step 1: 建立三列年份节点布局**

  使用左右等宽轨道和固定中轴列；年份组作为 CSS grid 三列，中央轴线与节点位于第二列，NBA 卡位于第一列，签约卡位于第三列。卡片宽度允许换行，来源链接和长中文名不撑破网格。

- [x] **Step 2: 按事件类别设置色彩**

  保留现有五个 NBA 类别色映射；新增统一签约色和图例项。颜色同时配合类别文字标签呈现。

- [x] **Step 3: 将窄屏改为左轴单列**

  在窄屏断点下将中央轴移到内容左边，按 `ol` 源顺序渲染年份组；两类事件垂直排列并保留标签，隐藏桌面端空侧占位。

- [x] **Step 4: 删除旧单轨样式**

  移除已不使用的单列卡片定位与移动端年份重排样式，确认 CSS class 与 TSX 对应。

**Deliverable:** 桌面版轴线居中、NBA 事件在左、签约事件在右；窄屏阅读顺序仍由新到旧。

### Task 6: 完成交付前的静态审阅

**Files:**
- Review: `src/lib/db/schema.ts`
- Review: `drizzle/0002_*.sql`
- Review: `src/lib/sports-timeline/queries.ts`
- Review: `src/app/sports/nba/page.tsx`
- Review: `src/app/sports/nba/page.module.css`

- [x] **Step 1: 按 Review Focus 逐项核对实现与数据**

  核对日期精度、同年左右分组、同侧稳定顺序、既有 14 条 NBA 节点保留、以及 DB 不可用时没有静态数据回退。

- [x] **Step 2: 检查改动范围和格式**

  确认没有更改登录配置、商品模块或模型参数；保留其他未提交工作区修改，不覆盖与本功能无关的文件。

**Deliverable:** 可交由用户审阅的实现 diff 与数据迁移；本计划不包含新增或执行自动化测试。
