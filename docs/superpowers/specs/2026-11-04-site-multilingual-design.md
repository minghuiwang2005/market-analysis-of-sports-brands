# 网站中英文支持设计

## 目标

在不改变现有页面 URL 的前提下，为运动品牌数据平台增加中文和英文界面。用户可在顶部导航栏切换语言；切换后浏览器刷新当前页面，后续导航继续使用所选语言。

## 已确认范围

- 支持语言：简体中文（`zh`）和英文（`en`）；新用户默认中文。
- 在顶部导航栏的“配置”右侧、退出按钮之前显示“中文 / EN”切换控件，并标示当前语言。
- 语言偏好使用站点 Cookie 保存，不修改页面地址。切换后整页重新加载相同路径和查询参数。
- 翻译全站系统界面、导航、表单、空态、错误提示、页面标题与元数据；NBA 时间轴、经典比赛和明星档案的编辑资料也提供英文。
- 商品名称、用户录入的字段值和用户自定义模型字段名不自动翻译。平台自带字段名、字段类型和固定状态文案按稳定 key 翻译。
- Neon 仍是动态研究资料的唯一数据源；不使用浏览器内机器翻译。

## 语言偏好与页面刷新

1. 使用 `site_locale` Cookie，值限定为 `zh` 或 `en`。缺失、损坏或不支持的值均回退为 `zh`。
2. 由 Route Handler 校验切换请求并写入 Cookie：`path=/`、`sameSite=lax`、`httpOnly`、一年有效期；生产环境设置 `secure`。
3. 顶部切换控件向 Route Handler 提交目标语言。写入成功后调用浏览器完整页面刷新，保留当前 pathname 与 query string；失败时保留当前页面并给出当前语言的错误提示。
4. 现有 `proxy` 读取 Cookie，并将页面请求内部改写到 `/{locale}/...` 页面树；浏览器看到的 pathname/query string 不变。API、静态资源不参与改写。已带内部 locale 前缀的 Next 预取请求经过鉴权后直接放行，不重复添加前缀。
5. UI 页面统一移入 `app/[locale]/...`，Route Handler 保留在 `app/api/...`。locale layout 静态生成 `zh` / `en` 两个受支持参数，从 route params 读取语言，设置 `<html lang="zh-Hans">` 或 `<html lang="en">`，供 Server Component 选择文案；共享客户端 Provider 将 locale 与翻译函数提供给 Client Component。
6. 所有站内页面链接通过 `LocaleLink` 同时提供内部 locale 路由和公开的原始地址，保证 Next Proxy 重写下的预取和显示地址一致。客户端导航不会改 Cookie，用户刷新、跳转或重新登录后仍保持语言。
7. Vercel Proxy 在 CDN 缓存前运行；内部目标路径包含 locale，以中文/英文分开生成页面结果。部署验收检查两种语言连续访问相同公开 URL 时不会串语言。

Proxy 先保留当前鉴权策略：未登录的受保护页面仍回到公开 `/login`，`next` 保存无 locale 前缀的原始路径及查询参数；公开登录页面按 locale Cookie 内部改写。Next 内部 locale 预取目标同样受保护，但通过鉴权后直达 locale route。

该实现保留 Cookie 作为唯一偏好源，也避免在 Root Layout 直接读取请求 Cookie；页面在服务端通过 locale route param 渲染。此模式依据 Next.js 的 locale segment/Proxy 及 Proxy 重写预取约定；Vercel Proxy 在缓存前执行，具体行为在部署验收中核实。参考：[Next.js 国际化路由](https://nextjs.org/docs/app/guides/internationalization)、[Next.js Proxy 重写预取](https://nextjs.org/docs/app/api-reference/components/link)、[Vercel Routing Middleware](https://vercel.com/docs/routing-middleware)。

## 翻译组织与覆盖范围

- 建立有类型约束的中文、英文字典，按导航、商品、模型、分析、设置、NBA、明星、登录和通用状态分区。固定界面文案不在组件中重复硬编码。
- 提供服务端读取 locale/字典的 helper，以及客户端 `useLocale` / `useTranslations` 接口。Server Component 通过 helper 获取 locale；Client Component 从 Provider 读取。
- 全部现有页面需纳入覆盖：商品数据、商品模型、销售数据、分析、NBA、明星四类运动页面、模型参数、定时配置、管理员登录以及共享导航。
- 日期/数字使用 `Intl` 根据当前 locale 格式化；NBA 年份和已有来源信息保持事实值不变。
- API 响应结构保持稳定。客户端常见错误码映射为当前语言的显示文案；未识别错误保留安全的通用本地化提示，不直接将服务器中文错误字符串展示在英文界面。

## Neon 双语研究字段

为不改变事实主键、来源关系和已有中文值，在现有研究表增加可空英文列；查询层按 locale 返回对应展示文案，缺少英文值时按原中文回退，避免记录消失。

- `sports_timeline_events`：增加 `organization_en`、`title_en`、`description_en`。
- `nba_classic_games`：增加 `game_label_en`、`title_en`、`matchup_en`、`result_en`、`description_en`。
- `star_sports`：增加 `intro_en`（分类名沿用已有 `name_en`）。
- `star_athletes`：增加 `league_en`、`position_en`、`teams_summary_en`、`nationality_en`、`bio_en`、`portrait_alt_en` 和 `career_highlights_en`。
- 球鞋系列名、品牌、运动员英文名、来源发布者与来源标题视为专有名词或原始来源文本，原样展示；系列状态、来源类型、统计标签等界面术语由字典翻译。
- 新 migration 对当前已发布 NBA 时间轴、经典比赛与运动员资料提供人工编辑的英文值。所有既有中文列与来源证据原样保留；migration 可重复执行，不重置已维护的英文文案。

## 商品模型与动态字段

- 平台自带字段按 `ModelFieldDto.key` 映射显示名，例如 `category`、`sport`、`series`、`signing_athlete`；原始模型定义及数据库 label 不因显示语言而被改写。
- 固定字段类型、必填/唯一、列表/搜索、归档状态及默认选项有英文字典。
- 用户自定义的 label、选项、商品名称、运动员填写值、SKU 变体值均保持原值，避免覆盖用户数据或臆造翻译。

## 组件边界与数据流

1. `proxy` 校验 locale Cookie，并在执行现有鉴权后把页面请求改写到内部 locale route；API/static 路径按现有路由处理。
2. `app/[locale]/layout.tsx` 用 locale segment 生成 `<html lang>`，提供共享翻译 Provider，并按 locale 生成页面 metadata。
3. AppShell 在现有顶部导航中增加语言切换组件；切换组件调用偏好 Route Handler 并刷新当前 URL。`LocaleLink` 将站内预取发往内部 locale 路径，同时展示原有路径。
4. 页面与复用组件调用对应翻译接口；服务端研究查询接收 locale，并将中英文列组装成明确的展示 DTO。
5. Drizzle schema 与新增迁移描述研究表新增英文列；迁移只新增可空字段及英文数据，不删除或转换现有资料。
6. 鉴权 proxy 保持现有规则；语言偏好 endpoint 只提供 Cookie 写入，不暴露数据库或管理配置。

## 兼容性、错误与安全

- Cookie 值严格限定在受支持的语言；任何无效值回退中文。
- 切换 Route Handler 使用 same-origin POST，不接受任意外部重定向地址；不记录或回显认证 Cookie。
- 切换失败不会丢失当前页面或重置筛选 query 参数。
- 英文资料尚未维护时明确采用中文回退，不返回空白字段，不修改来源 URL 或证据说明。
- 现有中文 URL、登录回跳、筛选参数和 API URL 保持不变。

## 验收标准

1. 顶部“中文 / EN”位于配置菜单右侧、退出按钮左侧，当前语言状态清楚且可键盘操作。
2. 切换语言后发生完整刷新；pathname 和 query string 不变，当前页面、导航与静态文案变为目标语言。
3. 刷新、站内跳转、登出后访问登录页仍保持 Cookie 所选语言。
4. 所有现有页面均有英文界面；NBA 时间轴、经典比赛、明星档案优先显示 Neon 英文文案，缺少时使用中文回退。
5. 商品数据、用户自定义模型字段和既有中文值不被迁移改写；内置字段标签随语言显示。
6. 未登录访问、数据库连接失败和 API 错误等状态也遵守当前语言，并保持现有鉴权行为。
7. 中英文交替访问同一页面地址时内容各自正确，预取、登录回跳和筛选 query 均不改变语言或串用另一语言内容。
8. 修改后的项目通过 TypeScript、ESLint 与 Next.js 生产构建；部署时按既有流程运行 Neon 迁移。

## 暂不包含

- 商品原始名称、任意用户输入和用户自定义字段/选项的自动翻译。
- 第三种语言、自动机器翻译、语言编辑后台和翻译工作流。
- 变更现有页面路径或新增语言前缀。
