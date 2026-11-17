# NBA Athlete Selection Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (Native) to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在分析模块上线可追溯的 NBA 球星 SES 评分、候选球星评估和实际 Nike/Jordan 产品配置对照。

**Architecture:** 将确定性评分引擎、Neon 中的模型/评分/证据快照、来源检索适配器和双语 Next.js 页面分开。SES 的分数、资格状态、建议层级和实际商品配置分别存储、分别展示。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Neon Serverless Postgres、Drizzle ORM、现有 zh/en locale 工具、现有管理员 API guard。

**Spec:** [2026-11-16-nba-athlete-selection-model-design.md](../specs/2026-11-16-nba-athlete-selection-model-design.md)

## Global Constraints

- All persisted application data belongs in Neon; candidate runs may use `athlete_id = null` and retain the entered athlete name.
- SES weights are D1–D6 = 20/20/15/20/15/10; the formula is `10 × Σ(weight × dimension score)`.
- Evaluate with an explicit `as_of_date`; data published later cannot be used as a model input for that run.
- Unknown metrics remain null; provisional SES requires coverage ≥80% and valid D1, D2, D4, D5, and its recommended level is capped at L2.
- A dimension is publishable only when verified submetrics cover at least 70% of its configured submetric weight; this v1 threshold is versioned.
- L0–L4 are research recommendations, not actual Nike contract rights; active verified competitor exclusivity is an eligibility state, not an SES penalty.
- Do not infer sales or causality from product counts, prices, availability, or search interest.
- Maintain Chinese and English UI, errors, metric explanations, and exported labels together.
- Keep user-provided product names, athlete names, codes, and evidence titles in their source language.
- Avoid unnecessary secondary labels and descriptions; let the layout do the explaining.
- Before writing code, read the relevant installed Next.js 16 guides under `node_modules/next/dist/docs/01-app/` for App Router pages and Route Handlers, and follow the current project `AGENTS.md` rules.
- Do not add or run automated tests unless separately requested; use the manual review points below during implementation review.
- Preserve the pre-existing untracked `.pnpm-store/`; do not stage it.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/athlete-evaluations/types.ts` | Domain types for model versions, metrics, scores, eligibility, coverage, and tiers |
| `src/lib/athlete-evaluations/model-v1.ts` | Immutable SES v1 weights, scenarios, thresholds, and hard-gate configuration |
| `src/lib/athlete-evaluations/scoring.ts` | Dimension aggregation, coverage, SES calculation, sensitivity results, and tier classification |
| `src/lib/athlete-evaluations/eligibility.ts` | As-of-date eligibility checks and L0–L4 recommendation adjustments |
| `src/lib/athlete-evaluations/queries.ts` | Neon reads for athletes, assessment runs, evidence, and product portfolios |
| `src/lib/athlete-evaluations/service.ts` | Assessment creation, evidence updates, versioned recalculation, and persistence |
| `src/lib/athlete-evaluations/validation.ts` | Input validation for candidate, metric, source, and scenario requests |
| `src/lib/athlete-evaluations/research-provider.ts` | Provider interface for candidate evidence discovery; manual evidence remains available |
| `src/lib/athlete-evaluations/portfolio.ts` | Product-tier and supply-structure summaries for an athlete/line |
| `src/lib/db/schema.ts` | Drizzle model, run, metric, evidence, and athlete-line/SPU relationship tables |
| `drizzle/0014_athlete_selection_evaluations.sql` | Neon migration and initial SES v1 model record |
| `src/app/api/analysis/athlete-evaluations/route.ts` | List assessments and create candidate or batch assessment runs |
| `src/app/api/analysis/athlete-evaluations/[runId]/route.ts` | Read and update a single assessment snapshot |
| `src/app/api/analysis/athlete-evaluations/[runId]/metrics/route.ts` | Update metric values and source evidence, then recalculate that run |
| `src/app/api/analysis/athlete-evaluations/[runId]/finalize/route.ts` | Finalize a reviewed draft into an immutable assessment snapshot |
| `src/app/api/analysis/athlete-evaluations/research/route.ts` | Search evidence through the configured provider, returning citations for review |
| `src/app/api/analysis/athlete-evaluations/models/route.ts` | List model versions and publish a validated immutable model version |
| `src/app/[locale]/analysis/athlete-model/page.tsx` | Server route, metadata, and initial locale-aware page data |
| `src/components/athlete-evaluation-page.tsx` | Candidate search, list, assessment workflow, details, and model scenarios |
| `src/app/[locale]/analysis/athlete-model/page.module.css` | Responsive assessment and evidence layout |
| `src/components/app-shell.tsx` | Add “球星选择 / Athlete Selection” under Analysis |
| `src/lib/i18n/messages/zh.ts` | Chinese menu, score, evidence, errors, and empty-state messages |
| `src/lib/i18n/messages/en.ts` | Matching English messages |

## Review Focus

These are manual review cases, not automated test additions:

1. Same-name players or aliases resolve to the right NBA identity or request disambiguation.
2. Missing/conflicting indicators remain unknown and do not silently become zero or a full L tier.
3. Exact threshold values 45, 55, 70, and 85 enter the correct adjacent levels.
4. Active competitor exclusivity blocks eligibility without changing raw SES.
5. Evidence newer than `as_of_date` is excluded from the score and shown only as later context.
6. Different weighting scenarios sum to 100% and produce separate, immutable assessment results.
7. No linked SPU/SKU or no price observations produces an empty/unknown portfolio state, not a zero-sales statement.

---

### Task 1: Implement the versioned SES scoring domain

**Files:**
- Create: `src/lib/athlete-evaluations/types.ts`
- Create: `src/lib/athlete-evaluations/model-v1.ts`
- Create: `src/lib/athlete-evaluations/scoring.ts`
- Create: `src/lib/athlete-evaluations/eligibility.ts`

**Interfaces:**
- `EvaluationDimensionKey = "D1" | "D2" | "D3" | "D4" | "D5" | "D6"`
- `EvaluationLevel = "L0" | "L1" | "L2" | "L3" | "L4"`
- `EvaluationScenarioKey = "china-priority" | "north-america" | "product-portfolio"`
- `MetricInput = { key: string; rawValue: string | number | boolean | null; normalizedScore: number | null; unit: string | null; periodStart: string | null; periodEnd: string | null; status: "verified" | "needs_review" | "missing" | "conflict" }`
- `ScoringInput = { metrics: MetricInput[]; competitorExclusive: boolean | null; majorConcernNeedsReview: boolean }`
- `EvaluationModel = { version: string; scenarios: Record<EvaluationScenarioKey, Record<EvaluationDimensionKey, number>>; metricWeights: Record<EvaluationDimensionKey, Record<string, number>>; thresholds: { L1: number; L2: number; L3: number; L4: number }; coverageFloor: number; dimensionMinimumCoverage: number; provisionalRequiredDimensions: EvaluationDimensionKey[]; hardGates: { storyDimensionMax: number; attentionDimensionMax: number; chinaMarketMinimum: number; cappedLevel: EvaluationLevel } }`
- `EvaluationCreationInput = { athleteId?: string; candidateName: string; asOfDate: string; market: "china" | "north-america"; scenarioKey: EvaluationScenarioKey }`
- `EvaluationMetricUpdate = { metricKey: string; rawValue: string | number | boolean | null; normalizedScore: number | null; unit: string | null; periodStart: string | null; periodEnd: string | null; rationale: string; status: "verified" | "needs_review" | "missing" | "conflict"; sourceIds: string[] }`
- `ResearchSource = { url: string; publisher: string; title: string; publishedAt: string | null; excerpt: string; status: "suggested" | "verified" | "rejected" }`
- `EvaluationResult = { status: "complete" | "provisional" | "insufficient_data"; ses: number | null; coverage: number; dimensions: Record<EvaluationDimensionKey, number | null>; baseLevel: EvaluationLevel | null; recommendedLevel: EvaluationLevel | null; eligibility: "eligible" | "blocked" | "review_required"; gates: string[]; sensitivity: Record<string, number | null> }`
- `EvaluationDraft = { runId: string; workflowState: "draft"; preview: EvaluationResult }`
- `EvaluationDetail = EvaluationResult & { runId: string; workflowState: "finalized"; modelVersion: string; metrics: MetricInput[]; sources: ResearchSource[] }`
- `calculateEvaluation(input: ScoringInput, model: EvaluationModel, scenarioKey: EvaluationScenarioKey): EvaluationResult` consumes reviewed metric scores and eligibility evidence for the selected as-of date.
- `createModelVersion(input): Promise<EvaluationModel>` is implemented in `service.ts`; it validates then stores a new immutable model version.

- [x] Define metric and model types, including explicit unknown/conflict states.
- [x] Encode the baseline weights and the North America/Product Portfolio scenarios from the spec; verify each vector sums to 100% by inspection.
- [x] Aggregate each dimension from its configured submetric weights; publish a dimension only when verified submetrics cover at least 70% of that dimension.
- [x] Implement the SES formula using only valid dimensions; overall coverage is the sum of valid dimension weights.
- [x] Implement provisional behavior: `coverage >= 80`, valid D1/D2/D4/D5, normalized score over valid dimensions, and maximum recommended level L2.
- [x] Implement exact level intervals: `<45`, `45–<55`, `55–<70`, `70–<85`, `>=85`.
- [x] Implement sensitivity calculation without mutating the base scenario result.
- [x] Implement qualification/gate output separately from SES; verified competitor exclusivity sets `blocked`, and unresolved verified major events set `review_required`.
- [x] Review the documented Ja arithmetic example by hand (70 under the baseline weights); do not persist demonstration data as a real athlete score.

### Task 2: Add Neon persistence and explicit product relationships

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0014_athlete_selection_evaluations.sql`
- Modify: generated Drizzle migration metadata under `drizzle/meta/`

**Interfaces:**
- `athlete_evaluation_models`: immutable version configuration, dimensions, submetric weights, 70% dimension coverage floor, scenarios, 80% overall coverage floor, thresholds, gates, and active status.
- `athlete_evaluation_runs`: nullable athlete FK, candidate name fields, model version, `as_of_date`, market, scenario, raw/provisional SES, coverage, eligibility, base/recommended levels, status, and timestamps.
- `athlete_evaluation_metric_scores`: one row per run and metric key, nullable normalized score, raw value, unit, period, rationale, verification state, and reviewer.
- `athlete_evaluation_sources`: source URL, publisher, title, publication/observation date, excerpt, verification status, and metric-score FK.
- `athlete_shoe_line_products`: verified link between `athlete_shoe_lines` and `spu_products`; unique pair and source/verification metadata.
- Add nullable standard `product_tier` and `launch_market` to SPU/SKU; SKU may override an SPU default. Valid tiers are `signature_retail`, `pe`, `regional_exclusive`, `retro`, and `collab`.

- [x] Add Drizzle enums/tables, FKs, uniqueness constraints, date indexes, and checks for valid status/score ranges.
- [x] Create the migration with the repository's Drizzle configuration; preserve statement breakpoints and review generated SQL before applying.
- [x] Seed the immutable `ses-v1` model row with the exact baseline and alternate scenarios, the thresholds, and gate definitions.
- [x] Add the explicit shoe-line-to-SPU relationship and SKU-level tier override without deleting the legacy `signing_athlete` text field.
- [x] Add an explicit product launch market field; do not reuse `source_records.market`, which describes the market of an observation.
- [x] Inspect migration ordering and generated metadata; do not apply the migration to production during this plan.

### Task 3: Build assessment queries and snapshot service

**Files:**
- Create: `src/lib/athlete-evaluations/queries.ts`
- Create: `src/lib/athlete-evaluations/service.ts`
- Create: `src/lib/athlete-evaluations/validation.ts`

**Interfaces:**
- `listEvaluations(filters): Promise<EvaluationListResult>` returns persisted runs with athlete identity, score, tier, coverage, scenario, and as-of date.
- `getEvaluation(runId): Promise<EvaluationDetail | null>` returns all metric scores, evidence, gate results, and model snapshot.
- `createEvaluation(input: EvaluationCreationInput): Promise<EvaluationDraft>` creates a candidate or existing-athlete draft with the selected model and as-of date.
- `updateEvaluationMetric(runId: string, input: EvaluationMetricUpdate): Promise<EvaluationDraft>` edits a draft only and recalculates its preview.
- `finalizeEvaluation(runId): Promise<EvaluationDetail>` validates review status and freezes the score/evidence snapshot.
- `recalculateEvaluation(runId, modelVersion): Promise<EvaluationDraft>` creates a new draft for a new model version; it never overwrites the previous result.
- `getAthletePortfolioRecords(athleteId): Promise<AthletePortfolioRecords>` returns verified relation, product, and observation rows for aggregation.

- [x] Implement DB queries against published NBA `star_athletes`, current athlete sources, and verified shoe lines; include candidate runs with no athlete FK.
- [x] Exclude source records whose publication/observation date is later than the run's `as_of_date` from scored inputs.
- [x] Validate allowed metric keys, 0–10 scoring bounds, source URL protocols, dates, and model scenario IDs.
- [x] Permit evidence edits only while the assessment is a draft; finalized evidence and results are immutable.
- [x] Aggregate prices only within a single currency, price basis, and explicit observation scope; return no statistic when no valid values exist.
- [x] Return empty product portfolios and incomplete observations as empty/unknown states, not zero-valued commercial results.

### Task 4: Add admin-protected evaluation APIs and source discovery contract

**Files:**
- Create: `src/app/api/analysis/athlete-evaluations/route.ts`
- Create: `src/app/api/analysis/athlete-evaluations/[runId]/route.ts`
- Create: `src/app/api/analysis/athlete-evaluations/[runId]/metrics/route.ts`
- Create: `src/app/api/analysis/athlete-evaluations/[runId]/finalize/route.ts`
- Create: `src/app/api/analysis/athlete-evaluations/research/route.ts`
- Create: `src/lib/athlete-evaluations/research-provider.ts`
- Modify: `.env.example` only if the source provider requires deployment configuration

**Interfaces:**
- `GET /api/analysis/athlete-evaluations`: list/filter runs.
- `POST /api/analysis/athlete-evaluations`: body is `EvaluationCreationInput` or `{ athleteIds: string[]; asOfDate: string; market: "china" | "north-america"; scenarioKey: EvaluationScenarioKey }` for batch drafts.
- `GET /api/analysis/athlete-evaluations/{runId}`: read full scorecard.
- `PATCH /api/analysis/athlete-evaluations/{runId}/metrics`: save reviewed metric values and evidence.
- `POST /api/analysis/athlete-evaluations/{runId}/finalize`: freeze a fully reviewed or valid provisional run.
- `POST /api/analysis/athlete-evaluations/research`: `ResearchProvider.search({ name, asOfDate, market, locale }) -> ResearchSource[]` returns source suggestions only, never scores.
- `GET /api/analysis/athlete-evaluations/models`: list available immutable versions.
- `POST /api/analysis/athlete-evaluations/models`: `createModelVersion(input): Promise<EvaluationModel>` validates weights sum to 100%, thresholds increase, and version is unique before publishing.

- [x] Use `withAdminApiErrors` and the existing `AppError`/`readJson` patterns on each handler.
- [x] Keep published model versions immutable; creating a version copies an existing configuration and assigns a new version identifier.
- [x] Allow metrics to change only on drafts; finalizing freezes the score, evidence, gates, and model version for later reproducibility.
- [x] Implement a provider interface with a manual-evidence fallback; if no search provider is configured, return a localized actionable state rather than pretending that the configured LLM can browse.
- [x] Return citation suggestions with URL, publisher, title, publication date, and excerpt; require researcher confirmation before a suggestion becomes verified evidence.
- [x] Keep provider secrets server-side; add placeholders only, never real keys.
- [x] Confirm duplicate names return a disambiguation list and do not create a score against an arbitrary athlete.

### Task 5: Build the bilingual athlete model page

**Files:**
- Create: `src/app/[locale]/analysis/athlete-model/page.tsx`
- Create: `src/app/[locale]/analysis/athlete-model/page.module.css`
- Create: `src/components/athlete-evaluation-page.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/lib/i18n/messages/zh.ts`
- Modify: `src/lib/i18n/messages/en.ts`

**Interfaces:**
- Route: `/analysis/athlete-model`, represented under the existing locale segment.
- Component props: `AthleteEvaluationPage({ initialRuns, initialModels, initialError })`; the component reads the active locale from the existing locale provider.
- Navigation item: Analysis dropdown → `Athlete Selection` / `球星选择`.

- [x] Add route metadata using the existing request-locale and message helpers.
- [x] Add the localized Analysis submenu item while retaining the existing Data Analysis route.
- [x] Render the assessment list with name, SES, base/recommended level, eligibility, coverage, scenario, and evaluation date.
- [x] Add search, status/level/scenario filters, and a new-candidate dialog with athlete name, disambiguation, and as-of date.
- [x] Render detail as a separate route state or side panel with six dimension bars, metric evidence, source links, hard-gate explanations, sensitivity results, and actual product context.
- [x] Add a model-version view; admins can publish a copied version with validated weights/thresholds, while all prior assessments remain bound to their original version.
- [x] Render insufficient-data, provisional, blocked, review-required, empty, loading, and database-error states distinctly in both languages.
- [x] Allow editing evidence only in draft state; show finalized snapshots as read-only and start a new draft for recalculation.
- [x] Keep explanatory copy limited to the model labels, evidence, and decisions users need to interpret the page.
- [x] Confirm page layout remains usable on narrow screens and that language switching returns to the same route.

### Task 6: Show observed product allocation beside the model result

**Files:**
- Create: `src/lib/athlete-evaluations/portfolio.ts`
- Modify: `src/lib/athlete-evaluations/queries.ts`
- Modify: `src/components/athlete-evaluation-page.tsx`
- Modify: `src/lib/i18n/messages/zh.ts`
- Modify: `src/lib/i18n/messages/en.ts`

**Interfaces:**
- `summarizeAthletePortfolio(records: AthletePortfolioRecords): AthletePortfolioSummary` returns verified series links, model/SKU counts by tier, release-year cadence, regional share when classified, and observed price/availability coverage.
- `getAthleteProductPortfolio(athleteId): Promise<AthletePortfolioSummary>` in `service.ts` calls `getAthletePortfolioRecords` and `summarizeAthletePortfolio`.

- [x] Count only verified athlete-line/SPU links and published model records.
- [x] Distinguish signature retail, PE, regional exclusive, retro, and collaboration products.
- [x] Calculate cadence and colorway breadth only when release year and SKU classification are available; show coverage next to each statistic.
- [x] Show Chinese-market share only for records with a verified launch market; do not infer China status from a product name.
- [x] Label price and availability values with their observation source, date, currency, and price basis.
- [x] Keep observed products visually separate from the model's suggested resource package.

### Task 7: Prepare existing-player assessments and reviewer workflow

**Files:**
- Create: `scripts/create-athlete-evaluation-drafts.mjs`
- Create: `docs/research/SES-v1-data-collection.md`
- Modify: `src/lib/athlete-evaluations/service.ts` only if batch run support is needed

- [x] Provide an idempotent local/admin workflow to create assessment drafts for every published NBA star in Neon.
- [x] Define an initial research sample of at least eight real athletes, including signature-line athletes and at least one high-performing player without a retail signature line.
- [x] For each populated metric, store the observation period and source; leave inaccessible social/search/contract data unknown.
- [x] Use historical as-of dates for historical signing comparisons and prevent post-date evidence from entering SES.
- [x] Mark teaching examples and synthetic prototypes as demo-only; never seed them as real athlete results.
- [x] Create a review queue for missing, conflicting, and needs-review evidence; publish no unreviewed qualitative metric.
- [ ] Compare scored athletes' tiers with actual public product configuration and record mismatch explanations without relabeling scores to force agreement. This requires sourced assessments to be reviewed and persisted first.

### Task 8: Integrate source coverage and finalize the module handoff

**Files:**
- Modify: `src/lib/athlete-evaluations/queries.ts`
- Modify: `src/components/athlete-evaluation-page.tsx`
- Modify: `src/lib/i18n/messages/zh.ts`
- Modify: `src/lib/i18n/messages/en.ts`
- Modify: `docs/research/SES-v1-data-collection.md`

- [x] Show source coverage by dimension and distinguish verified, pending, conflicting, and missing evidence.
- [x] Add the three model scenarios to the result comparison; mark changes to level as weight-sensitive.
- [x] Keep observed association language in all result summaries; remove any copy that states sales impact or causal effect without direct evidence.
- [x] Review the seven manual cases in **Review Focus** across Chinese and English UI flows.
- [x] Review the implementation diff against every acceptance item in the approved spec before asking for deployment or production migration.

## Manual Acceptance Checklist

- Existing NBA stars can be listed and assessed after the Neon migrations are applied and draft assessments are created.
- A new candidate can be disambiguated, assigned an as-of date, and assessed after required evidence is available.
- Complete, provisional, insufficient-data, blocked, and review-required states are distinguishable.
- The result exposes all six dimensions, sources, evaluation dates, model version, and suggested L0–L4 package.
- Existing product records link through explicit verified relations; tier counts and cadence show data coverage.
- Chinese and English contain equivalent labels and explanations.
- No result implies actual Nike internal decisions, undisclosed contract economics, sales, or causality.

## Scope Boundary

This plan does not implement a sales forecasting model or a full search-trend dashboard. Automated candidate research depends on configuring an external search provider; without one, the page supports researcher-supplied evidence and reports missing data. V1 uses existing price and availability observations only, and it does not add actual sales collection.

## Data Readiness

The application schema and draft workflow are implemented, but no Neon migration was applied and no athlete scores were written during this development pass. The initial research roster and source-collection guidance are in `docs/research/SES-v1-data-collection.md`. Populate reviewed, date-eligible evidence before interpreting a numeric SES or completing the public-product mismatch review.
