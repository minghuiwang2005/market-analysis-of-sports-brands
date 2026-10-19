# 模型参数与管理员访问控制实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Vercel + Neon 运动品牌研究网站增加管理员登录、加密保存的大模型配置卡片，以及定时任务空状态页面。

**Architecture:** Neon 保存模型配置与登录限流记录；服务端环境变量保存单管理员凭据、会话签名密钥和 API Key 加密密钥。Next.js Proxy 对页面请求做快速会话跳转，所有 Route Handler 独立验证会话；模型连接测试在 Node.js 服务端完成，并限制外部目标为经过校验的公共 HTTPS 主机。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、Neon PostgreSQL、Drizzle ORM/Kit、Zod、Node.js `crypto` 与 `https`。

**Spec:** `docs/superpowers/specs/2026-10-18-model-configuration-admin-auth-design.md`

## Global Constraints

- 商品、模型配置和登录限流等应用状态只保存在 Neon；认证凭据和加密密钥只保存在服务端环境变量。
- 单管理员配置使用 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH`、`AUTH_SESSION_SECRET`、`MODEL_API_KEY_ENCRYPTION_KEY`。
- 会话有效期 8 小时；Cookie 使用 `HttpOnly`、`SameSite=Strict`、`Path=/`，生产环境启用 `Secure`。
- 未登录用户不得访问任何业务页面或商品/配置 API；API handler 必须独立校验会话。
- API Key 使用 AES-256-GCM、每次加密使用独立随机 IV；API 响应和日志不包含明文或密文。
- 连接测试只允许标准端口的公共 HTTPS 目标；解析并校验 DNS 地址后固定到该地址连接、保留原主机名 TLS 校验、不跟随重定向。
- 单个启用配置可设为默认；最多一个默认配置，默认配置不可停用后仍保持默认。
- 优先级仅存储供未来路由使用；本期不实现模型路由、对话、自动冷却或任务调度。
- 定时任务页面只展示明确的未启用空状态，不显示虚构任务。
- 本计划不新增或运行自动化测试；实现阶段通过类型检查、构建检查和手动验收场景检查交付。

## Review Focus

- **遗漏认证的现有 API 路由：**逐一访问商品模型、SPU、SKU、恢复接口和配置 API，确认未登录读写均被拒绝（Task 2）。
- **缺少/篡改的会话或错误环境变量：**确认页面跳转至登录、API 返回未认证响应，缺少密钥时认证失败关闭且不回显值（Task 2）。
- **开放重定向、过期和伪造 Cookie：**检查登录 `next` 仅接受站内路径，并确认过期、签名错误 Cookie 不放行（Task 2）。
- **API Key 留空、替换及响应泄漏：**创建、编辑留空、替换、读取配置，确认原 key 保留/更换正确且响应只含掩码（Task 4/5）。
- **不安全模型地址及默认配置并发变更：**尝试私网地址、重定向、超时目标；设置/停用/删除默认配置后确认数据库始终遵守约束（Task 4）。

---

### Task 1: Neon 模型配置与登录限流数据结构

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0001_model_config_auth.sql`（由 Drizzle Kit 生成并审阅）
- Modify: `drizzle/meta/_journal.json`、`drizzle/meta/0001_snapshot.json`（由 Drizzle Kit 生成）

**Interfaces:**
- Produces: `llmModelConfigs` Drizzle 表及 `adminLoginAttempts` 表，供后续认证与配置服务使用。
- `llmModelConfigs` 列遵循规格：配置名、Base URL、模型名、密文/IV/tag/末四位/key version、优先级、超时、深度思考、启用/默认标记、测试结果、创建/更新时间。
- `adminLoginAttempts` 保存 HMAC 来源摘要与失败时间，不保存原始 IP、用户名或密码。

- [ ] **Step 1: 在 Drizzle schema 中定义两张表及数据库约束**

  对模型配置增加正整数 priority、超时范围、测试状态范围、默认配置必须启用的 CHECK 约束；对 `is_default = true` 建部分唯一索引。登录失败表增加来源摘要与时间索引。

- [ ] **Step 2: 生成并审阅数据库迁移**

  运行 `pnpm db:generate`。检查 SQL 只新增预期表、索引和约束；确认迁移没有在生成阶段误改现有商品表。

- [ ] **Step 3: 检查 Drizzle 快照一致性**

  运行 `pnpm db:check`，确认迁移历史与 schema 一致。不要在本任务内连接或更改 Vercel/Neon 生产项目。

**Verification:** `pnpm db:check` 成功；生成迁移只包含本任务的模型配置与登录限流结构。

### Task 2: 管理员认证服务、API 保护与页面访问门

**Files:**
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/guard.ts`
- Create: `src/lib/auth/login-rate-limit.ts`
- Create: `src/proxy.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `scripts/hash-admin-password.mjs`
- Modify: `src/lib/api-response.ts`
- Modify: `package.json`
- Modify: `src/app/api/model-fields/route.ts`
- Modify: `src/app/api/model-fields/[fieldId]/route.ts`
- Modify: `src/app/api/spus/route.ts`
- Modify: `src/app/api/spus/[spuId]/route.ts`
- Modify: `src/app/api/spus/[spuId]/restore/route.ts`
- Modify: `src/app/api/spus/[spuId]/skus/route.ts`
- Modify: `src/app/api/skus/[skuId]/route.ts`
- Modify: `src/app/api/skus/[skuId]/restore/route.ts`

**Interfaces:**
- `hashAdminPassword(password: string): Promise<string>` 与 `verifyAdminPassword(password: string, encodedHash: string): Promise<boolean>`；使用 Node scrypt、随机盐和恒定时间比较。
- `createSessionToken(subject: string, now?: number): string` 与 `verifySessionToken(token: string, now?: number): AdminSession | null`；会话有效期 8 小时，HMAC 签名。
- `requireAdminSession(request: Request): Promise<AdminSession>`；缺少/无效/过期 Cookie 时抛出 401 `AppError`。
- `withAdminApiErrors<T>(request: Request, operation: () => Promise<T>, status?: number): Promise<Response>`；执行会话检查与写操作同源校验，再包装统一 API 错误。
- `checkLoginRateLimit(sourceHash: string): Promise<void>` / `recordLoginFailure(sourceHash: string): Promise<void>`；数据库事务控制每个 HMAC 来源摘要在 15 分钟内最多 5 次失败。

- [ ] **Step 1: 实现管理员密码哈希和验证**

  在 `password.ts` 固定 scrypt 编码格式并解析盐/哈希；无效格式按认证失败处理，不向客户端抛出秘密或内部值。

- [ ] **Step 2: 实现签名会话与服务器端 guard**

  在 `session.ts` 生成/校验 8 小时 HMAC 会话；在 `guard.ts` 校验 Cookie、环境变量和同源写请求。对无效或缺失配置失败关闭。

- [ ] **Step 3: 实现 Neon 持久化登录失败限流**

  从请求的可信来源地址构造 HMAC 摘要；在 Neon 事务中统计最近 15 分钟失败并写入失败记录。达到 5 次后返回限流错误；清理过期记录。

- [ ] **Step 4: 实现登录/退出 Route Handler 与密码生成命令**

  登录只接受服务端配置的管理员用户名/哈希；成功后设安全 Cookie 并返回经校验的站内目标路径。退出校验有效会话后清除 Cookie。新增 `pnpm auth:hash-password` 命令，执行 `node scripts/hash-admin-password.mjs`，终端隐藏输入，密码至少 12 位，输出只生成可写入环境变量的 scrypt 哈希。

- [ ] **Step 5: 对页面加 Proxy 快速检查并保护所有现有 API**

  `src/proxy.ts` 只做签名会话的快速检查和页面重定向，不代替服务端授权；排除登录页、登录/退出 API 和静态资源。安全过滤 `next`，拒绝绝对 URL、协议相对 URL 和站外路径。逐一将上列商品 API 改为 `withAdminApiErrors`，登录/退出接口不使用该 wrapper。

- [ ] **Step 6: 手动检查路由保护边界**

  未登录逐一请求现存商品 API 和访问商品页；确认读写拒绝、页面回到登录页、API 返回 401。再检查过期/篡改 Cookie、错误密码、限流及站外 `next`。

**Verification:** `pnpm typecheck`、`pnpm lint` 成功；上述手动路由场景符合规格。

### Task 3: 登录页面、退出入口与配置导航

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Login form 使用 Task 2 的 `/api/auth/login` 与 `/api/auth/logout`。
- `AppShell` 为已登录业务页面渲染导航；登录页面不显示业务导航。
- 导航分组「配置」包含 `/settings/models`「模型参数」和 `/settings/scheduled-tasks`「定时任务」。

- [ ] **Step 1: 建立登录页与表单状态**

  提供管理员用户名、密码、提交中、错误凭据、限流和缺少环境变量状态；登录成功后跳转到服务端返回的站内目标路径。

- [ ] **Step 2: 增加可展开配置导航和退出按钮**

  依据当前路由高亮配置父项/子项；桌面可展开，移动端关闭抽屉；登录路由只渲染登录页，不显示侧栏；退出调用 `/api/auth/logout` 并跳回登录页。

- [ ] **Step 3: 补齐键盘与窄屏样式**

  沿用现有浅灰画布、白色卡片和蓝色强调样式；为分组按钮添加 `aria-expanded` 与可见焦点，登录表单字段提供明确 label。

- [ ] **Step 4: 手动检查登录交互**

  在桌面及窄屏查看表单、失败反馈、登录跳转、导航展开/收起和退出；确认登录页不出现商品导航内容。

**Verification:** `pnpm typecheck`、`pnpm lint` 成功；登录与导航的手动交互符合规格。

### Task 4: 模型配置加密服务、CRUD API 与安全连接测试

**Files:**
- Create: `src/lib/model-configs/types.ts`
- Create: `src/lib/model-configs/validation.ts`
- Create: `src/lib/model-configs/encryption.ts`
- Create: `src/lib/model-configs/service.ts`
- Create: `src/lib/model-configs/connection-test.ts`
- Create: `src/app/api/settings/models/route.ts`
- Create: `src/app/api/settings/models/[modelId]/route.ts`
- Create: `src/app/api/settings/models/[modelId]/test/route.ts`
- Modify: `src/lib/api-response.ts`

**Interfaces:**
- `encryptApiKey(plaintext: string): EncryptedApiKey` / `decryptApiKey(value: EncryptedApiKey): string`；使用 `MODEL_API_KEY_ENCRYPTION_KEY` 与 AES-256-GCM。
- `listModelConfigs(): Promise<ModelConfigSummary[]>`；返回脱敏卡片 DTO，不包含密文、IV 或认证标签。
- `createModelConfig(input: CreateModelConfigInput): Promise<ModelConfigSummary>`、`updateModelConfig(id: string, input: UpdateModelConfigInput): Promise<ModelConfigSummary>`、`deleteModelConfig(id: string): Promise<void>`。
- `testModelConnection(config: ModelConnectionInput, apiKey: string): Promise<ModelTestResult>`；校验公共 HTTPS 目标、DNS pinning、TLS 主机名和超时，不跟随重定向。

- [ ] **Step 1: 定义服务端输入和脱敏 DTO**

  用 Zod 校验 name、HTTPS Base URL、model、优先级正整数、超时范围 1–180 秒、深度思考与启用/默认状态。为 API 返回定义明确 DTO，类型中不包含任何加密列。

- [ ] **Step 2: 实现 API Key 的 AES-GCM 加解密**

  从十六进制环境变量读取恰好 32 字节密钥；每次生成 12 字节随机 IV，持久化密文、IV、认证标签、key version 和末四位。密钥缺失或认证标签校验失败时返回明确服务端错误，不写明文。

- [ ] **Step 3: 实现 Neon CRUD 与默认配置事务**

  新建时加密 API Key；编辑时空 key 保留旧密钥，新 key 原子替换密文及末四位。设置默认、停用默认、删除默认均在事务中更新；唯一冲突转换为可读 409 错误。

- [ ] **Step 4: 实现防 SSRF 的模型连接测试**

  仅允许 HTTPS 标准端口、无 URL 用户信息的公网主机；解析并拒绝本地/私网/保留地址，再固定校验后的地址发起 `https` 请求，保留原 hostname 的 TLS 校验且禁用重定向。调用兼容 Chat Completions 的最小请求，限制请求体/响应体与超时，错误摘要清理凭据。

- [ ] **Step 5: 实现受保护配置与测试 API**

  添加列表/创建、单项读取/更新/删除、连接测试 Route Handler；统一使用 `withAdminApiErrors` 和 Zod 校验。测试仅在显式调用测试 endpoint 时发生，返回脱敏状态并更新最近测试字段。

- [ ] **Step 6: 手动检查敏感数据及失败边界**

  检查数据库中 key 为密文；读取 API/浏览器网络响应不含密文和 key；错误密钥、空值编辑、新 key 替换、私网/非 HTTPS/重定向/超时以及默认配置启停删除均符合规格。

**Verification:** `pnpm typecheck`、`pnpm lint` 成功；数据库迁移与手动配置 API 场景符合规格。

### Task 5: 模型参数卡片页与管理表单

**Files:**
- Create: `src/app/settings/models/page.tsx`
- Create: `src/components/model-configs/model-configs-page.tsx`
- Create: `src/components/model-configs/model-config-card.tsx`
- Create: `src/components/model-configs/model-config-form.tsx`
- Modify: `src/app/globals.css`
- Reuse: `src/lib/api-client.ts`

**Interfaces:**
- 页面只通过 `/api/settings/models` 系列 API 读取和修改配置。
- 卡片 DTO 由 Task 4 的 `ModelConfigSummary` 提供。
- 表单新建提交 API Key；编辑时空 key 意味着保留，不把已有密钥填回表单。

- [ ] **Step 1: 建立模型参数页、加载和空状态**

  页面说明模型服务配置与密钥保存方式；加载真实 Neon 列表，明确处理加载、空、数据库错误和未登录状态。

- [ ] **Step 2: 建立响应式配置卡片**

  显示名称/提供方、默认标记、启用与最近测试状态、Base URL、模型、掩码 key、优先级、超时、深度思考、最近测试和只读「冷却至 —」。宽屏采用双列或多列，窄屏单列。

- [ ] **Step 3: 建立新增/编辑表单**

  表单覆盖服务名称、Base URL、模型、API Key、优先级、超时、深度思考、启用和默认选项；显示服务端字段错误；编辑 key 留空不替换。

- [ ] **Step 4: 接入卡片操作**

  实现测试、编辑、启停、设为默认和二次确认删除；测试期间禁用重复提交并展示最近结果；删除默认项时确认提示默认配置将为空。

- [ ] **Step 5: 手动检查卡片 CRUD 和密钥脱敏**

  在宽屏及窄屏创建、读取、编辑、测试、启停、设默认和删除模型；确认页面与网络响应从不显示完整 API Key。

**Verification:** `pnpm typecheck`、`pnpm lint`、`pnpm build` 成功；模型卡片与表单手动场景符合规格。

### Task 6: 定时任务空状态、环境变量文档与最终检查

**Files:**
- Create: `src/app/settings/scheduled-tasks/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- 路由 `/settings/scheduled-tasks` 使用 Task 3 中的配置导航及页面保护。
- `.env.example` 只列变量名和说明，不含真实秘密；README 说明本地与 Vercel 配置方式。

- [ ] **Step 1: 建立真实的定时任务未启用状态**

  页面说明定时任务尚未启用，不创建任务 API、不显示示例任务、不添加调度依赖。

- [ ] **Step 2: 更新环境变量示例与部署说明**

  补充管理员用户名、scrypt 哈希、会话秘密及 AES 密钥变量说明；说明如何使用 `pnpm auth:hash-password` 生成哈希，如何在本地 `.env.local` 与 Vercel Production/Preview 设置变量，以及如何运行 Neon 迁移。

- [ ] **Step 3: 做最终静态与手动验收**

  运行 `pnpm typecheck`、`pnpm lint`、`pnpm build`。浏览登录、商品模型/数据、模型参数、定时任务各页面；确认未登录拦截、移动导航、Neon 空状态和错误提示均符合规格。

**Verification:** 三项命令成功；定时任务保持空状态，环境变量文档不泄露任何秘密，整条登录到配置管理流程可用。

## 自审覆盖映射

- 规格中的所有页面均由 Task 3、Task 5、Task 6 覆盖。
- 规格中的认证、会话、全站/API 保护和登录限流由 Task 1、Task 2 覆盖。
- 规格中的模型表、加密/脱敏、CRUD、默认配置和连接测试安全限制由 Task 1、Task 4、Task 5 覆盖。
- 规格中的 Neon 迁移、环境变量、Vercel 设置说明与无数据/错误状态由 Task 1、Task 5、Task 6 覆盖。
- 规格明确排除的对话调用、自动路由、自动冷却和定时调度均未被纳入实施任务。
