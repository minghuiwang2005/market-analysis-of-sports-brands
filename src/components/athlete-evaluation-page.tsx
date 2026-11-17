"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  FilePlus2,
  FileSearch,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatLocaleNumber } from "@/lib/i18n/display";
import { EVALUATION_DIMENSIONS, type AthletePortfolioSummary, type EvaluationCreationInput, type EvaluationDetail, type EvaluationDraft, type EvaluationEligibilityUpdate, type EvaluationLevel, type EvaluationListItem, type EvaluationListResult, type EvaluationMetricUpdate, type EvaluationModel, type EvaluationScenarioKey, type MetricInput, type MetricStatus, type ResearchSource } from "@/lib/athlete-evaluations/types";
import { SES_V1_MODEL, METRIC_DEFINITION_KEYS } from "@/lib/athlete-evaluations/model-v1";
import styles from "@/app/[locale]/analysis/athlete-model/page.module.css";

type ModelVersion = { version: string; active: boolean; publishedAt: string; changeNote: string | null; configuration: EvaluationModel };
type Candidate = { id: string; slug: string; nameZh: string; nameEn: string; league: string | null; teamSummary: string | null };
type Props = {
  initialRuns: EvaluationListItem[];
  initialModels: ModelVersion[];
  initialError: "database_missing" | "database_unavailable" | null;
};

const levelKeys: EvaluationLevel[] = ["L0", "L1", "L2", "L3", "L4"];
const thresholdKeys = ["L1", "L2", "L3", "L4"] as const;
const scenarioKeys: EvaluationScenarioKey[] = ["china-priority", "north-america", "product-portfolio"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function asString(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: string | null | undefined, locale: "zh" | "en") {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function scenarioLabel(key: EvaluationScenarioKey, t: (key: TranslationKey) => string) {
  const labelKey: Record<EvaluationScenarioKey, TranslationKey> = {
    "china-priority": "analysis.athleteModel.scenarioChina",
    "north-america": "analysis.athleteModel.scenarioNorthAmerica",
    "product-portfolio": "analysis.athleteModel.scenarioProductPortfolio",
  };
  return t(labelKey[key]);
}

function statusLabel(status: EvaluationListItem["status"] | EvaluationDetail["status"], t: (key: TranslationKey) => string) {
  const key: Record<typeof status, TranslationKey> = {
    complete: "analysis.athleteModel.complete",
    provisional: "analysis.athleteModel.provisional",
    insufficient_data: "analysis.athleteModel.insufficientData",
  };
  return t(key[status]);
}

function eligibilityLabel(value: EvaluationDetail["eligibility"], t: (key: TranslationKey) => string) {
  const keys: Record<EvaluationDetail["eligibility"], TranslationKey> = {
    eligible: "analysis.athleteModel.eligible",
    blocked: "analysis.athleteModel.blocked",
    review_required: "analysis.athleteModel.reviewRequired",
  };
  return t(keys[value]);
}

function scenarioLevel(value: number | null, model: EvaluationModel): EvaluationLevel | null {
  if (value === null) return null;
  if (value >= model.thresholds.L4) return "L4";
  if (value >= model.thresholds.L3) return "L3";
  if (value >= model.thresholds.L2) return "L2";
  if (value >= model.thresholds.L1) return "L1";
  return "L0";
}

function dimensionCopyPath(dimension: string, field: string) {
  return `analysis.athleteModel.dimensions.${dimension}.${field}` as TranslationKey;
}

function metricCopyPath(metricKey: string) {
  const dimension = METRIC_DEFINITION_KEYS[metricKey];
  return `analysis.athleteModel.dimensions.${dimension}.metrics.${metricKey}` as TranslationKey;
}

function metricLabelPath(metricKey: string) {
  return `analysis.athleteModel.metricLabels.${metricKey}` as TranslationKey;
}

function gateCopyPath(gate: string) {
  const gateKeys: Record<string, string> = {
    competitor_exclusive_contract: "competitor",
    competitor_contract_unknown: "competitorUnknown",
    major_concern_manual_review: "concern",
    signature_story_limited: "story",
    china_resource_not_recommended: "china",
    provisional_data_cap_l2: "provisional",
    weight_sensitive: "weightSensitive",
  };
  return `analysis.athleteModel.gates.${gateKeys[gate] ?? "provisional"}` as TranslationKey;
}

function tierTranslation(tier: string, t: (key: TranslationKey) => string) {
  const key = `analysis.athleteModel.portfolio.tiers.${tier}` as TranslationKey;
  const label = t(key);
  return label === key ? tier : label;
}

export function AthleteEvaluationPage({ initialRuns, initialModels, initialError }: Props) {
  const { locale, t } = useLocale();
  const [tab, setTab] = useState<"assessments" | "model">("assessments");
  const [runs, setRuns] = useState(initialRuns);
  const [total, setTotal] = useState(initialRuns.length);
  const [models, setModels] = useState(initialModels);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [scenarioFilter, setScenarioFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [listLoading, setListLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateDate, setCandidateDate] = useState(new Date().toISOString().slice(0, 10));
  const [candidateMarket, setCandidateMarket] = useState<EvaluationCreationInput["market"]>("china");
  const [candidateScenario, setCandidateScenario] = useState<EvaluationScenarioKey>("china-priority");
  const [candidateMatches, setCandidateMatches] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [disambiguation, setDisambiguation] = useState<Candidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateSaving, setCandidateSaving] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [notice, setNotice] = useState("");
  const [modelDraft, setModelDraft] = useState<EvaluationModel>(SES_V1_MODEL);
  const [newVersion, setNewVersion] = useState("");
  const [versionChangeNote, setVersionChangeNote] = useState("");
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState("");

  const activeModel = models.find((item) => item.active)?.configuration ?? SES_V1_MODEL;
  const weightTotal = EVALUATION_DIMENSIONS.reduce((sum, key) => sum + (modelDraft.scenarios["china-priority"][key] ?? 0), 0);
  const errorFallback = t("common.unknownError");
  const setupError = initialError === "database_missing"
    ? (locale === "en" ? "Neon is not configured. Add DATABASE_URL and run the project migrations." : "Neon 尚未配置。请设置 DATABASE_URL 并执行项目迁移。")
    : initialError === "database_unavailable"
      ? t("analysis.athleteModel.loadFailed")
      : "";

  const loadRuns = useCallback(async () => {
    setListLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (query.trim()) params.set("search", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (scenarioFilter !== "all") params.set("scenarioKey", scenarioFilter);
      if (workflowFilter !== "all") params.set("workflowState", workflowFilter);
      const result = await apiRequest<EvaluationListResult>(`/api/analysis/athlete-evaluations?${params}`);
      setRuns(result.items);
      setTotal(result.total);
    } catch (error) {
      setLoadError(errorMessage(error, t("analysis.athleteModel.loadFailed")));
    } finally {
      setListLoading(false);
    }
  }, [query, statusFilter, levelFilter, scenarioFilter, workflowFilter, t]);

  const loadModels = useCallback(async () => {
    try {
      const values = await apiRequest<ModelVersion[]>("/api/analysis/athlete-evaluations/models");
      setModels(values);
    } catch (error) {
      setLoadError((current) => current || errorMessage(error, t("analysis.athleteModel.loadFailed")));
    }
  }, [t]);

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const value = await apiRequest<EvaluationDetail>(`/api/analysis/athlete-evaluations/${runId}`);
      setDetail(value);
    } catch (error) {
      setDetail(null);
      setDetailError(errorMessage(error, t("analysis.athleteModel.loadFailed")));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRuns(), 160);
    return () => window.clearTimeout(timer);
  }, [loadRuns]);

  useEffect(() => {
    if (initialModels.length === 0) void loadModels();
  }, [initialModels.length, loadModels]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const active = models.find((item) => item.active)?.configuration;
    if (!active) return;
    setModelDraft(active);
    setNewVersion(`${active.version}-next`);
    setVersionChangeNote("");
  }, [models]);

  useEffect(() => {
    if (!candidateOpen || !candidateName.trim()) {
      setCandidateMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCandidateLoading(true);
      try {
        const result = await apiRequest<{ candidates: Candidate[] }>(`/api/analysis/athlete-evaluations?athleteSearch=${encodeURIComponent(candidateName.trim())}`);
        if (!cancelled) setCandidateMatches(result.candidates);
      } catch {
        if (!cancelled) setCandidateMatches([]);
      } finally {
        if (!cancelled) setCandidateLoading(false);
      }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [candidateOpen, candidateName]);

  useEffect(() => {
    if (!candidateOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCandidateOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [candidateOpen]);

  const clearNotice = () => window.setTimeout(() => setNotice(""), 2800);
  const refreshAll = async () => { await Promise.all([loadRuns(), loadModels()]); };
  const chooseRun = (runId: string) => setSelectedId((current) => current === runId ? null : runId);

  const openCandidate = () => {
    setCandidateName("");
    setCandidateDate(new Date().toISOString().slice(0, 10));
    setCandidateMarket("china");
    setCandidateScenario("china-priority");
    setSelectedCandidate(null);
    setDisambiguation([]);
    setCandidateError("");
    setCandidateOpen(true);
  };

  const createCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidateName.trim()) return;
    setCandidateSaving(true);
    setCandidateError("");
    try {
      const result = await apiRequest<EvaluationDraftOrDisambiguation>("/api/analysis/athlete-evaluations", {
        method: "POST",
        body: JSON.stringify({
          candidateName: candidateName.trim(),
          ...(selectedCandidate ? { athleteId: selectedCandidate.id } : {}),
          asOfDate: candidateDate,
          market: candidateMarket,
          scenarioKey: candidateScenario,
        }),
      });
      if ("state" in result && result.state === "disambiguation_required") {
        setDisambiguation(result.candidates);
        return;
      }
      if ("state" in result) throw new Error(errorFallback);
      setCandidateOpen(false);
      setNotice(t("analysis.athleteModel.candidateCreated"));
      clearNotice();
      await loadRuns();
      setSelectedId(result.runId);
    } catch (error) {
      setCandidateError(errorMessage(error, errorFallback));
    } finally {
      setCandidateSaving(false);
    }
  };

  const updateMetric = async (runId: string, value: EvaluationMetricUpdate) => {
    await apiRequest(`/api/analysis/athlete-evaluations/${runId}/metrics`, { method: "PATCH", body: JSON.stringify(value) });
    await Promise.all([loadDetail(runId), loadRuns()]);
    setNotice(t("analysis.athleteModel.metricSaved"));
    clearNotice();
  };

  const publishModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newVersion.trim() || !versionChangeNote.trim() || weightTotal !== 100 || !(modelDraft.thresholds.L1 < modelDraft.thresholds.L2 && modelDraft.thresholds.L2 < modelDraft.thresholds.L3 && modelDraft.thresholds.L3 < modelDraft.thresholds.L4)) {
      setModelError(t("analysis.athleteModel.formError"));
      return;
    }
    setModelSaving(true);
    setModelError("");
    try {
      const next = { ...modelDraft, version: newVersion.trim() };
      await apiRequest<EvaluationModel>("/api/analysis/athlete-evaluations/models", { method: "POST", body: JSON.stringify({ configuration: next, changeNote: versionChangeNote.trim() }) });
      await loadModels();
      setNotice(t("analysis.athleteModel.versionPublished"));
      clearNotice();
    } catch (error) {
      setModelError(errorMessage(error, t("analysis.athleteModel.modelSaveFailed")));
    } finally {
      setModelSaving(false);
    }
  };

  const finalizedCount = runs.filter((item) => item.workflowState === "finalized").length;
  const provisionalCount = runs.filter((item) => item.status === "provisional").length;
  const completeCount = runs.filter((item) => item.status === "complete").length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{t("analysis.athleteModel.eyebrow")}</p>
          <h1 className={styles.title}>{t("analysis.athleteModel.title")}</h1>
          <p className={styles.subtitle}>{t("analysis.athleteModel.modelDescription")}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.modelVersionChip}>{t("analysis.athleteModel.activeModel")} <b>{activeModel.version}</b></span>
          <button className={styles.buttonQuiet} type="button" onClick={() => void refreshAll()} disabled={listLoading}>
            {listLoading ? <LoaderCircle size={15} className={styles.spin} /> : <RefreshCw size={15} />}{t("analysis.athleteModel.refresh")}
          </button>
          <button className={styles.buttonPrimary} type="button" onClick={openCandidate} disabled={Boolean(setupError)}>
            <Plus size={16} />{t("analysis.athleteModel.newEvaluation")}
          </button>
        </div>
      </header>

      <div className={styles.overviewStrip}>
        <div><span>{t("analysis.athleteModel.assessments")}</span><strong>{formatLocaleNumber(total, locale)}</strong></div>
        <div><span>{t("analysis.athleteModel.complete")}</span><strong>{formatLocaleNumber(completeCount, locale)}</strong></div>
        <div><span>{t("analysis.athleteModel.provisional")}</span><strong>{formatLocaleNumber(provisionalCount, locale)}</strong></div>
        <div><span>{t("analysis.athleteModel.finalized")}</span><strong>{formatLocaleNumber(finalizedCount, locale)}</strong></div>
        <div className={styles.formulaStamp}><span>SES</span><strong>{t("analysis.athleteModel.formula")}</strong></div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label={t("analysis.athleteModel.title")}>
        <button id="athlete-assessments-tab" type="button" role="tab" aria-controls="athlete-assessments-panel" aria-selected={tab === "assessments"} onClick={() => setTab("assessments")}>
          <FileSearch size={15} />{t("analysis.athleteModel.tabsAssessments")}
        </button>
        <button id="athlete-model-tab" type="button" role="tab" aria-controls="athlete-model-panel" aria-selected={tab === "model"} onClick={() => setTab("model")}>
          <SlidersHorizontal size={15} />{t("analysis.athleteModel.tabsModel")}
        </button>
      </div>

      {notice && <div className={styles.notice} role="status"><Check size={15} />{notice}</div>}
      {(setupError || loadError) && <div className={styles.errorBanner} role="alert"><CircleAlert size={16} /><span>{setupError || loadError}</span><button className={styles.buttonQuiet} type="button" onClick={() => void refreshAll()}>{t("analysis.athleteModel.retry")}</button></div>}

      {tab === "assessments" ? (
        <section id="athlete-assessments-panel" className={styles.assessmentsSection} role="tabpanel" aria-labelledby="athlete-assessments-tab" tabIndex={0} aria-label={t("analysis.athleteModel.assessments")}>
          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <Search size={15} aria-hidden="true" />
              <span className={styles.visuallyHidden}>{t("analysis.athleteModel.search")}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("analysis.athleteModel.searchPlaceholder")} />
            </label>
            <label className={styles.filterField}><span>{t("analysis.athleteModel.workflow")}</span><select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value)}><option value="all">{t("analysis.athleteModel.all")}</option><option value="draft">{t("analysis.athleteModel.draft")}</option><option value="finalized">{t("analysis.athleteModel.finalized")}</option></select></label>
            <label className={styles.filterField}><span>{t("analysis.athleteModel.metricStatus")}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t("analysis.athleteModel.all")}</option><option value="complete">{t("analysis.athleteModel.complete")}</option><option value="provisional">{t("analysis.athleteModel.provisional")}</option><option value="insufficient_data">{t("analysis.athleteModel.insufficientData")}</option></select></label>
            <label className={styles.filterField}><span>{t("analysis.athleteModel.recommendedLevel")}</span><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">{t("analysis.athleteModel.all")}</option>{levelKeys.map((level) => <option key={level} value={level}>{level} · {t(`analysis.athleteModel.levels.${level}.label` as TranslationKey)}</option>)}</select></label>
            <label className={styles.filterField}><span>{t("analysis.athleteModel.scenario")}</span><select value={scenarioFilter} onChange={(event) => setScenarioFilter(event.target.value)}><option value="all">{t("analysis.athleteModel.all")}</option>{scenarioKeys.map((scenario) => <option key={scenario} value={scenario}>{scenarioLabel(scenario, t)}</option>)}</select></label>
          </div>

          <div className={`${styles.assessmentLayout}${selectedId ? ` ${styles.withDetail}` : ""}`}>
            <div className={styles.tableShell}>
              {runs.length ? (
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead><tr><th>{t("analysis.athleteModel.name")}</th><th>{t("analysis.athleteModel.score")}</th><th>{t("analysis.athleteModel.recommendedLevel")}</th><th>{t("analysis.athleteModel.eligibility")}</th><th>{t("analysis.athleteModel.coverage")}</th><th>{t("analysis.athleteModel.asOfDate")}</th><th aria-label={t("analysis.athleteModel.actions")} /></tr></thead>
                    <tbody>
                      {runs.map((item) => (
                        <tr key={item.runId} className={selectedId === item.runId ? styles.selectedRow : undefined}>
                          <td><button type="button" className={styles.athleteName} onClick={() => chooseRun(item.runId)}>{item.candidateName}<small>{item.modelVersion}</small></button></td>
                          <td><strong className={styles.tableScore}>{item.ses === null ? "—" : formatLocaleNumber(item.ses, locale)}</strong><span className={`${styles.statePill} ${styles[`status_${item.status}`]}`}>{statusLabel(item.status, t)}</span></td>
                          <td><span className={styles.levelPill}>{item.recommendedLevel ?? "—"}</span>{item.baseLevel && item.baseLevel !== item.recommendedLevel && <small className={styles.baseLevel}>{t("analysis.athleteModel.baseLevel")}: {item.baseLevel}</small>}</td>
                          <td><span className={`${styles.statePill} ${styles[`eligibility_${item.eligibility}`]}`}>{eligibilityLabel(item.eligibility, t)}</span></td>
                          <td><div className={styles.coverageCell}><span>{formatLocaleNumber(item.coverage, locale)}%</span><i><b style={{ width: `${Math.max(0, Math.min(100, item.coverage))}%` }} /></i></div></td>
                          <td className={styles.dateCell}>{formatDate(item.asOfDate, locale)}</td>
                          <td><button className={styles.iconButton} type="button" onClick={() => chooseRun(item.runId)} aria-label={`${t("analysis.athleteModel.viewDetails")}: ${item.candidateName}`}><ChevronDown size={16} className={selectedId === item.runId ? styles.rotateIcon : undefined} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : listLoading ? (
                <div className={styles.listLoading} role="status"><i /><i /><i /></div>
              ) : (
                <div className={styles.emptyState}><FilePlus2 size={24} /><strong>{t("analysis.athleteModel.noRecords")}</strong><button className={styles.buttonSecondary} type="button" onClick={openCandidate}>{t("analysis.athleteModel.noRecordsAction")}</button></div>
              )}
            </div>
            {selectedId && (
              <aside className={styles.detailPanel} aria-label={t("analysis.athleteModel.details")}>
                <div className={styles.detailPanelHead}><span>{t("analysis.athleteModel.details")}</span><button className={styles.iconButton} type="button" onClick={() => setSelectedId(null)} aria-label={t("analysis.athleteModel.close")}><X size={17} /></button></div>
                {detailLoading ? <div className={styles.detailLoading} role="status"><i /><i /></div> : detailError ? <p className={styles.inlineError} role="alert">{detailError}</p> : detail ? (
                  <EvaluationDetailPanel
                    detail={detail}
                    models={models}
                    locale={locale}
                    t={t}
                    onUpdateMetric={(value) => updateMetric(detail.runId, value)}
                    onRefresh={() => { void loadDetail(detail.runId); void loadRuns(); }}
                    onFinalized={(value) => { setDetail(value); void loadRuns(); }}
                    onRecalculated={(runId) => { setSelectedId(runId); void loadRuns(); }}
                  />
                ) : null}
              </aside>
            )}
          </div>
        </section>
      ) : (
        <ModelOverview
          id="athlete-model-panel"
          models={models}
          activeModel={activeModel}
          modelDraft={modelDraft}
          version={newVersion}
          changeNote={versionChangeNote}
          weightTotal={weightTotal}
          saving={modelSaving}
          error={modelError}
          locale={locale}
          t={t}
          onVersionChange={setNewVersion}
          onChangeNote={setVersionChangeNote}
          onModelChange={setModelDraft}
          onSubmit={publishModel}
        />
      )}

      {candidateOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCandidateOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title">
            <div className={styles.modalHead}><div><p className={styles.eyebrow}>{t("analysis.athleteModel.eyebrow")}</p><h2 id="candidate-dialog-title">{t("analysis.athleteModel.candidateTitle")}</h2></div><button className={styles.iconButton} type="button" onClick={() => setCandidateOpen(false)} aria-label={t("analysis.athleteModel.close")}><X size={18} /></button></div>
            <form onSubmit={(event) => void createCandidate(event)}>
              <label className={styles.formField}><span>{t("analysis.athleteModel.candidateName")}</span><input required maxLength={180} value={candidateName} onChange={(event) => { setCandidateName(event.target.value); setSelectedCandidate(null); setDisambiguation([]); }} autoFocus /></label>
              {candidateLoading && <p className={styles.formHint}><LoaderCircle size={14} className={styles.spin} />{t("analysis.athleteModel.searchCandidates")}</p>}
              {(candidateMatches.length > 0 || disambiguation.length > 0) && <div className={styles.candidateResults} aria-label={t("analysis.athleteModel.athleteProfile")}>
                {disambiguation.length > 1 && <p className={styles.formHint}>{t("analysis.athleteModel.disambiguation")}</p>}
                {candidateMatches.map((candidate) => <button type="button" key={candidate.id} className={`${styles.candidateOption}${selectedCandidate?.id === candidate.id ? ` ${styles.candidateOptionSelected}` : ""}`} onClick={() => { setSelectedCandidate(candidate); setCandidateName(locale === "en" ? candidate.nameEn : candidate.nameZh); }}><span><b>{locale === "en" ? candidate.nameEn : candidate.nameZh}</b><small>{candidate.league ?? "NBA"}{candidate.teamSummary ? ` · ${candidate.teamSummary}` : ""}</small></span>{selectedCandidate?.id === candidate.id && <Check size={16} />}</button>)}
                {disambiguation.filter((candidate) => !candidateMatches.some((match) => match.id === candidate.id)).map((candidate) => <button type="button" key={candidate.id} className={styles.candidateOption} onClick={() => { setSelectedCandidate(candidate); setCandidateName(locale === "en" ? candidate.nameEn : candidate.nameZh); setDisambiguation([]); }}><span><b>{locale === "en" ? candidate.nameEn : candidate.nameZh}</b><small>{candidate.league ?? "NBA"}{candidate.teamSummary ? ` · ${candidate.teamSummary}` : ""}</small></span></button>)}
              </div>}
              <div className={styles.formGrid}>
                <label className={styles.formField}><span>{t("analysis.athleteModel.asOfDate")}</span><input type="date" required max={new Date().toISOString().slice(0, 10)} value={candidateDate} onChange={(event) => setCandidateDate(event.target.value)} /></label>
                <label className={styles.formField}><span>{t("analysis.athleteModel.market")}</span><select value={candidateMarket} onChange={(event) => setCandidateMarket(event.target.value as EvaluationCreationInput["market"])}><option value="china">{t("analysis.athleteModel.china")}</option><option value="north-america">{t("analysis.athleteModel.northAmerica")}</option></select></label>
                <label className={styles.formField}><span>{t("analysis.athleteModel.scenario")}</span><select value={candidateScenario} onChange={(event) => setCandidateScenario(event.target.value as EvaluationScenarioKey)}>{scenarioKeys.map((scenario) => <option value={scenario} key={scenario}>{scenarioLabel(scenario, t)}</option>)}</select></label>
              </div>
              {candidateError && <p className={styles.inlineError} role="alert">{candidateError}</p>}
              <div className={styles.modalActions}><button className={styles.buttonSecondary} type="button" onClick={() => setCandidateOpen(false)}>{t("analysis.athleteModel.cancel")}</button><button className={styles.buttonPrimary} type="submit" disabled={candidateSaving || !candidateName.trim()}>{candidateSaving && <LoaderCircle size={14} className={styles.spin} />}{candidateSaving ? t("analysis.athleteModel.creating") : t("analysis.athleteModel.create")}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

type EvaluationDraftOrDisambiguation = EvaluationDraft | { state: "disambiguation_required"; candidates: Candidate[] };

function EvaluationDetailPanel({
  detail,
  models,
  locale,
  t,
  onUpdateMetric,
  onRefresh,
  onFinalized,
  onRecalculated,
}: {
  detail: EvaluationDetail;
  models: ModelVersion[];
  locale: "zh" | "en";
  t: (key: TranslationKey) => string;
  onUpdateMetric: (value: EvaluationMetricUpdate) => Promise<void>;
  onRefresh: () => void;
  onFinalized: (value: EvaluationDetail) => void;
  onRecalculated: (runId: string) => void;
}) {
  const [panelError, setPanelError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(models.find((model) => model.active)?.version ?? detail.modelVersion);
  const model = models.find((item) => item.version === detail.modelVersion)?.configuration ?? SES_V1_MODEL;
  const isDraft = detail.workflowState === "draft";
  const dimensionScores = detail.dimensions;

  const finalize = async () => {
    if (!window.confirm(t("analysis.athleteModel.finalizeConfirm"))) return;
    setBusyAction("finalize");
    setPanelError("");
    try {
      const result = await apiRequest<EvaluationDetail>(`/api/analysis/athlete-evaluations/${detail.runId}/finalize`, { method: "POST" });
      onFinalized(result);
    } catch (error) {
      setPanelError(errorMessage(error, t("analysis.athleteModel.formError")));
    } finally {
      setBusyAction("");
    }
  };

  const recalculate = async () => {
    if (selectedVersion === detail.modelVersion) return;
    setBusyAction("recalculate");
    setPanelError("");
    try {
      const result = await apiRequest<EvaluationDraft>(`/api/analysis/athlete-evaluations/${detail.runId}/recalculate`, { method: "POST", body: JSON.stringify({ modelVersion: selectedVersion }) });
      onRecalculated(result.runId);
    } catch (error) {
      setPanelError(errorMessage(error, t("analysis.athleteModel.formError")));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className={styles.detailBody}>
      <div className={styles.detailIdentity}><div><h2>{detail.candidateName}</h2><span>{detail.modelVersion} · {scenarioLabel(detail.scenarioKey, t)} · {formatDate(detail.asOfDate, locale)}</span></div><span className={`${styles.statePill} ${styles[`status_${detail.status}`]}`}>{statusLabel(detail.status, t)}</span></div>
      <div className={styles.scoreHero}>
        <div><span>{t("analysis.athleteModel.score")}</span><strong>{detail.ses === null ? "—" : formatLocaleNumber(detail.ses, locale)}</strong></div>
        <div><span>{t("analysis.athleteModel.baseLevel")}</span><b>{detail.baseLevel ?? "—"}</b></div>
        <div><span>{t("analysis.athleteModel.recommendedLevel")}</span><b className={styles.recommended}>{detail.recommendedLevel ?? "—"}</b></div>
        <div><span>{t("analysis.athleteModel.coverage")}</span><b>{formatLocaleNumber(detail.coverage, locale)}%</b></div>
      </div>

      {detail.gates.length > 0 && <div className={styles.gateSummary}><ShieldAlert size={16} /><div><b>{eligibilityLabel(detail.eligibility, t)}</b><ul>{detail.gates.map((gate) => <li key={gate}>{t(gateCopyPath(gate))}</li>)}</ul></div></div>}

      <section className={styles.detailSection}>
        <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.dimensionScores")}</h3><span>{t("analysis.athleteModel.activeModel")} · {model.version}</span></div>
        <div className={styles.dimensionGrid}>
          {EVALUATION_DIMENSIONS.map((dimension) => (
            <article className={styles.dimensionCard} key={dimension}>
              <div className={styles.dimensionTop}><span>{dimension}</span><strong>{dimensionScores[dimension] === null ? "—" : formatLocaleNumber(dimensionScores[dimension]!, locale)}</strong></div>
              <b>{t(dimensionCopyPath(dimension, "title"))}</b>
              <i><span style={{ width: `${dimensionScores[dimension] === null ? 0 : Math.max(0, Math.min(10, dimensionScores[dimension]!)) * 10}%` }} /></i>
              <small>{model.scenarios[detail.scenarioKey][dimension]}% {t("analysis.athleteModel.weight")}</small>
              {(() => {
                const dimensionMetrics = detail.metrics.filter((metric) => METRIC_DEFINITION_KEYS[metric.key] === dimension);
                const verifiedCount = dimensionMetrics.filter((metric) => metric.status === "verified" && detail.sources.some((source) => source.metricKey === metric.key && source.status === "verified" && source.eligibleForScore)).length;
                const pendingCount = detail.sources.filter((source) => METRIC_DEFINITION_KEYS[source.metricKey ?? ""] === dimension && source.status === "suggested").length;
                const conflictCount = dimensionMetrics.filter((metric) => metric.status === "conflict").length;
                const missingCount = dimensionMetrics.filter((metric) => metric.status === "missing").length;
                return <small className={styles.dimensionEvidence}>{t("analysis.athleteModel.sourceCoverage")}: {verifiedCount}/{dimensionMetrics.length} · {t("analysis.athleteModel.verified")} · {pendingCount} {t("analysis.athleteModel.suggested")} · {conflictCount} {t("analysis.athleteModel.conflict")} · {missingCount} {t("analysis.athleteModel.missing")}</small>;
              })()}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.metricEvidence")}</h3><span>{detail.metrics.filter((metric) => metric.status === "verified").length} / {detail.metrics.length}</span></div>
        <div className={styles.metricList}>
          {detail.metrics.map((metric) => {
            const metricSources = detail.sources.filter((source) => source.metricKey === metric.key);
            const refreshKey = `${metric.key}:${metric.status}:${metric.normalizedScore ?? ""}:${asString(metric.rawValue)}:${metric.periodStart ?? ""}:${metric.periodEnd ?? ""}:${metricSources.map((source) => `${source.id}:${source.status}`).join(",")}`;
            return <MetricEvidenceEditor
              key={refreshKey}
              runId={detail.runId}
              metric={metric}
              sources={metricSources}
              asOfDate={detail.asOfDate}
              readOnly={!isDraft}
              locale={locale}
              t={t}
              onSave={onUpdateMetric}
              onSourceReviewed={onRefresh}
            />;
          })}
        </div>
      </section>

      <EligibilityEditor detail={detail} readOnly={!isDraft} t={t} onSaved={onRefresh} />
      <SensitivityBlock detail={detail} model={model} t={t} />
      {detail.productPortfolio && <PortfolioSummaryView portfolio={detail.productPortfolio} locale={locale} t={t} />}

      {detail.profileSources.length > 0 && <section className={styles.detailSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.profileSources")}</h3></div><ul className={styles.compactSources}>{detail.profileSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}: {source.title}<ArrowUpRight size={13} /></a></li>)}</ul></section>}
      {panelError && <p className={styles.inlineError} role="alert">{panelError}</p>}
      <div className={styles.detailActions}>
        {isDraft ? <button type="button" className={styles.buttonPrimary} onClick={() => void finalize()} disabled={busyAction !== "" || detail.status === "insufficient_data"}>{busyAction === "finalize" && <LoaderCircle size={14} className={styles.spin} />}{t("analysis.athleteModel.finalize")}</button> : <span className={styles.readOnlyNote}>{t("analysis.athleteModel.finalizedNotice")}</span>}
        <label className={styles.versionSelect}><span>{t("analysis.athleteModel.modelVersion")}</span><select value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}>{models.map((item) => <option key={item.version} value={item.version}>{item.version}{item.active ? ` · ${t("analysis.athleteModel.activeModel")}` : ""}</option>)}</select></label>
        <button type="button" className={styles.buttonSecondary} onClick={() => void recalculate()} disabled={busyAction !== "" || selectedVersion === detail.modelVersion}>{busyAction === "recalculate" && <LoaderCircle size={14} className={styles.spin} />}{t("analysis.athleteModel.recalculate")}</button>
      </div>
    </div>
  );
}

function MetricEvidenceEditor({
  runId,
  metric,
  sources,
  asOfDate,
  readOnly,
  locale,
  t,
  onSave,
  onSourceReviewed,
}: {
  runId: string;
  metric: MetricInput;
  sources: ResearchSource[];
  asOfDate: string;
  readOnly: boolean;
  locale: "zh" | "en";
  t: (key: TranslationKey) => string;
  onSave: (value: EvaluationMetricUpdate) => Promise<void>;
  onSourceReviewed: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rawValue, setRawValue] = useState(asString(metric.rawValue));
  const [score, setScore] = useState(metric.normalizedScore === null ? "" : String(metric.normalizedScore));
  const [unit, setUnit] = useState(metric.unit ?? "");
  const [periodStart, setPeriodStart] = useState(metric.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(metric.periodEnd ?? "");
  const [rationale, setRationale] = useState(metric.rationale ?? "");
  const [status, setStatus] = useState<MetricStatus>(metric.status);
  const [sourceIds, setSourceIds] = useState<string[]>(sources.filter((source) => source.status === "verified" && source.eligibleForScore).flatMap((source) => source.id ? [source.id] : []));
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePublisher, setSourcePublisher] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [sourceExcerpt, setSourceExcerpt] = useState("");

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const parsedScore = numberOrNull(score);
    if (score.trim() && parsedScore === null) {
      setError(t("analysis.athleteModel.formError"));
      setSaving(false);
      return;
    }
    try {
      await onSave({
        metricKey: metric.key,
        rawValue: rawValue.trim() || null,
        normalizedScore: parsedScore,
        unit: unit.trim() || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        rationale: rationale.trim(),
        status,
        sourceIds,
      });
      setEditing(false);
    } catch (failure) {
      setError(errorMessage(failure, t("analysis.athleteModel.formError")));
    } finally {
      setSaving(false);
    }
  };

  const addSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/api/analysis/athlete-evaluations/research`, {
        method: "POST",
        body: JSON.stringify({ runId, metricKey: metric.key, sources: [{ url: sourceUrl, publisher: sourcePublisher, title: sourceTitle, publishedAt: sourceDate || null, excerpt: sourceExcerpt }] }),
      });
      setSourceUrl(""); setSourcePublisher(""); setSourceTitle(""); setSourceDate(""); setSourceExcerpt(""); setSourceFormOpen(false);
      onSourceReviewed();
    } catch (failure) {
      setError(errorMessage(failure, t("analysis.athleteModel.formError")));
    } finally {
      setSaving(false);
    }
  };

  const reviewSource = async (source: ResearchSource, nextStatus: "verified" | "rejected") => {
    if (!source.id) return;
    setSaving(true); setError("");
    try {
      await apiRequest(`/api/analysis/athlete-evaluations/${runId}/sources`, { method: "PATCH", body: JSON.stringify({ sourceId: source.id, status: nextStatus }) });
      if (nextStatus === "rejected") setSourceIds((current) => current.filter((id) => id !== source.id));
      onSourceReviewed();
    } catch (failure) {
      setError(errorMessage(failure, t("analysis.athleteModel.formError")));
    } finally { setSaving(false); }
  };

  const metricTitle = t(metricLabelPath(metric.key));
  const statusText: Record<MetricStatus, TranslationKey> = { verified: "analysis.athleteModel.verified", needs_review: "analysis.athleteModel.needsReview", missing: "analysis.athleteModel.missing", conflict: "analysis.athleteModel.conflict" };

  return (
    <article className={styles.metricRow}>
      <div className={styles.metricRowSummary}>
        <div><span className={styles.metricCode}>{METRIC_DEFINITION_KEYS[metric.key]}</span><strong>{metricTitle}</strong><small>{t(dimensionCopyPath(METRIC_DEFINITION_KEYS[metric.key], "title"))}</small></div>
        <span className={`${styles.metricScore} ${styles[`metric_${metric.status}`]}`}>{metric.normalizedScore === null ? "—" : formatLocaleNumber(metric.normalizedScore, locale)}<small>{t(statusText[metric.status])}</small></span>
        {!readOnly && <button type="button" className={styles.buttonQuiet} onClick={() => setEditing((current) => !current)}>{editing ? t("analysis.athleteModel.close") : t("analysis.athleteModel.editMetric")}</button>}
      </div>
      {metric.rationale && <p className={styles.metricRationale}>{metric.rationale}</p>}
      {sources.length > 0 && <ul className={styles.sourceList}>
        {sources.map((source) => (
          <li key={source.id ?? source.url} className={!source.eligibleForScore ? styles.sourceLater : undefined}>
            <div className={styles.sourceMain}><a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.publisher}: ${source.title} (${t("analysis.athleteModel.openSource")})`}>{source.publisher}: {source.title}<ArrowUpRight size={12} /></a><small>{source.publishedAt ? formatDate(source.publishedAt, locale) : t("analysis.athleteModel.emptyValue")} · {t(`analysis.athleteModel.${source.status}` as TranslationKey)} · {source.eligibleForScore ? t("analysis.athleteModel.eligibleAsOf") : t("analysis.athleteModel.laterContext")}</small></div>
            {!readOnly && source.status === "suggested" && <div className={styles.sourceActions}><button type="button" onClick={() => void reviewSource(source, "verified")} disabled={saving || !source.eligibleForScore}><Check size={13} />{t("analysis.athleteModel.verified")}</button><button type="button" onClick={() => void reviewSource(source, "rejected")} disabled={saving}>{t("analysis.athleteModel.rejected")}</button></div>}
          </li>
        ))}
      </ul>}
      {editing && !readOnly && <div className={styles.metricForm}>
        <form className={styles.metricFieldsForm} onSubmit={(event) => void save(event)}>
          <div className={styles.formGrid}><label className={styles.formField}><span>{t("analysis.athleteModel.rawValue")}</span><input value={rawValue} onChange={(event) => setRawValue(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.normalizedScore")}</span><input type="number" min="0" max="10" step="0.1" value={score} onChange={(event) => setScore(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.unit")}</span><input value={unit} onChange={(event) => setUnit(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.metricStatus")}</span><select value={status} onChange={(event) => setStatus(event.target.value as MetricStatus)}><option value="verified">{t("analysis.athleteModel.verified")}</option><option value="needs_review">{t("analysis.athleteModel.needsReview")}</option><option value="missing">{t("analysis.athleteModel.missing")}</option><option value="conflict">{t("analysis.athleteModel.conflict")}</option></select></label><label className={styles.formField}><span>{t("analysis.athleteModel.periodStart")}</span><input type="date" max={asOfDate} value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.periodEnd")}</span><input type="date" max={asOfDate} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label></div>
          <label className={styles.formField}><span>{t("analysis.athleteModel.rationale")}</span><textarea rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
          {sources.filter((source) => source.status !== "rejected" && source.eligibleForScore).length > 0 && <fieldset className={styles.sourceChecks}><legend>{t("analysis.athleteModel.verified")} · {t("analysis.athleteModel.metricEvidence")}</legend>{sources.filter((source) => source.status !== "rejected" && source.eligibleForScore).map((source) => <label key={source.id} className={styles.checkLabel}><input type="checkbox" checked={Boolean(source.id && sourceIds.includes(source.id))} onChange={(event) => { if (!source.id) return; setSourceIds((current) => event.target.checked ? [...current, source.id!] : current.filter((id) => id !== source.id)); }} /><span>{source.title}</span></label>)}</fieldset>}
          {!sourceFormOpen && <button className={styles.buttonQuiet} type="button" onClick={() => setSourceFormOpen(true)}><Plus size={14} />{t("analysis.athleteModel.addSource")}</button>}
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          <div className={styles.inlineActions}><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(false)}>{t("analysis.athleteModel.cancel")}</button><button className={styles.buttonPrimarySmall} type="submit" disabled={saving}>{saving && <LoaderCircle size={13} className={styles.spin} />}{t("analysis.athleteModel.saveMetric")}</button></div>
        </form>
        {sourceFormOpen && <form className={styles.manualSourceForm} onSubmit={(event) => void addSource(event)}>
          <div className={styles.formGrid}><label className={styles.formField}><span>{t("analysis.athleteModel.sourceUrl")}</span><input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.publisher")}</span><input required value={sourcePublisher} onChange={(event) => setSourcePublisher(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.sourceTitle")}</span><input required value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} /></label><label className={styles.formField}><span>{t("analysis.athleteModel.publishedAt")}</span><input type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} /></label></div>
          <label className={styles.formField}><span>{t("analysis.athleteModel.excerpt")}</span><textarea rows={2} value={sourceExcerpt} onChange={(event) => setSourceExcerpt(event.target.value)} /></label>
          <div className={styles.inlineActions}><button className={styles.buttonSecondary} type="button" onClick={() => setSourceFormOpen(false)}>{t("analysis.athleteModel.cancel")}</button><button className={styles.buttonQuiet} type="submit" disabled={saving}>{saving && <LoaderCircle size={13} className={styles.spin} />}{t("analysis.athleteModel.addSource")}</button></div>
        </form>}
      </div>}
    </article>
  );
}

function EligibilityEditor({ detail, readOnly, t, onSaved }: { detail: EvaluationDetail; readOnly: boolean; t: (key: TranslationKey) => string; onSaved: () => void }) {
  const [competitor, setCompetitor] = useState(detail.eligibilityEvidence.competitorExclusive === null ? "unknown" : detail.eligibilityEvidence.competitorExclusive ? "yes" : "no");
  const [competitorSources, setCompetitorSources] = useState(detail.eligibilityEvidence.competitorSourceIds);
  const [majorConcern, setMajorConcern] = useState(detail.eligibilityEvidence.majorConcernNeedsReview);
  const [concernSources, setConcernSources] = useState(detail.eligibilityEvidence.majorConcernSourceIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const verifiedSources = detail.sources.filter((source) => source.id && source.status === "verified" && source.eligibleForScore);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    const payload: EvaluationEligibilityUpdate = {
      competitorExclusive: competitor === "unknown" ? null : competitor === "yes",
      competitorSourceIds: competitorSources,
      majorConcernNeedsReview: majorConcern,
      majorConcernSourceIds: concernSources,
    };
    try {
      await apiRequest(`/api/analysis/athlete-evaluations/${detail.runId}/eligibility`, { method: "PATCH", body: JSON.stringify(payload) });
      onSaved();
    } catch (failure) { setError(errorMessage(failure, t("analysis.athleteModel.formError"))); }
    finally { setSaving(false); }
  };
  const sourcePicker = (title: string, values: string[], setValues: (values: string[]) => void) => <fieldset className={styles.sourceChecks}><legend>{title}</legend>{verifiedSources.length ? verifiedSources.map((source) => <label key={source.id} className={styles.checkLabel}><input type="checkbox" checked={values.includes(source.id!)} onChange={(event) => setValues(event.target.checked ? [...values, source.id!] : values.filter((id) => id !== source.id))} /><span>{source.title}</span></label>) : <small>{t("analysis.athleteModel.noRecords")}</small>}</fieldset>;
  return (
    <section className={styles.detailSection}>
      <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.gateHeading")}</h3><span>{eligibilityLabel(detail.eligibility, t)}</span></div>
      <form className={styles.eligibilityForm} onSubmit={(event) => void save(event)}>
        <label className={styles.formField}><span>{t("analysis.athleteModel.competitorContract")}</span><select value={competitor} onChange={(event) => setCompetitor(event.target.value)} disabled={readOnly}><option value="unknown">{t("analysis.athleteModel.competitorUnknown")}</option><option value="yes">{t("analysis.athleteModel.competitorYes")}</option><option value="no">{t("analysis.athleteModel.competitorNo")}</option></select></label>
        {competitor !== "unknown" && sourcePicker(t("analysis.athleteModel.competitorSources"), competitorSources, setCompetitorSources)}
        <label className={styles.checkLabel}><input type="checkbox" checked={majorConcern} onChange={(event) => setMajorConcern(event.target.checked)} disabled={readOnly} /><span>{t("analysis.athleteModel.majorConcern")}</span></label>
        {majorConcern && sourcePicker(t("analysis.athleteModel.concernSources"), concernSources, setConcernSources)}
        {error && <p className={styles.inlineError} role="alert">{error}</p>}
        {!readOnly && <button className={styles.buttonSecondary} type="submit" disabled={saving}>{saving && <LoaderCircle size={13} className={styles.spin} />}{t("analysis.athleteModel.saveEligibility")}</button>}
      </form>
    </section>
  );
}

function SensitivityBlock({ detail, model, t }: { detail: EvaluationDetail; model: EvaluationModel; t: (key: TranslationKey) => string }) {
  return <section className={styles.detailSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.sensitivity")}</h3><span>{t("analysis.athleteModel.sensitivityHint")}</span></div><div className={styles.sensitivityGrid}>{scenarioKeys.map((scenario) => { const score = detail.sensitivity[scenario]; const level = scenarioLevel(score, model); return <div key={scenario}><span>{scenarioLabel(scenario, t)}</span><strong>{score === null ? "—" : score.toFixed(2)}</strong><small>{level ?? t("analysis.athleteModel.noLevel")}</small></div>; })}</div></section>;
}

function PortfolioSummaryView({ portfolio, locale, t }: { portfolio: AthletePortfolioSummary; locale: "zh" | "en"; t: (key: TranslationKey) => string }) {
  if (!portfolio.lineCount) return <section className={styles.detailSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.portfolio.title")}</h3></div><p className={styles.mutedText}>{t("analysis.athleteModel.portfolio.noLinks")}</p></section>;
  return (
    <section className={styles.portfolioSection}>
      <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.portfolio.title")}</h3><span>{t("analysis.athleteModel.verified")}</span></div>
      <div className={styles.portfolioStats}><div><b>{portfolio.lineCount}</b><span>{t("analysis.athleteModel.portfolio.lines")}</span></div><div><b>{portfolio.modelCount}</b><span>{t("analysis.athleteModel.portfolio.models")}</span></div><div><b>{portfolio.skuCount}</b><span>{t("analysis.athleteModel.portfolio.skus")}</span></div></div>
      <div className={styles.portfolioCoverage}>
        <div><span>{t("analysis.athleteModel.portfolio.tierCoverage")}</span><b>{portfolio.skuTierCoverage.percentage === null ? "—" : `${portfolio.skuTierCoverage.percentage}%`}</b></div>
        <div><span>{t("analysis.athleteModel.portfolio.marketCoverage")}</span><b>{portfolio.launchMarketCoverage.percentage === null ? "—" : `${portfolio.launchMarketCoverage.percentage}%`}</b></div>
        <div><span>{t("analysis.athleteModel.portfolio.chinaShare")}</span><b>{portfolio.regionalModelShare === null ? "—" : `${portfolio.regionalModelShare}%`}</b></div>
        <div><span>{t("analysis.athleteModel.portfolio.colorCoverage")}</span><b>{portfolio.colorwayCoverage.percentage === null ? "—" : `${portfolio.colorwayCoverage.percentage}%`}</b></div>
      </div>
      <div className={styles.tierMix}>{Object.entries(portfolio.skuCountsByTier).filter(([tier, skuCount]) => skuCount > 0 || portfolio.modelCountsByTier[tier] > 0).map(([tier, skuCount]) => <span key={tier}>{tierTranslation(tier, t)}<small>{portfolio.modelCountsByTier[tier] ?? 0} {t("analysis.athleteModel.portfolio.models")} · {skuCount} {t("analysis.athleteModel.portfolio.skus")}</small></span>)}</div>
      <p className={styles.cadenceLine}><span>{t("analysis.athleteModel.portfolio.releaseCadence")}</span>{portfolio.releaseYearCadence.length ? portfolio.releaseYearCadence.map(({ year, modelCount }) => `${year} (${modelCount})`).join(" · ") : "—"}</p>
      <div className={styles.portfolioObservations}>
        {portfolio.lines.flatMap((line) => line.models.map((model) => ({ line: line.lineName, model }))).map(({ line, model }) => {
          const prices = [...model.prices].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, 2);
          const availability = [...model.availability].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).slice(0, 2);
          if (!prices.length && !availability.length) return null;
          return <article key={model.spuId}><div className={styles.observationHead}><strong>{model.spuName}</strong><small>{line}</small></div>
            {prices.map((item, index) => <p key={`p-${index}`}><span>{t("analysis.athleteModel.portfolio.price")}</span><b>{item.amount} {item.currency}</b><small>{item.priceBasis} · {formatDate(item.observedAt, locale)} · <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t("analysis.athleteModel.openSource")} <ArrowUpRight size={11} /></a></small></p>)}
            {availability.map((item, index) => <p key={`a-${index}`}><span>{t("analysis.athleteModel.portfolio.availability")}</span><b>{item.status}</b><small>{formatDate(item.observedAt, locale)} · <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t("analysis.athleteModel.openSource")} <ArrowUpRight size={11} /></a></small></p>)}
          </article>;
        })}
      </div>
      {!portfolio.observedPriceCount && !portfolio.observedAvailabilityCount && <p className={styles.mutedText}>{t("analysis.athleteModel.portfolio.noObservations")}</p>}
    </section>
  );
}

function ModelOverview({
  id,
  models,
  activeModel,
  modelDraft,
  version,
  changeNote,
  weightTotal,
  saving,
  error,
  locale,
  t,
  onVersionChange,
  onChangeNote,
  onModelChange,
  onSubmit,
}: {
  id: string;
  models: ModelVersion[];
  activeModel: EvaluationModel;
  modelDraft: EvaluationModel;
  version: string;
  changeNote: string;
  weightTotal: number;
  saving: boolean;
  error: string;
  locale: "zh" | "en";
  t: (key: TranslationKey) => string;
  onVersionChange: (value: string) => void;
  onChangeNote: (value: string) => void;
  onModelChange: (value: EvaluationModel) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const updateWeight = (dimension: (typeof EVALUATION_DIMENSIONS)[number], value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    onModelChange({ ...modelDraft, scenarios: { ...modelDraft.scenarios, "china-priority": { ...modelDraft.scenarios["china-priority"], [dimension]: parsed } } });
  };
  const updateThreshold = (level: "L1" | "L2" | "L3" | "L4", value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    onModelChange({ ...modelDraft, thresholds: { ...modelDraft.thresholds, [level]: parsed } });
  };
  return (
    <div id={id} className={styles.modelOverview} role="tabpanel" aria-labelledby="athlete-model-tab" tabIndex={0}>
      <div className={styles.modelIntro}><div><p className={styles.eyebrow}>{t("analysis.athleteModel.modelVersions")}</p><h2>{t("analysis.athleteModel.title")}</h2></div><p>{t("analysis.athleteModel.formula")}</p></div>
      <div className={styles.scenarioWeights}>{scenarioKeys.map((scenario) => <article key={scenario}><h3>{scenarioLabel(scenario, t)}</h3><div>{EVALUATION_DIMENSIONS.map((dimension) => <span key={dimension}>{dimension}<b>{activeModel.scenarios[scenario][dimension]}%</b></span>)}</div></article>)}</div>

      <section className={styles.modelSection}>
        <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.explanation")}</h3><span>{activeModel.version}</span></div>
        <div className={styles.dimensionDefinitions}>
          {EVALUATION_DIMENSIONS.map((dimension) => (
            <article className={styles.definitionCard} key={dimension}>
              <header><div><span>{dimension}</span><h3>{t(dimensionCopyPath(dimension, "title"))}</h3></div><strong>{activeModel.scenarios["china-priority"][dimension]}%</strong></header>
              <p>{t(dimensionCopyPath(dimension, "description"))}</p>
              <div className={styles.submetricTable}>
                {Object.entries(activeModel.metricWeights[dimension]).map(([key, weight]) => <div key={key}><b>{t(metricLabelPath(key))}</b><span>{weight}%</span><p>{t(metricCopyPath(key))}</p></div>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.modelLowerGrid}>
        <section className={styles.modelSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.scoringScale")}</h3></div><ul className={styles.anchorList}>{["scaleLow", "scaleBelow", "scaleMedian", "scaleAbove", "scaleTop", "scaleRare", "scaleUnknown"].map((key) => <li key={key}><CircleHelp size={14} /><span>{t(`analysis.athleteModel.${key}` as TranslationKey)}</span></li>)}</ul><p className={styles.coverageRule}>{locale === "en" ? "A dimension requires at least 70% verified submetric weight. Provisional SES requires at least 80% overall coverage and valid D1, D2, D4 and D5." : "维度至少需要覆盖 70% 的已核验子指标权重；暂定 SES 需要总体覆盖率达到 80%，且 D1、D2、D4、D5 有效。"}</p></section>
        <section className={styles.modelSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.levelsHeading")}</h3></div><div className={styles.levelList}>{levelKeys.map((level) => <div key={level}><span>{level}</span><b>{t(`analysis.athleteModel.levels.${level}.range` as TranslationKey)}</b><strong>{t(`analysis.athleteModel.levels.${level}.label` as TranslationKey)}</strong><p>{t(`analysis.athleteModel.levels.${level}.recommendation` as TranslationKey)}</p></div>)}</div></section>
      </div>
      <section className={styles.modelSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.gatesHeading")}</h3></div><ul className={styles.gateRules}>{["competitor", "competitorUnknown", "concern", "story", "china", "provisional", "weightSensitive"].map((key) => <li key={key}><ShieldAlert size={15} /><span>{t(`analysis.athleteModel.gates.${key}` as TranslationKey)}</span></li>)}</ul></section>

      <section className={styles.versionWorkspace}>
        <div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.publishVersion")}</h3><span>{t("analysis.athleteModel.versionImmutable")}</span></div>
        <form onSubmit={onSubmit}>
          <div className={styles.modelFormTop}><label className={styles.formField}><span>{t("analysis.athleteModel.newVersion")}</span><input required value={version} onChange={(event) => onVersionChange(event.target.value)} /></label><div className={styles.weightTotal} data-valid={weightTotal === 100}><span>{t("analysis.athleteModel.baselineWeights")}</span><b>{weightTotal}%</b></div></div>
          <label className={styles.formField}><span>{t("analysis.athleteModel.versionChangeNote")}</span><textarea required maxLength={2000} rows={2} value={changeNote} onChange={(event) => onChangeNote(event.target.value)} placeholder={t("analysis.athleteModel.versionChangeNoteHint")} /></label>
          <div className={styles.weightEditor}>{EVALUATION_DIMENSIONS.map((dimension) => <label key={dimension}><span>{dimension} · {t(dimensionCopyPath(dimension, "title"))}</span><div><input type="number" min="0" max="100" value={modelDraft.scenarios["china-priority"][dimension]} onChange={(event) => updateWeight(dimension, event.target.value)} /><b>%</b></div></label>)}</div>
          <div className={styles.thresholdEditor}><h4>{t("analysis.athleteModel.levelsHeading")}</h4>{thresholdKeys.map((level) => <label key={level}><span>{level}</span><input type="number" min="0" max="100" step="1" value={modelDraft.thresholds[level]} onChange={(event) => updateThreshold(level, event.target.value)} /></label>)}</div>
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          <div className={styles.modalActions}><span>{t("analysis.athleteModel.activeModel")} · {activeModel.version}</span><button className={styles.buttonPrimary} type="submit" disabled={saving || !version.trim() || !changeNote.trim() || weightTotal !== 100}>{saving && <LoaderCircle size={14} className={styles.spin} />}{t("analysis.athleteModel.publishVersion")}</button></div>
        </form>
      </section>
      <section className={styles.modelSection}><div className={styles.sectionTitle}><h3>{t("analysis.athleteModel.modelVersions")}</h3></div><div className={styles.versionList}>{models.map((item) => <article key={item.version}><div className={styles.versionIdentity}><div><strong>{item.version}</strong>{item.active && <span className={styles.activeTag}>{t("analysis.athleteModel.activeModel")}</span>}</div><small>{item.changeNote || t("analysis.athleteModel.noChangeNote")}</small></div><time>{formatDate(item.publishedAt, locale)}</time></article>)}</div></section>
    </div>
  );
}
