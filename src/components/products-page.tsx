"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  Eye,
  PackageOpen,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { ArchiveConfirmation } from "@/components/archive-confirmation";
import { ProductRecordForm } from "@/components/product-form";
import { LocaleLink } from "@/lib/i18n/locale-link";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatLocaleDate, formatLocaleNumber, formatProductValue, translatedApiError, translatedFieldError, translatedFieldLabel } from "@/lib/i18n/display";
import type { ModelFieldDto, ProductLevel, SpuDetailDto, SpuListItemDto, SkuDetailDto } from "@/lib/products/types";
import type { TranslationKey } from "@/lib/i18n/types";

type RecordStatus = "active" | "archived";
type ProductListResponse = { items: SpuListItemDto[]; total: number; page: number; pageSize: number; pageCount: number };
type ProductFormState = { level: ProductLevel; record?: SpuDetailDto | SkuDetailDto; parentId?: string; parentName?: string };
type ArchiveTarget = { id: string; name: string; skuCount: number };

const pageSize = 20;
const primaryKeys = new Set(["category", "sport", "series"]);
const sportFilterValues = { basketball: "篮球", football: "足球", athletics: "田径", tennis: "网球" } as const;

function interpolate(template: string, values: Record<string, string | number>, locale: "zh" | "en") {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, typeof value === "number" ? formatLocaleNumber(value, locale) : value), template);
}

export function ProductsPage() {
  const { locale, t } = useLocale();
  const [status, setStatus] = useState<RecordStatus>("active");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [sport, setSport] = useState("");
  const [athlete, setAthlete] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | null>(null);
  const [spuFields, setSpuFields] = useState<ModelFieldDto[]>([]);
  const [skuFields, setSkuFields] = useState<ModelFieldDto[]>([]);
  const [fieldsError, setFieldsError] = useState<ApiClientError | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set("q", query.trim());
    if (brand.trim()) params.set("brand", brand.trim());
    if (sport.trim()) params.set("sport", sport.trim());
    if (athlete.trim()) params.set("athlete", athlete.trim());
    try {
      setResult(await apiRequest<ProductListResponse>(`/api/spus?${params.toString()}`));
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", ""));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [status, page, query, brand, sport, athlete]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadList(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<ModelFieldDto[]>("/api/model-fields?level=spu"),
      apiRequest<ModelFieldDto[]>("/api/model-fields?level=sku"),
    ]).then(([spu, sku]) => {
      if (cancelled) return;
      setSpuFields(spu);
      setSkuFields(sku);
      setFieldsError(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setFieldsError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", ""));
    });
    return () => { cancelled = true; };
  }, []);

  const customColumns = useMemo(() => spuFields.filter((field) => !field.isSystem && field.showInList && !primaryKeys.has(field.key)), [spuFields]);
  const currentPageCount = result?.pageCount ?? 0;
  const unavailable = loadError || fieldsError;
  const missingDatabase = loadError?.code === "DATABASE_NOT_CONFIGURED" || fieldsError?.code === "DATABASE_NOT_CONFIGURED";

  const showToast = (message: string, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3000);
  };
  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const resetFormErrors = () => { setFormError(""); setFieldErrors({}); };
  const openCreateSpu = () => { setForm({ level: "spu" }); resetFormErrors(); };
  const openEditSpu = async (item: SpuListItemDto) => {
    try {
      const record = await apiRequest<SpuDetailDto>(`/api/spus/${item.id}?status=active`);
      setForm({ level: "spu", record });
      resetFormErrors();
    } catch (error) {
      showToast(translatedApiError(error, locale), true);
    }
  };
  const openCreateSku = (item: SpuListItemDto) => {
    setForm({ level: "sku", parentId: item.id, parentName: `${item.spuCode} · ${item.name}` });
    resetFormErrors();
  };

  const submitForm = async (payload: Record<string, unknown>) => {
    if (!form) return;
    setBusy(true);
    resetFormErrors();
    try {
      if (form.level === "spu") {
        if (form.record) {
          await apiRequest(`/api/spus/${form.record.id}`, { method: "PATCH", body: JSON.stringify(payload) });
          showToast(t("products.spuUpdatedToast"));
        } else {
          await apiRequest("/api/spus", { method: "POST", body: JSON.stringify(payload) });
          showToast(t("products.spuCreatedToast"));
        }
      } else if (form.parentId) {
        await apiRequest(`/api/spus/${form.parentId}/skus`, { method: "POST", body: JSON.stringify(payload) });
        showToast(t("products.skuCreatedToast"));
      }
      setForm(null);
      await loadList();
    } catch (error) {
      setFormError(translatedApiError(error, locale));
      if (error instanceof ApiClientError && error.fields) {
        setFieldErrors(Object.fromEntries(Object.entries(error.fields).map(([key, message]) => [key, translatedFieldError(message, t)])));
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      const response = await apiRequest<{ archivedSkuCount: number }>(`/api/spus/${archiveTarget.id}`, { method: "DELETE" });
      showToast(interpolate(t("products.archiveCountToast"), { count: response.archivedSkuCount }, locale));
      setArchiveTarget(null);
      await loadList();
    } catch (error) {
      showToast(translatedApiError(error, locale), true);
    } finally {
      setBusy(false);
    }
  };
  const restoreSpu = async (id: string) => {
    setBusy(true);
    try {
      const response = await apiRequest<{ restoredSkuCount: number }>(`/api/spus/${id}/restore`, { method: "POST" });
      showToast(interpolate(t("products.spuRestoredToast"), { count: response.restoredSkuCount }, locale));
      await loadList();
    } catch (error) { showToast(translatedApiError(error, locale), true); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <div className="page-heading">
        <div><p className="eyebrow">{t("products.eyebrow")}</p><h1 className="page-title">{t("products.title")}</h1></div>
        {status === "active" && <div className="page-actions"><button className="button button-primary" onClick={openCreateSpu} disabled={Boolean(unavailable) || busy}><Plus size={15} />{t("products.createSpu")}</button></div>}
      </div>

      {unavailable && <div className={`notice ${missingDatabase ? "warning" : ""}`} role="status" style={{ marginBottom: 20 }}>
        {missingDatabase ? <Database size={17} /> : <CircleAlert size={17} />}
        <div><strong>{missingDatabase ? t("products.databaseNeededTitle") : t("products.databaseUnavailableTitle")}</strong><p>{missingDatabase ? t("products.databaseSetup") : translatedApiError(loadError ?? fieldsError, locale)}</p></div>
      </div>}

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search-wrap"><Search size={15} aria-hidden="true" /><input className="search-input" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder={t("products.search")} aria-label={t("products.search")} /></label>
          <input className="select-input filter-input" value={brand} onChange={(event) => changeFilter(setBrand, event.target.value)} placeholder={t("products.brandFilter")} aria-label={t("products.brandFilterLabel")} />
          <select className="select-input filter-input" value={sport} onChange={(event) => changeFilter(setSport, event.target.value)} aria-label={t("products.sportFilterLabel")}>
            <option value="">{t("products.sportFilter")}</option>
            {(["basketball", "football", "athletics", "tennis"] as const).map((key) => <option key={key} value={sportFilterValues[key]}>{t(`stars.sports.${key}`)}</option>)}
          </select>
          <input className="select-input filter-input" value={athlete} onChange={(event) => changeFilter(setAthlete, event.target.value)} placeholder={t("products.athleteFilter")} aria-label={t("products.athleteFilterLabel")} />
        </div>
        <div className="toolbar-group">
          <div className="view-switch" role="group" aria-label={t("products.recordStatus")}>
            <button type="button" aria-pressed={status === "active"} onClick={() => { setStatus("active"); setPage(1); }}>{t("products.active")}</button>
            <button type="button" aria-pressed={status === "archived"} onClick={() => { setStatus("archived"); setPage(1); }}>{t("products.archived")}</button>
          </div>
          <span className="count-label">{formatLocaleNumber(result?.total ?? 0, locale)} {t("products.count")}</span>
        </div>
      </div>

      <div className="data-card">
        {loading ? <div className="loading-block"><span className="spinner" />{t("products.loading")}</div> : result?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="data-table product-table">
                <thead><tr><th>{t("products.headerSpu")}</th><th>{t("products.brand")}</th><th>{t("products.category")}</th><th>{t("products.sport")}</th><th>{t("products.series")}</th>{customColumns.map((field) => <th key={field.id}>{translatedFieldLabel(field.key, field.label, t)}</th>)}<th>{t("products.skuCount")}</th><th>{t("products.updatedAt")}</th><th><span className="sr-only">{t("modelFields.edit")}</span></th></tr></thead>
                <tbody>
                  {result.items.map((item) => <ProductRows
                    key={item.id}
                    item={item}
                    status={status}
                    customColumns={customColumns}
                    busy={busy}
                    locale={locale}
                    t={t}
                    onEdit={() => void openEditSpu(item)}
                    onAddSku={() => openCreateSku(item)}
                    onArchive={() => setArchiveTarget(item)}
                    onRestore={() => void restoreSpu(item.id)}
                  />)}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="count-label">{interpolate(t("products.page"), { page: result.page, pages: Math.max(1, result.pageCount) }, locale)} · {interpolate(t("products.rowsPerPage"), { count: result.pageSize }, locale)}</span>
              <div className="pagination">
                <button aria-label={t("products.previousPage")} disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /></button>
                <span>{page} / {Math.max(1, currentPageCount)}</span>
                <button aria-label={t("products.nextPage")} disabled={page >= currentPageCount || loading} onClick={() => setPage((value) => Math.min(currentPageCount, value + 1))}><ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state"><div><span className="empty-icon">{loadError ? <Database size={19} /> : <PackageOpen size={19} />}</span>
            <h3>{loadError ? (missingDatabase ? t("products.databaseTitle") : t("products.unavailableTitle")) : status === "archived" ? t("products.noArchived") : t("products.noProducts")}</h3>
            <p>{loadError ? (missingDatabase ? t("products.databaseSetup") : translatedApiError(loadError, locale)) : status === "archived" ? t("products.emptyArchived") : t("products.emptyActive")}</p>
            {!loadError && status === "active" && <button className="button button-primary" onClick={openCreateSpu} disabled={Boolean(unavailable) || busy}><Plus size={14} />{t("products.createSpu")}</button>}
          </div></div>
        )}
      </div>

      {form && <ProductRecordForm key={`${form.level}-${form.record?.id ?? "new"}-${form.parentId ?? ""}`} level={form.level} fields={form.level === "spu" ? spuFields : skuFields} record={form.record} parentName={form.parentName} pending={busy} error={formError} fieldErrors={fieldErrors} onClose={() => setForm(null)} onSubmit={(payload) => void submitForm(payload)} />}
      {archiveTarget && <ArchiveConfirmation
        title={interpolate(t("products.deleteTitle"), { level: "SPU", name: archiveTarget.name }, locale)}
        description={interpolate(t("products.deleteSpuDescription"), { count: archiveTarget.skuCount }, locale)}
        pending={busy}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
      />}
      {toast && <div className="toast-region" role="status"><div className={`toast${toast.error ? " error" : ""}`}>{toast.error ? <CircleAlert size={15} /> : <Database size={15} />}{toast.message}</div></div>}
    </section>
  );
}

function ProductRows({
  item, status, customColumns, busy, locale, t, onEdit, onAddSku, onArchive, onRestore,
}: {
  item: SpuListItemDto;
  status: RecordStatus;
  customColumns: ModelFieldDto[];
  busy: boolean;
  locale: "zh" | "en";
  t: (key: TranslationKey) => string;
  onEdit: () => void;
  onAddSku: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const colSpan = 8 + customColumns.length;
  return <>
    <tr>
      <td><div className="product-name">{item.name}</div><div className="code-text" style={{ marginTop: 3 }}>{item.spuCode}</div>{item.archivedAt && <span className="tag archived" style={{ marginTop: 5 }}>{t("products.archived")}</span>}</td>
      <td>{item.brand || "—"}</td>
      <td>{formatProductValue(item.values.category, locale)}</td>
      <td>{formatProductValue(item.values.sport, locale)}</td>
      <td>{formatProductValue(item.values.series, locale)}</td>
      {customColumns.map((field) => <td key={field.id}>{formatProductValue(item.values[field.key], locale, "—", field.type)}</td>)}
      <td><span className="sku-count">{formatLocaleNumber(item.skuCount, locale)}</span></td>
      <td><span className="product-subline">{formatLocaleDate(item.updatedAt, locale)}</span></td>
      <td><div className="table-actions">
        <LocaleLink className="icon-button" title={t("products.openDetails")} aria-label={`${t("products.openDetails")}: ${item.name}`} href={`/products/${item.id}`}><Eye size={15} /></LocaleLink>
        {status === "active" ? <>
          <button className="icon-button" title={t("products.createSku")} aria-label={`${t("products.createSku")}: ${item.name}`} disabled={busy} onClick={onAddSku}><PackagePlus size={15} /></button>
          <button className="icon-button" title={t("products.editSpu")} aria-label={`${t("products.editSpu")}: ${item.name}`} disabled={busy} onClick={onEdit}><SquarePen size={15} /></button>
          <button className="icon-button danger" title={t("products.deleteSpu")} aria-label={`${t("products.deleteSpu")}: ${item.name}`} disabled={busy} onClick={onArchive}><Trash2 size={15} /></button>
        </> : <button className="icon-button" title={t("products.restoreSpu")} aria-label={`${t("products.restoreSpu")}: ${item.name}`} disabled={busy} onClick={onRestore}><RotateCcw size={15} /></button>}
      </div></td>
    </tr>
    <tr className="sku-cards-row"><td colSpan={colSpan}>
      <div className="sku-cards-heading"><span>{t("products.latestSkus")}</span>{item.skuCount > item.latestSkus.length && <span className="sku-more">+{formatLocaleNumber(item.skuCount - item.latestSkus.length, locale)} {t("products.moreSkus")}</span>}</div>
      {item.latestSkus.length ? <div className="sku-card-list">{item.latestSkus.slice(0, 5).map((sku) => <article className="sku-summary-card" key={sku.id}>
        <div className="sku-summary-heading"><strong>{sku.name}</strong><span className="code-text">{sku.skuCode}</span></div>
        {sku.fields.length ? <dl>{sku.fields.map((field) => <div key={field.key}><dt>{translatedFieldLabel(field.key, field.label, t)}</dt><dd>{formatProductValue(field.value, locale, "—", field.type)}</dd></div>)}</dl> : <span className="count-label">{t("products.noSku")}</span>}
      </article>)}</div> : <div className="sku-card-empty">{t("products.noSku")}</div>}
    </td></tr>
  </>;
}
