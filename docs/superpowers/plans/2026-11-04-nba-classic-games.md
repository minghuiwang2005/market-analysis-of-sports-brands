# NBA 经典比赛卡片实施计划

> **执行方式：** 使用 `superpowers:executing-plans` 在当前 main 工作区按任务实施。

**目标：** NBA 页面 `01 / OVERVIEW` 标题去掉句号、移除时间轴说明文案，并在概览下展示三场有 NBA 官方来源的经典比赛卡片。

**架构：** Neon 增加经典比赛和来源表，并通过迁移录入三场比赛；服务端查询仅读取已发布比赛及已核验来源。NBA 页面在 `Suspense` 区域呈现三张响应式卡片，延续现有黑、红、奶油色视觉体系。

**技术栈：** Next.js 16.4.2 App Router、React Server Components、Drizzle ORM、Neon PostgreSQL、CSS Modules。

**规格：** 用户本轮 NBA 页面调整需求及随附页面截图。

## 全局约束

- 遵守仓库 `AGENTS.md`，修改前查阅本项目已安装 Next.js 版本的对应文档。
- 内容与来源记录保存在 Neon，不在页面组件内硬编码比赛目录。
- 经典比赛卡片必须只依据已核验来源描述，来源入口指向 NBA 官方页面。
- 本轮只修改 NBA 页面所需数据、查询与界面，不提交或推送代码。
- 受上级执行约束，本轮不添加或运行测试；以类型检查、构建与 diff 检查验证改动。

## 评审重点

- 数据库迁移可重复执行，且种子记录具备稳定唯一键。
- 未发布比赛或缺少已核验来源时，不会出现在公开卡片中。
- Neon 暂不可用时，卡片区给出明确状态，不影响静态 NBA 概览和时间轴。
- 窄屏下三张卡片自然堆叠，标题与比分不发生横向溢出。
- 三场比赛的赛果、关键节点及年份均与所列 NBA 来源一致。

---

### 任务 1：新增 Neon 经典比赛与来源数据

**文件：**
- 修改：`src/lib/db/schema.ts`
- 新增迁移：`drizzle/0009_nba_classic_games.sql`（编号以仓库当前迁移序列为准）
- 修改：`drizzle/meta/_journal.json`

**接口：**
- 提供 `nbaClassicGames` 和 `nbaClassicGameSources` Drizzle 表定义。
- 用稳定 event key 录入 1970 总决赛第三场、1998 总决赛第六场、2013 总决赛第六场及各自 NBA 官方来源。

- [x] 建表并添加约束、索引及带 `ON CONFLICT` 的种子迁移。
- [x] 按仓库迁移机制登记并应用两条迁移；Neon 确认三条已发布比赛各有核验来源，2013 年赛果另有 NBA 官方比赛记录链接。

### 任务 2：服务端读取并呈现概览卡片

**文件：**
- 修改：`src/lib/sports-timeline/queries.ts`
- 修改：`src/app/sports/nba/page.tsx`
- 修改：`src/app/sports/nba/page.module.css`

**接口：**
- 新增 `getNbaClassicGames()`，返回比赛显示字段及核验通过的来源列表，按年份升序排列。
- 新增独立 `Suspense` 内容区；失败与空列表均提供可理解的状态文本。

- [x] 移除 `01 / OVERVIEW` 文案末尾句号及指定的时间轴解释段。
- [x] 在概览标题下方新增三列桌面卡片、窄屏单列卡片，展示年份、总决赛场次、对阵赛果、比赛简介和来源链接。

### 任务 3：完成静态检查与人工代码核对

**文件：** 本计划涉及的全部代码及迁移文件。

- [x] 使用缓存 Node 直接运行 TypeScript 检查与 Next 生产构建，均通过；`git diff --check` 通过。
- [x] 核对迁移顺序、来源核验筛选和最终 diff；本地登录预览确认三张卡片及原有时间轴均能从 Neon 正常渲染；未运行测试。
