# 明星运动员目录实施计划

> **执行方式：** Native，由当前执行者在既有 `main` 工作区逐项实现。

**目标：** 将明星目录接入 Neon，提供总计 15 位（乔丹及另外 14 位）Nike/Jordan 签名鞋 NBA 球员档案与足球、网球、田径建设中页面。

**架构：** Drizzle 定义运动分类、球员、签名鞋关系和来源表；版本化迁移创建表并幂等写入首批资料。server-only 查询层将 Neon 数据组合为页面 DTO；App Router 页面只展示 DTO，旧 `/stars` 入口重定向至篮球页。

**技术栈：** Next.js 16 App Router、React Server Components、TypeScript、Drizzle ORM、Neon Postgres、CSS Modules、Next Image。

**规格：** `docs/superpowers/specs/2026-10-30-stars-sports-athlete-catalog-design.md`

## 全局约束

- “明星”一级菜单的二级菜单顺序为篮球、足球、网球、田径。
- `/stars/basketball` 展示乔丹及另外 14 位 NBA 球员；本名单共 15 位，是首批样本，不宣称穷尽 NBA 历史。
- 目录资料只从 Neon 读取；Neon 查询或迁移失败时显示明确错误，不以页面常量伪装数据成功。
- 只发布拥有可追溯签名鞋证据、图片源页面和许可信息的档案；其余图片使用占位。
- 足球、网球、田径在 Neon 分类状态为 `coming_soon`，不显示虚构档案。
- 不新增公开 CRUD、搜索、筛选或第三方服务依赖。

## 重点检查情形

- Neon 未配置或查询失败时，用户看到可理解的错误提示，不看到硬编码档案。
- `active` 分类没有已发布球员时，视为数据完整性错误。
- 图片 URL 缺失或图片加载失败时，档案文字与来源仍可读，并出现占位图。
- 图片没有完整来源、署名、许可及许可链接时，不请求远程图片。
- 已终止的签名鞋系列与仍在推出的系列分组清楚，不把历史代言写成当前合作。

## 文件职责

- `src/lib/db/schema.ts`：四张明星目录表及索引、约束。
- `drizzle/0004_*.sql` 至 `0006_*.sql` 与 `drizzle/meta/*`：分类、球员、签名鞋、来源和署名修订迁移。
- `src/lib/stars/queries.ts`：只在服务端读取分类目录并组装 DTO。
- `src/components/app-shell.tsx`：明星下拉导航与子路由高亮。
- `src/app/stars/page.tsx`：兼容旧链接并重定向。
- `src/app/stars/[sport]/page.tsx`、`page.module.css`：篮球目录、球员卡片、其它运动分类及建设中状态。
- `src/components/stars/licensed-portrait.tsx`：有错误占位状态的授权人物图片组件。
- `next.config.ts`：限定允许读取的 Wikimedia Commons 图片路径。

## 实施任务

### Task 1：明星目录数据模型与 Neon 首批种子

**文件：** 修改 `src/lib/db/schema.ts`；新增 Drizzle migration 与对应 meta snapshot。

- [x] 定义 `star_sports`、`star_athletes`、`athlete_shoe_lines`、`athlete_sources`，使用外键、唯一约束、检查约束及查询索引。
- [x] 为乔丹已有档案增加可存储生涯亮点和代表鞋款资料的 JSON 字段，保留现有四款鞋图、设计师、年份、说明及许可元数据。
- [x] 迁移写入四个运动分类，以及经核验的 15 位首批 NBA 球员、签名鞋系列、人物资料和来源；按稳定 slug 幂等更新。
- [x] 写入 `checked_at` 和来源 `verification_status`；只将证据和图片许可齐备的档案标为公开。
- [x] 静态检查迁移中的条数、外键引用、唯一键和可重复执行语句；不改动已有产品或时间轴表。

### Task 2：服务端 Neon 查询层

**文件：** 新增 `src/lib/stars/queries.ts`。

- [x] 导出 `getStarSportPageData(slug: string)`，返回分类状态、介绍及排好序的已发布球员。
- [x] 同一查询层组合每位球员的签名鞋系列和可公开来源；不得把未核验来源用于展示。
- [x] 对 `coming_soon` 返回分类资料；对 `active` 且没有已发布球员的分类抛出数据完整性错误。
- [x] 对图片 URL 仅在来源、署名、许可证和许可证链接齐备时生成可展示图片字段。

### Task 3：导航、运动分类路由和错误状态

**文件：** 修改 `src/components/app-shell.tsx`；修改 `src/app/stars/page.tsx`；新增 `src/app/stars/[sport]/page.tsx` 和共享分类状态组件。

- [x] 将“球星”改为“明星”，菜单按篮球、足球、网球、田径顺序配置；四条路由分别为 `/stars/basketball`、`/stars/football`、`/stars/tennis`、`/stars/athletics`。
- [x] 确保进入上述任一路由时明星菜单正确高亮，保留现有键盘、触屏和桌面交互。
- [x] `/stars` 用 Next.js Server Component `redirect('/stars/basketball')` 兼容旧入口。
- [x] 分类页使用服务端查询；未知分类走 `notFound()`；数据库配置/读取问题呈现中文错误状态。
- [x] football、tennis、athletics 仅显示 Neon 中的介绍与“资料建设中”。

### Task 4：篮球档案及签名鞋目录

**文件：** `src/app/stars/[sport]/page.tsx`、`page.module.css` 和球星图片组件。

- [x] 将现有乔丹介绍、档案数字、Air Jordan 1/3/11/13 代表鞋款与来源署名从组件常量迁入 Neon 内容，并以乔丹作为页首代表档案。
- [x] 在同页呈现另外 14 位已核验球员卡片，按当前签名鞋系列与历史系列分组。
- [x] 球员卡展示照片/许可占位、姓名、联盟/位置、签名鞋系列、当前或历史关系标记及资料来源链接。
- [x] 保留署名和许可链接；图片加载失败不影响档案文字和来源链接。
- [x] 页面适配移动端与桌面端，沿用现有档案页的字体、留白、卡片边界和色彩。

### Task 5：交付前检查

- [x] 对照规格逐项确认导航、四个路由、Neon 中 15 人数量、10 个当前/5 个历史系列、来源、图片许可和 Neon 错误状态。
- [x] 运行 `pnpm db:check`、`pnpm typecheck`、`pnpm lint`、`pnpm build`；均通过。
- [x] 运行 `git diff --check` 并扫描迁移/代码是否包含连接串或密钥；未发现。
- [x] 记录交付边界：Neon 迁移已应用；代码尚未提交、推送或部署。
