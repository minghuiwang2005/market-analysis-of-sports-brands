# 商品记录 CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vercel + Neon 商品研究网站中完成可配置 SPU/SKU 字段管理和商品记录新增、查看、修改、归档与恢复。

**Architecture:** Next.js App Router 提供页面及服务端 Route Handlers；Drizzle ORM 通过 Neon Serverless WebSocket 驱动在 Node.js runtime 执行查询和事务。浏览器通过同源 API 读写，Neon 是唯一商品数据源；字段值按 `model_fields` 类型定义保存至类型化 EAV 表。

**Tech Stack:** Next.js App Router、React、TypeScript、Tailwind CSS、Drizzle ORM/Kit、Neon PostgreSQL、Zod、Lucide React。

**Spec:** `docs/superpowers/specs/2026-10-18-vercel-neon-product-catalog-design.md`

## Global Constraints

- 商品、模型字段、字段值及观察数据只持久化在 Neon；不得使用本地 JSON、内存数据或演示商品替代数据库。
- `DATABASE_URL` 只在服务端使用；迁移使用 `DATABASE_URL_UNPOOLED`；`.env.local` 不入 Git。
- 所有 Neon Route Handlers 使用 Next.js 默认 Node.js runtime；需要多语句原子操作时使用受支持的数据库事务。
- 自定义字段和商品“删除”均为归档，不能物理删除字段值、SKU 关系、来源或观察记录。
- SPU 归档和恢复必须按规格在一个数据库事务中同步处理由它级联归档的 SKU。
- SPU/SKU 编码全局唯一；SKU 外键必须指向已存在的 SPU；更新 SKU 不改变所属 SPU。
- 数据表只列活动记录，SKU 摘要按 `created_at DESC, id DESC` 返回最多 5 条。
- 没有数据库配置或数据库不可用时显示可操作的状态说明，不显示假商品。
- UI 使用浅色研究工作台、左侧导航与右侧内容区；蓝色为交互强调色，桌面和窄屏均可操作。
- 未配置认证的应用只用于本机或受保护的私有预览，不以公开生产写入方式部署。

## Review Focus

- 重复商品编码、无效字段类型/选项、必填值缺失：服务端返回字段级错误，不落库。
- 已归档 SPU/SKU：默认读取和写入均不可见；恢复时必须处理唯一编码冲突。
- SPU 级联归档期间数据库失败：事务回滚，SPU 和 SKU 保持操作前状态。
- 单独归档过的 SKU：父 SPU 恢复时不能被错误恢复。
- 空表、无数据库 URL、超长搜索词、无效分页参数：页面保持可用，不泄露 SQL 或连接串。

## Files and Responsibilities

- `src/app/`：Next.js 页面、共享布局和同源 API Route Handlers。
- `src/components/`：导航、表格、表单、详情抽屉、确认框及状态反馈组件。
- `src/lib/db/`：Neon/Drizzle 连接、表结构和数据库工具。
- `src/lib/products/`：字段定义解析、商品校验、服务接口和查询/写入逻辑。
- `drizzle/`：可审阅、版本化的 PostgreSQL SQL 迁移。
- `.env.example`：非敏感配置模板。

## Tasks

### Task 1: Scaffold the Next.js workspace and shared application shell

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, Next.js/TypeScript/Tailwind/PostCSS/ESLint configuration
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/model/page.tsx`
- Create: `src/components/app-shell.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: shared shell with routes `/products/model` and `/products`; a visible active navigation state, responsive mobile navigation, and reusable page heading/status patterns.

- [x] Scaffold a TypeScript App Router project using pnpm, `src/`, Tailwind CSS, ESLint, and the `@/*` import alias; add Lucide React.
- [x] Implement the light research-workbench shell with the two active menu items and a responsive sidebar.
- [x] Add route placeholders with the project’s Chinese product terminology and database-configuration empty state.
- [x] Run `pnpm lint` and `pnpm build`; fix any scaffold or shell errors before proceeding.

### Task 2: Add Neon connectivity, schema and versioned migration

**Files:**
- Create: `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `drizzle.config.ts`
- Create: initial generated migration in `drizzle/` and `drizzle/meta/`
- Create: `.env.example`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Produces: typed Drizzle database access, `model_fields`, cross-level `product_code_registry`, `spu_products`, `sku_products`, typed value tables, source and temporal observation tables; `getDatabase()` reports missing configuration without connecting.

- [x] Add Drizzle ORM/Kit, Neon Serverless and WebSocket runtime dependencies; scripts for `db:generate`, `db:migrate`, `db:check`, `lint`, `typecheck`, and `build`.
- [x] Define tables, indexes, foreign keys, uniqueness, `archived_at`, `archived_with_spu`, typed field value columns and observation-history references.
- [x] Add migration bootstrap rows for immutable system fields and editable starter product fields; do not insert product rows.
- [x] Configure pooled application `DATABASE_URL` and direct migration `DATABASE_URL_UNPOOLED`; keep both server-only.
- [x] Add a safe missing-configuration path so public pages render a setup message without querying local fixtures.
- [x] Review generated SQL and run `pnpm db:check`, `pnpm lint`, and `pnpm typecheck`.

### Task 3: Implement model field management

**Files:**
- Create: `src/app/api/model-fields/route.ts`, `src/app/api/model-fields/[fieldId]/route.ts`
- Create: `src/lib/products/model-field-validation.ts`, `src/lib/products/model-field-service.ts`
- Create: `src/app/products/model/page.tsx`, `src/components/model-fields-page.tsx`

**Interfaces:**
- `GET /api/model-fields?level=spu|sku` returns active model fields; `POST` creates a custom definition.
- `PATCH /api/model-fields/[fieldId]` updates editable attributes; `DELETE` archives a custom field.
- System field keys and types are immutable; model field keys remain stable after creation.

- [x] Implement server-side validation for field key, type, required/unique/search/list flags, and select options.
- [x] Prevent system field archival and reject unsafe type changes when stored values cannot be converted.
- [x] Build grouped SPU/SKU field tables and accessible create/edit/archive forms.
- [x] Show field-level validation and database error states; do not claim a save until Neon confirms it.
- [x] Run lint, typecheck, and build.

### Task 4: Implement SPU/SKU query and CRUD service/API

**Files:**
- Create: `src/lib/products/product-validation.ts`, `src/lib/products/product-service.ts`, `src/lib/products/product-queries.ts`
- Create: `src/app/api/spus/route.ts`, `src/app/api/spus/[spuId]/route.ts`, `src/app/api/spus/[spuId]/restore/route.ts`
- Create: `src/app/api/spus/[spuId]/skus/route.ts`, `src/app/api/skus/[skuId]/route.ts`, `src/app/api/skus/[skuId]/restore/route.ts`

**Interfaces:**
- SPU endpoints provide filtered/paginated list, details with SKU fields, create, update, archive and restore.
- SKU endpoints provide create under an SPU, update without parent reassignment, archive and restore.
- Input shape: `{ spuCode, name, brand, values: Record<string, unknown> }` for SPU; `{ skuCode, name, values: Record<string, unknown> }` for SKU.
- List query accepts `q`, `brand`, `sport`, `category`, `status`, `page`, and `pageSize`; response contains SPU summary, active SKU count, at most five newest active SKU names, total count and pagination metadata.

- [x] Validate system and custom values against active field definitions, including required, type, option, URL/date and uniqueness constraints.
- [x] Persist SPU/SKU values using the appropriate typed column; map PostgreSQL unique/FK errors to understandable responses.
- [x] Implement SPU and SKU details and list queries without N+1 SKU queries; exclude archived rows by default.
- [x] Implement SPU archive/restore and cascaded SKU updates in one WebSocket-backed Drizzle transaction, using `archived_with_spu` to restore only affected SKUs.
- [x] Implement SKU archive/restore without changing parent SPU or observation data.
- [x] Enforce Node.js runtime, parameterized Drizzle queries, request limits, safe error messages, and `updated_at` changes.
- [x] Run lint, typecheck, build, and migration/schema consistency checks.

### Task 5: Build the SPU-first product data CRUD interface

**Files:**
- Modify: `src/app/products/page.tsx`
- Create: `src/components/products-page.tsx`, `src/components/product-detail.tsx`, `src/components/product-form.tsx`, `src/components/archive-confirmation.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Product page consumes the SPU list and model-field APIs; all forms submit to the CRUD APIs and refresh from Neon-confirmed responses.
- SPU row actions: view, edit, archive. SPU detail: custom fields, SKU list, add/edit/archive SKU. Archived view: restore SPU/SKU.

- [x] Build searchable, filterable, paginated SPU table with SPU details, SKU count, newest five SKU names, and empty/loading/error states.
- [x] Build SPU and nested SKU create/edit forms from active field definitions, including per-field errors and pending/success feedback.
- [x] Build details panel showing complete active/archived field values and SKU relations; prevent editing archived records.
- [x] Add archive confirmation that reports the SPU and active SKU count; add archived-record view and restore controls.
- [x] Handle duplicate code, stale record, network failure, missing database and empty Neon results with visible messages.
- [x] Check keyboard access, focus states, touch target size, narrow-screen layout, long names and table readability.
- [x] Run lint, typecheck and production build.

### Task 6: Finish setup documentation and whole-branch review

**Files:**
- Modify: `README.md`
- Review: all files introduced by Tasks 1–5

- [x] Document local setup, Neon environment variables, migration steps, private-preview limitation and available routes.
- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm db:check`, and `pnpm build`; inspect all output.
- [x] Review SQL/data paths for local/demo product fallback, client-side credential exposure, unparameterized inputs, destructive deletes and orphaned SKU/observation data.
- [x] Confirm git diff contains only planned project work and documentation.

## Implementation Notes

- Next.js/Tailwind production compilation uses Webpack with Tailwind's PostCSS plugin. Turbopack's CSS worker could not bind its local process port in the development sandbox; the Webpack build completes successfully.
- No `.env.local` or Neon credentials were present, so real database migrations and persisted CRUD could not run here. The app renders an explicit Neon setup state and uses no sample product records.
- The local preview uses recoverable archive/restore for product deletion so SKU, source, price and availability history stays linked.
