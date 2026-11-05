# 明星运动员目录与篮球球星页设计

## 状态

- 阶段：用户已确认，进入实现
- 日期：2026-10-30
- 范围：将“球星”导航改为“明星”，增加运动分类，并以 Neon 作为球员档案与来源记录的唯一结构化数据源。
- 最近更新：2026-11-05，根据用户确认扩充 NBA Nike/Jordan Brand 签名鞋球员目录并移除页面说明文案。

## 目标与成功标准

为 Nike/Jordan 运动品牌研究平台建立可扩展的运动员目录。篮球目录按 NBA 现役及历史球员范围整理已推出个人签名鞋系列或可明确归属的签名型号的球员；本次实现包含 31 位档案，每位展示图片、基本信息、签名鞋系列及资料来源。目录数据从 Neon 读取，不在页面组件中写死球员资料。签名球员名录以 Nike 正式签名球员列表为基线，并纳入有可靠鞋款记录的 Nike/Jordan Brand 历史个人签名系列或型号；不把 PE、单一配色、未发布产品计划当成已推出的个人签名鞋。对于非专属签名系列的历史关联型号，来源证据应说明其边界，避免夸大成持续产品线。

导航中的“明星”与“商品、运动、分析、配置”使用相同的一级菜单样式和交互。下拉菜单包含“篮球、足球、网球、田径”。本期仅建设篮球内容，其他三个分类显示清楚的“资料建设中”状态，不伪造空档案或虚构内容。

## 用户与研究目标

页面服务研究者浏览运动员与签名鞋品牌关系，并为后续研究扩展数据。档案必须区分当前合作与历史合作；“穿着某品牌球鞋”不能单独证明其拥有个人签名鞋。每条档案都要提供可追溯来源，图片也须保存图片来源和授权信息。

## 方案比较与选择

1. **继续静态维护球员常量**：改动最少，但不符合全数据源落 Neon 的项目约束，也不利于日后维护和资料核验。
2. **只在 Neon 保存球员基本资料**：解决硬编码，但签名鞋与来源无法独立追溯，合作状态和图片授权也容易丢失。
3. **推荐：Neon 维护运动分类、球员档案、签名鞋关系和来源/图片署名记录**：用外键表达关系、用来源实体记录核验证据；页面只负责读取和呈现，方便未来增加足球、网球和田径，并支持每个事实有自己的来源。

选择方案 3。由于首期只有篮球种子资料，不增加通用内容管理后台或面向公众的 CRUD；之后如需由管理员编辑，另行设计管理功能与权限。

## 页面与导航

### 导航

- 顶层名称由“球星”改为“明星”。
- “明星”作为与其它一级菜单相同的下拉菜单，列表顺序为：篮球、足球、网球、田径。
- 桌面端沿用现有 hover/focus 展开方式；触屏和窄屏沿用现有点击展开行为；支持 Escape 收起、当前路由高亮及键盘访问。
- 在 `src/components/app-shell.tsx` 的 `navGroups` 中定义明星菜单，篮球链接 `/stars/basketball`，其他分类分别为 `/stars/football`、`/stars/tennis`、`/stars/athletics`。
- `/stars` 旧入口重定向至 `/stars/basketball`，避免旧书签失效。

### 页面结构

- `/stars/basketball`：篮球目录页。页面顶部用乔丹作为首个代表档案，保留现有乔丹生涯介绍与 Air Jordan 代表鞋型内容；其后展示球员卡片目录，卡片包含球员照片、姓名、中英文名、位置、NBA 球队/时期、签名鞋品牌与系列、合作状态及资料来源链接。
- 卡片按当前合作、历史合作分组；组内按配置的展示顺序排列。筛选、搜索、分页和用户编辑均不属于本期范围。
- 所有运动分类只通过顶部“明星”菜单下拉项切换；页面内容区不再重复显示篮球、足球、网球、田径切换标签。
- 页面移除介绍性方法说明、分组免责声明和“首批样本”声明；目录仅保留标题、人数和球员事实资料。
- 首次目录的 15 人名单继续保留，并新增 David Robinson、Charles Barkley、Penny Hardaway、Jason Kidd、Scottie Pippen、Alonzo Mourning、Kevin Garnett、Gary Payton、Tim Duncan、Vince Carter、Dwyane Wade、Dennis Rodman、Chris Webber、Tim Hardaway、Steve Nash、Paul Pierce，共 31 位。每条签名鞋关系和图片授权遵循同一来源核验标准；Steve Nash 条目标为单一历史签名型号，Rodman 条目区分正式签名鞋与球员关联款。
- `/stars/football`、`/stars/tennis`、`/stars/athletics`：读取分类及状态，显示分类介绍和“资料建设中”提示，页面框架保持统一，待后续有经过核验的数据再开放档案卡片。

## 数据流与组件边界

1. Drizzle schema 描述 Neon 中的分类、运动员、签名鞋关系、资料来源与图片署名表。
2. 新增版本化 Drizzle migration，建立表、唯一约束、外键、查询索引；种子行随同迁移写入 Neon，避免部署后还需手工填充。种子采用稳定 slug 并以 upsert/冲突忽略保证重复部署安全。
3. 新建 server-only 查询层，从 `getDatabase()` 读取分类与有效球员档案；页面不得直接引用静态球员数组。资料查询按运动分类及 `sort_order` 排序，并将签名鞋关系、来源、图片署名组合为页面 DTO。
4. 页面组件拆分为目录页、乔丹代表档案区、运动员卡片、分类占位页。组件只接收结构化数据，不内嵌事实资料。
5. 图片文件不作为 Postgres 大对象保存；Neon 行中存图片 URL、来源 URL、作者/权利人、许可证名称与许可证链接。无可确认展示授权的图片不能直接发布；显示本地生成的文字/图形占位，不回退到未经核实的第三方 CDN 照片。

## Neon 数据模型提案

字段用 Drizzle/Postgres snake_case 命名；所有表使用 UUID 主键及 `created_at`、`updated_at` 时间戳。

### `star_sports`

- `id`：UUID 主键
- `slug`：唯一键，篮球、足球、网球、田径使用稳定英文 slug
- `name_zh`、`name_en`：分类展示名
- `sort_order`：导航和展示顺序
- `content_status`：`active` 或 `coming_soon`
- `intro`：简短分类说明，可空

### `star_athletes`

- `id`：UUID 主键；`slug`：唯一键，用于稳定识别
- `sport_id`：必填外键至 `star_sports`
- `name_zh`、`name_en`：中英文名
- `league`、`position`：联盟与场上位置，可空
- `teams_summary`：球队/时期摘要，可空；按历史事实描述，不代表当前效力
- `nationality`、`birth_date`、`height_cm`、`jersey_number`：可空的基本资料
- `bio`：中文简介
- `portrait_url`、`portrait_source_url`：图片及源页面 URL
- `portrait_credit`、`portrait_license`、`portrait_license_url`：署名和授权信息，可空；为空时不展示远程图片
- `sort_order`、`published`：顺序与是否公开
- 时间戳

### `athlete_shoe_lines`

- `id`：UUID 主键；`athlete_id`：必填外键
- `brand`：Nike 或 Jordan Brand
- `line_name`：如 Air Jordan、LeBron、Kobe、KD、Freak、JA、Book、PG、Melo、CP3、Why Not、Luka、Tatum、Zion
- `relationship_status`：`current` 或 `historical`，代表当前资料核验时的合作阶段
- `started_year`、`ended_year`：可空；只有可靠来源支持时才填
- `representative_models`：JSON 数组，存具有来源支持的系列型号及年份，不替代关系来源
- `sort_order`：卡片中鞋款系列顺序
- 时间戳

### `athlete_sources`

- `id`：UUID 主键；`athlete_id`：必填外键；`shoe_line_id`：可空外键
- `source_url`、`publisher`、`title`、`published_at`：来源定位信息
- `claim_scope`：被来源支持的具体事实类别，如 `biography`、`signature_line`、`partnership_status`、`portrait`、`image_license`
- `evidence_note`：简短中文证据摘要
- `checked_at`、`verification_status`：核验时间与 `verified`/`needs_review`
- 时间戳

至少对 `(athlete_id, source_url, claim_scope)` 建唯一约束；对 `sport_id + published + sort_order`、签名鞋运动员关系、来源外键建立查询索引。删除已引用的分类/球员/鞋款时使用 restrict，避免无意丢失研究证据。

## 球员目录和证据边界

目录沿用既有 15 位档案，并新增 16 位拥有 Nike/Jordan Brand 已推出个人签名鞋或可查证签名型号的 NBA 球员。Nike 历史签名鞋依据 Nike 名单及可追溯的鞋款记录；Dwyane Wade 的 Fly Wade 使用 NBA.com / Miami Heat 对 Jordan Brand 首款签名鞋的发布资料；新增历史型号需逐一记录来源和关系边界。每位球员的简介、签名鞋、照片和图片许可证分别记录来源；若证据或授权缺失，则不公开该档案。

设计阶段的资料来源起点（发布前需要逐条核对并写入 `athlete_sources`）：

- Jordan Brand 官方关于签名球员与 Tatum、Luka、Zion 产品线的说明：<https://about.nike.com/en/newsroom/releases/jordan-brand-basketball-design>
- Nike JA 4 官方资料：<https://about.nike.com/en/newsroom/releases/become-a-defenders-worst-nightmare-with-the-nike-ja-4-ja-morant-fourth-signature-shoe>
- Nike Book 2 官方资料：<https://about.nike.com/en-GB/newsroom/releases/nike-basketball-releases-the-book-2-the-next-chapter-in-devin-bookers-signature-collection>
- Nike KD19 官方资料：<https://about.nike.com/en/newsroom/releases/nike-basketball-introduces-kevin-durant-19th-signature-shoe-kd19>
- Nike/Jordan 过去的 NBA 签名鞋名单稿（其中明确注明 Kyrie 与 Nike 合作已结束；该稿不是当前合作状态依据）：<https://www.nba.com/news/the-five-everything-to-know-for-week-11>
- Nike 关于 Kobe 球鞋系列的历史说明：<https://about.nike.com/en/magazine/nike-kobe-3-history>
- Kyrie/Nike 合作结束信息：<https://www.nba.com/news/nike-parts-ways-with-nets-guard-kyrie-irving>
- 其余历史关系来源候选：Paul George（NBA Pacers 官方 PG1 报道）、Chris Paul（NBA Pelicans 官方 CP3 报道）、Russell Westbrook（NBA Thunder 官方 Jordan 签名鞋报道）、Dwyane Wade（NBA Heat 官方 Jordan Fly Wade 报道）。这些历史页面只作为查证入口，须核对具体球员和鞋款主张，不能以名单文章替代逐条证据。
- Nike 历史 NBA 签名鞋球员与型号年代核对：<https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/>。该名单区分正式签名鞋与边界案例；页面只采用正式名单内 NBA 男球员，并另行核验后来推出的 Nike/Jordan Brand 系列。
- Nike 历史签名型号补充核对：<https://kicksologists.com/2025/01/27/every-basketball-player-to-have-a-signature-shoe-deal-with-nike/>、<https://www.nicekicks.com/tim-hardaway/>、<https://sneakernews.com/2008/11/15/nike-zoom-mvp-x-steve-nash-pe/>、<https://sneakernews.com/2015/08/19/flashback-to-95-the-best-of-the-rest/>。对鞋款资料将正式签名系列、球员关联型号和签名专属配色分开描述；单一配色/球员版不扩展为系列。
- Dwyane Wade 的 Jordan Fly Wade 发布信息及 Nike, Inc. 与 Jordan Brand 关系：<https://www.nba.com/heat/news/jordanbrdwyanewadet20110506html>；其后转向 Li-Ning 的时间依据：<https://www.nba.com/news/dwyane-wade-signs-lifetime-shoe-deal-li-ning>。

图片优先使用 Wikimedia Commons 中许可明确的原图，并记录作者、来源页和许可证；新增每个档案都要单独核验对应的图片文件页和许可。Nike 新闻稿图和 NBA CDN 球员照片不默认为可自由再发布。

## 错误处理与降级

- Neon 未配置、连接失败或查询失败：使用现有应用一致的数据库错误边界显示中文错误提示；不得静默回退到硬编码球员数据，以免让使用者误认为展示的是数据库的研究资料。
- 单个档案图片加载失败或缺少许可信息：显示统一文字占位，不影响档案文字和来源。
- `coming_soon` 分类显示占位内容；无数据的 `active` 分类视为数据完整性问题并触发页面级错误状态，而非“资料建设中”。
- 来源 URL 失效不删除记录；标为待复核，保留原核验时间和证据说明。

## 安全、隐私与授权

本期档案为公开、非敏感运动员资料，不开放匿名写接口或用户编辑。所有展示内容应带可追溯出处，图片只在确认授权后使用；数据库保存外链与许可元数据，不保存 API 密钥、账户信息或来源网站抓取凭据。

## 本期不做

- 足球、网球、田径的运动员资料采集和画像。
- 面向用户的档案 CRUD、后台内容管理、批量导入。
- 搜索、筛选、分页、关系图谱、销量/球鞋销售指标和数据分析结论。
- 将未发布的签名鞋计划、球员 PE、个人配色或普通代言鞋混作已推出的个人签名鞋系列。

## 文档与开发验收边界

本文件记录初版设计及 2026-11-05 的扩展要求。实现交付包括 Neon 迁移、页面、目录和来源记录；页面须读取 Neon 数据，且不得在数据查询失败时伪装为成功状态。目录不再以 15 人为样本上限或发布门槛；31 位为按本规格口径已核验的当前目录，而非对未公开、专属配色或球员版的无限扩展。
