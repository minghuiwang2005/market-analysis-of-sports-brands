# SES-v1 数据采集规范 / SES-v1 Data Collection Guide

**状态 / Status:** 采集流程就绪；球员指标仍待研究者录入和核验。
Collection workflow is ready; athlete metrics still require researcher entry and review.

**适用版本 / Model:** `ses-v1`
**最后整理 / Updated:** 2026-11-16

## 用途 / Purpose

本指南规定如何为 NBA 球星选择模型记录公开证据。评估结果是研究分层，不代表 Nike 内部签约规则、合同权利、销量或因果结论。

This guide defines how to record public evidence for the NBA athlete-selection model. Results are research tiers; they do not represent Nike's internal signing rules, contract rights, sales, or causal findings.

**初始样本是采集目标，不是已完成的评分。**空白指标保留为未知；不得用示例分数、传闻或现有签名鞋结果填充它们。

**The initial sample is a collection target, not a completed scorecard.** Leave blank metrics unknown. Do not fill them with demo scores, rumors, or existing signature-shoe outcomes.

## 初始采集样本 / Initial collection sample

以下球员均在项目篮球档案或历史研究记录中出现。前八位用于覆盖不同年代的 Nike/Jordan Brand 签名线；Anthony Davis 是单独的历史比较对象，不计入八位样本。正式录入前，先按评估时点重新确认档案、系列状态和来源日期。

The first eight targets cover Nike/Jordan Brand signature lines across different eras and appear in the project's basketball profiles or research records. Anthony Davis is a separate historical comparator and is not part of the eight-athlete sample. Reconfirm each profile, line status, and source date for the chosen assessment date before entering evidence.

| 球员 / Athlete | 样本作用 / Sample role | 采集入口 / Starting sources |
|---|---|---|
| Michael Jordan | 历史签名线 / Historical signature line | [NBA.com profile](https://www.nba.com/news/history-nba-legend-michael-jordan), [Nike Air Jordan 1](https://www.nike.com/jordan/air-jordan-1) |
| LeBron James | 长期签名线 / Long-running signature line | [NBA stats](https://www.nba.com/stats/player/2544), [Nike LeBron 24](https://about.nike.com/en/newsroom/releases/nike-and-lebron-james-help-players-level-up-with-the-lebron-24-his-lightest-game-shoe-ever) |
| Kobe Bryant | 历史签名线 / Historical signature line | [NBA stats](https://www.nba.com/stats/player/977), [Nike Kobe 10 Protro](https://about.nike.com/en/newsroom/releases/nike-basketball-debuts-the-kobe-10-protro-an-iconic-silhouette-reimagined-for-todays-game) |
| Kevin Durant | Nike 签名线 / Nike signature line | [NBA stats](https://www.nba.com/stats/player/201142), [Nike KD19](https://about.nike.com/en-GB/newsroom/releases/nike-basketball-and-kevin-durant-hit-the-dagger-with-the-launch-of-the-kd19) |
| Giannis Antetokounmpo | Nike 签名线 / Nike signature line | [NBA stats](https://www.nba.com/stats/player/203507), [Nike Freak 8](https://about.nike.com/en/newsroom/releases/giannis-antetokounmpo-nike-freak-8-official-images) |
| Kyrie Irving | 历史 Nike 签名线 / Historical Nike signature line | [NBA stats](https://www.nba.com/stats/player/202681), [NBA.com on Nike partnership ending](https://www.nba.com/news/nike-parts-ways-with-nets-guard-kyrie-irving) |
| Luka Dončić | Jordan Brand 签名线 / Jordan Brand signature line | [NBA stats](https://www.nba.com/stats/player/1629029), [Jordan Brand Luka 5](https://about.nike.com/en/newsroom/releases/jordan-brand-luka-5-official-images) |
| Ja Morant | Nike 签名线 / Nike signature line | [NBA stats](https://www.nba.com/stats/player/1629630), [Nike JA 4](https://about.nike.com/en/newsroom/releases/become-a-defenders-worst-nightmare-with-the-nike-ja-4-ja-morant-fourth-signature-shoe) |

### 历史比较对象 / Historical comparator

Anthony Davis 可作为 **2017-04-06 时点**的对照候选：Nike 运动员身份有当时的公开报道；同一时期的报道将他列为还没有个人签名鞋的 Nike 球员。此结论只适用于该历史观察点；不要据此推断其他年份或当前状态。NBA 统计需另按当时赛季来源录入。

Anthony Davis can be used as a comparator at the **2017-04-06 checkpoint**: contemporary reporting documented his Nike-athlete status, while a same-period roundup listed him among Nike athletes without an individual signature shoe. Treat that statement as time-bounded; do not extend it to other dates or his current status. Add season-specific NBA statistics from a separate source.

- [Sneaker News: Anthony Davis signs with Nike](https://sneakernews.com/2012/07/16/anthony-davis-signs-with-nike/)
- [Peachtree Hoops: 2017 NBA signature-sneaker status](https://www.peachtreehoops.com/2017/4/6/15197118/nba-apparel-nba-signature-sneaker-status-atlanta-hawks-dwight-howard)
- [NBA stats profile](https://www.nba.com/stats/player/203076)

创建这一对照评估时，使用独立候选人记录并将 `asOfDate` 设为 `2017-04-06`。没有公开证据的指标留空；竞品排他合约状态未知时不可填“有”或“无”。

For this comparator, create an unlinked candidate record with `asOfDate` set to `2017-04-06`. Leave unsupported metrics blank. If public evidence does not establish competitor exclusivity, keep it unknown.

## 公式核对示例 / Formula check example

以下只是手算公式的假设输入，不是 Ja Morant 的真实资料或评估结果，不得导入 Neon：

The following values are hypothetical arithmetic inputs only. They are not Ja Morant's real data or assessment, and must not be inserted into Neon:

```text
D1=8, D2=6, D3=8, D4=7, D5=6, D6=7
SES = 10 × (0.20×8 + 0.20×6 + 0.15×8 + 0.20×7 + 0.15×6 + 0.10×7)
    = 10 × 7.00
    = 70
```

70 分按阈值进入 L3；真实评估还须满足覆盖率条件，并另行应用资格门槛。

A score of 70 maps to L3 under the thresholds; a real assessment must also satisfy coverage rules and apply eligibility gates separately.

## 每项证据的录入要求 / Evidence entry requirements

每个已评分子指标都应同时保存：原始观察值、单位、标准化分数（0–10）、适用周期、评分依据，以及至少一个对应来源。来源需记录 URL、发布者、标题、发布日期和摘录。网页发布日期晚于评估时点的来源只能作为后续背景，不能支持该次评分。

Every scored submetric must retain its observed value, unit, normalized score (0–10), period, rationale, and at least one supporting source. Record the URL, publisher, title, publication date, and excerpt. A source published after the assessment date is later context and cannot support that score.

| 维度 / Dimension | 采集口径 / Collection rule |
|---|---|
| D1 竞技表现 / On-court impact | 固定最近三季、位置或角色组；将相近高级统计合成为场上影响指标，荣誉与关键比赛角色单独记录。 / Fix the latest three seasons and position or role group; combine related advanced stats into one impact measure and record honors separately. |
| D2 注意力资产 / Attention | 保存目标地区、平台、查询词、观察窗口和比较组；各平台不可直接相加。没有可重复访问的数据源时保持未知。 / Store region, platform, query, observation window, and comparison group; do not add platform totals. Leave unknown when data cannot be reproduced. |
| D3 可符号化程度 / Symbolic potential | 按固定锚点由两名评估者独立评分。分数相差 2 分或以上时先标记待复核，记录复核依据后再确定最终分数。 / Have two reviewers score independently against fixed anchors. A difference of 2 or more requires review before a final score is recorded. |
| D4 目标市场匹配 / Target-market fit | 只使用评估时点前的中文搜索、媒体、活动或有可靠样本支持的调查；没有证据时记未知。 / Use only pre-assessment Chinese search, media, event, or reliable survey evidence; otherwise leave unknown. |
| D5 品牌组合适配 / Brand portfolio fit | 依据当时已公开的产品平台、品类空位和可区分的功能设计空间。球员既有 Nike/Jordan 合作和签名线不加分。 / Use public product-platform fit, category whitespace, and functional differentiation at the time. Existing Nike/Jordan partnerships and signature lines do not add points. |
| D6 风险与可持续性 / Risk and sustainability | 使用公开出勤与合作可行性资料；声誉事项须有可核来源。未经核实的风险、私人医疗信息和流言不录入。 / Use public availability and partnership evidence; reputation concerns require verifiable sources. Exclude unverified claims, private medical information, and rumors. |

缺少访问权限的数据（例如平台后台触达、非公开合同条款、未授权社媒数据）必须保持未知；不以 Google 热度截图、传闻或主观猜测替代。

Keep inaccessible data (such as private platform reach, undisclosed contract terms, or unauthorized social data) unknown. Do not replace it with search screenshots, rumors, or unsupported judgment.

## 草稿生成 / Draft creation

`scripts/create-athlete-evaluation-drafts.mjs` 为所有已发布的 NBA 档案创建缺失的 SES 草稿，每个草稿先包含模型定义的空指标。它不会填充分数、来源或推断结论。脚本按球员、模型版本、评估日期、市场和情景检查已有记录，重复运行会跳过已存在的记录。

`scripts/create-athlete-evaluation-drafts.mjs` creates missing SES drafts for every published NBA profile, with empty metrics from the selected model. It does not populate scores, sources, or inferred findings. Existing records are checked by athlete, model version, assessment date, market, and scenario, so repeated runs skip them.

```bash
# 只读预览 / Read-only preview
node scripts/create-athlete-evaluation-drafts.mjs --as-of=2026-11-16 --market=china --scenario=china-priority --locale=zh

# 写入当前 DATABASE_URL 指向的 Neon / Write to the Neon database selected by DATABASE_URL
node scripts/create-athlete-evaluation-drafts.mjs --as-of=2026-11-16 --market=china --scenario=china-priority --locale=zh --apply
```

写入前应确认 `.env.local` 中的目标数据库并先完成迁移。脚本默认只读；`--apply` 会在当前配置数据库写入草稿和缺失指标。若数据库表不存在，先按项目数据库流程应用迁移。该脚本不自动填数、不定稿，也不应把历史比较目标视为真实评分。

Confirm the target database in `.env.local` and apply the project migrations before writing. The default is read-only; `--apply` writes drafts and empty metrics to the configured database. If the tables are missing, apply migrations first. The script does not collect data or finalize assessments; historical comparison targets are not completed scores.

## 复核输出 / Review outputs

- 先核验来源和评估时点，再核验指标值与评分依据。 / Review sources and as-of dates before metric values and rationales.
- 分维度查看已核验、待确认、冲突和缺失覆盖；不能只根据 SES 排序下结论。 / Review verified, pending, conflicting, and missing coverage by dimension; do not conclude from SES ranking alone.
- 同时对比三种权重情景；跨层级变化要标记为权重敏感。 / Compare all three weighting scenarios; flag tier changes as weight-sensitive.
- 将建议层级与已核验的实际 SPU/SKU 产品组合并列说明。 / Compare the recommended tier with verified SPU/SKU product structures.
- 价格、可售状态和产品数量只作为公开观察；不计算销售额、销量、转化率或因果效果。 / Treat prices, availability, and product counts as public observations; do not calculate revenue, units sold, conversion, or causal effects.
- 样本少于八名或证据覆盖不完整时，只报告描述性结果，不声称模型具有预测准确率。 / With fewer than eight athletes or incomplete evidence, report descriptive findings only and do not claim predictive accuracy.

## 实施限制 / Implementation limits

网页检索提供方尚未配置。模型 API 配置不等于网页搜索；现阶段使用手动来源录入与审核。所有 UI 和模型说明均提供中文与英文版本，球员姓名、来源标题和证据原文保留来源语言。

No web research provider is configured. Model API settings are not web search; use manual source entry and review for now. UI and model explanations are bilingual, while athlete names, source titles, and evidence excerpts remain in their source language.
