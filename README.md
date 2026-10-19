# 运动品牌研究工作台

面向运动品牌商品研究的中文 Web 工作台。第一阶段以 SPU/SKU 商品模型和商品数据录入为核心，当前没有预置商品样本；模型定义、商品与后续研究观察都保存在 Neon PostgreSQL。

## 功能

- **商品模型**：管理 SPU/SKU 字段的名称、类型、必填、唯一、选项、搜索与列表展示设置。系统字段的编码和类型受保护，自定义字段归档后保留已录入值。
- **商品数据**：以 SPU 为主行搜索、筛选和分页；查看完整商品档案和 SKU 变体，新增、编辑、归档及恢复 SPU/SKU。
- **归档历史**：归档保留字段值、编码、来源和价格/可售观察。归档 SPU 会在同一事务中归档当前启用的 SKU；恢复时只恢复随该 SPU 一起归档的 SKU。
- **数据源**：浏览器只访问同源 Next.js API；Neon 凭据仅在服务端使用。未配置数据库时页面显示设置提示，不回退到本地或演示数据。

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Vercel 部署与本地 Next.js 开发服务器
- Neon PostgreSQL、Drizzle ORM / Drizzle Kit、Neon Serverless WebSocket 驱动
- Zod 服务端校验、Lucide React 图标

## 本地运行

1. 安装 Node.js 和 pnpm，然后安装依赖：

   ```sh
   pnpm install
   ```

2. 在 Neon 创建 PostgreSQL 数据库，复制 `.env.example` 为 `.env.local`。将 Neon 的池化连接串放在 `DATABASE_URL`，直连连接串放在 `DATABASE_URL_UNPOOLED`。这两个变量都只由服务端读取；`WS_NO_BUFFER_UTIL=1` 用于关闭 `ws` 的可选原生 `bufferutil` 优化，避免 Serverless WebSocket 运行时兼容错误。

3. 建立数据库表和初始 SPU/SKU 字段：

   ```sh
   pnpm db:migrate
   ```

4. 启动网站：

   ```sh
   pnpm dev
   ```

   默认打开 `http://localhost:3000`。完成 Neon 配置和迁移前，商品页面保持空状态。

## 页面与 API

| 页面 | 路径 | 用途 |
|---|---|---|
| 商品数据 | `/products` | SPU 主列表、SKU 摘要、详情和 SPU/SKU CRUD |
| 商品模型 | `/products/model` | SPU/SKU 字段定义管理 |

服务端 API 位于 `/api/spus`、`/api/skus` 和 `/api/model-fields`。编码跨 SPU/SKU 全局唯一；SKU 创建时必须隶属于一个有效 SPU。

## 数据库迁移

- `pnpm db:generate`：根据 `src/lib/db/schema.ts` 生成新的版本化迁移。
- `pnpm db:migrate`：使用 `DATABASE_URL_UNPOOLED` 应用尚未执行的迁移。
- `pnpm db:check`：检查迁移序列。

Vercel 的生产构建会在 Next.js 构建前自动运行 `pnpm db:migrate`，使用 `DATABASE_URL_UNPOOLED` 应用尚未执行的迁移。请在 Vercel 项目中将池化和直连 Neon 连接串分别配置为 `DATABASE_URL` 与 `DATABASE_URL_UNPOOLED`。

初始迁移会创建系统字段和可编辑的商品字段定义，不会插入任何 SPU/SKU 商品样本。

## 部署边界

项目已部署到 Vercel 并连接 Neon。项目尚未接入用户认证；在公开部署并开放写入前，需要先接入访问控制并配置对应环境变量。
