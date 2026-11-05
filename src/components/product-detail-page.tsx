"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  LoaderCircle,
  PackagePlus,
  RotateCcw,
  SquarePen,
} from "lucide-react";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { ArchiveConfirmation } from "@/components/archive-confirmation";
import { ProductRecordForm } from "@/components/product-form";
import { LocaleLink } from "@/lib/i18n/locale-link";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatLocaleDate, formatLocaleNumber, formatProductValue, translatedApiError, translatedFieldError, translatedFieldLabel } from "@/lib/i18n/display";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { ModelFieldDto, ProductLevel, SpuDetailDto, SpuSkuPageDto, SkuDetailDto } from "@/lib/products/types";

type RecordStatus = "active" | "archived";
type ProductFormState = { level: ProductLevel; record?: SpuDetailDto | SkuDetailDto; parentId?: string; parentName?: string };
type ArchiveTarget = { type: "spu"; id: string; name: string } | { type: "sku"; id: string; name: string };
const pageSize = 50;

function interpolate(template: string, values: Record<string, string | number>, locale: Locale) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, typeof value === "number" ? formatLocaleNumber(value, locale) : value), template);
}

export function ProductDetailPage({ spuId }: { spuId: string }) {
  const { locale, t } = useLocale();
  const [detail, setDetail] = useState<SpuDetailDto | null>(null);
  const [skuPage, setSkuPage] = useState<SpuSkuPageDto | null>(null);
  const [skuStatus, setSkuStatus] = useState<RecordStatus>("active");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [skuLoading, setSkuLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [fields, setFields] = useState<ModelFieldDto[]>([]);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await apiRequest<SpuDetailDto>(`/api/spus/${spuId}`));
    } catch (error) {
      setDetail(null);
      setLoadError(translatedApiError(error, locale));
    } finally {
      setLoading(false);
    }
  }, [spuId, locale]);

  const loadSkus = useCallback(async (nextPage: number, status: RecordStatus) => {
    setSkuLoading(true);
    setSkuError(null);
    const params = new URLSearchParams({ status, page: String(nextPage), pageSize: String(pageSize) });
    try {
      const value = await apiRequest<SpuSkuPageDto>(`/api/spus/${spuId}/skus?${params}`);
      setSkuPage(value);
      if (nextPage > value.pageCount && nextPage > 1) setPage(Math.max(1, value.pageCount));
      return value;
    } catch (error) {
      setSkuPage(null);
      setSkuError(translatedApiError(error, locale));
      return null;
    } finally {
      setSkuLoading(false);
    }
  }, [spuId, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDetail(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSkus(page, skuStatus); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSkus, page, skuStatus]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<ModelFieldDto[]>("/api/model-fields?level=spu&includeArchived=true"),
      apiRequest<ModelFieldDto[]>("/api/model-fields?level=sku&includeArchived=true"),
    ]).then(([spuFields, skuFields]) => {
      if (!cancelled) setFields([...spuFields, ...skuFields]);
    }).catch(() => { if (!cancelled) setFields([]); });
    return () => { cancelled = true; };
  }, []);

  const archived = Boolean(detail?.archivedAt);
  const totalPages = skuPage?.pageCount ?? 0;

  const showToast = (message: string, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3000);
  };
  const editSpu = () => {
    if (!detail) return;
    setForm({ level: "spu", record: detail });
    setFormError("");
    setFieldErrors({});
  };
  const createSku = () => {
    if (!detail) return;
    setForm({ level: "sku", parentId: detail.id, parentName: `${detail.spuCode} · ${detail.name}` });
    setFormError("");
    setFieldErrors({});
  };
  const editSku = (sku: SkuDetailDto) => {
    setForm({ level: "sku", record: sku, parentId: sku.spuId, parentName: `${sku.spuCode} · ${sku.spuName}` });
    setFormError("");
    setFieldErrors({});
  };
  const refreshAfterMutation = async () => {
    await loadDetail();
    await loadSkus(page, skuStatus);
  };

  const submitForm = async (payload: Record<string, unknown>) => {
    if (!form) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (form.level === "spu" && form.record) {
        await apiRequest(`/api/spus/${form.record.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast(t("products.spuUpdatedToast"));
      } else if (form.level === "sku" && form.record) {
        await apiRequest(`/api/skus/${form.record.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast(t("products.skuUpdatedToast"));
      } else if (form.level === "sku" && form.parentId) {
        await apiRequest(`/api/spus/${form.parentId}/skus`, { method: "POST", body: JSON.stringify(payload) });
        showToast(t("products.skuCreatedToast"));
      }
      setForm(null);
      await refreshAfterMutation();
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
      if (archiveTarget.type === "spu") {
        const response = await apiRequest<{ archivedSkuCount: number }>(`/api/spus/${archiveTarget.id}`, { method: "DELETE" });
        showToast(interpolate(t("products.archiveCountToast"), { count: response.archivedSkuCount }, locale));
      } else {
        await apiRequest(`/api/skus/${archiveTarget.id}`, { method: "DELETE" });
        showToast(t("products.skuArchivedToast"));
      }
      setArchiveTarget(null);
      await refreshAfterMutation();
    } catch (error) { showToast(translatedApiError(error, locale), true); }
    finally { setBusy(false); }
  };

  const restoreSpu = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const response = await apiRequest<{ restoredSkuCount: number }>(`/api/spus/${detail.id}/restore`, { method: "POST" });
      showToast(interpolate(t("products.spuRestoredToast"), { count: response.restoredSkuCount }, locale));
      await refreshAfterMutation();
    } catch (error) { showToast(translatedApiError(error, locale), true); }
    finally { setBusy(false); }
  };
  const restoreSku = async (sku: SkuDetailDto) => {
    setBusy(true);
    try {
      await apiRequest(`/api/skus/${sku.id}/restore`, { method: "POST" });
      showToast(t("products.skuRestoredToast"));
      await refreshAfterMutation();
    } catch (error) { showToast(translatedApiError(error, locale), true); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="loading-block"><LoaderCircle className="animate-spin" size={16} />{t("products.loadingDetail")}</div>;
  if (!detail || loadError) return <section className="product-detail-page">
    <LocaleLink className="detail-back-link" href="/products">{t("productDetail.backToProducts")}</LocaleLink>
    <div className="empty-state"><div><span className="empty-icon">{loadError?.includes("Neon") ? <Database size={19} /> : <CircleAlert size={19} />}</span><h3>{loadError ?? t("productDetail.notFound")}</h3><p>{t("productDetail.loadFailed")}</p><button className="button button-secondary" onClick={() => void loadDetail()}>{t("productDetail.retry")}</button></div></div>
  </section>;

  return <section className="product-detail-page">
    <LocaleLink className="detail-back-link" href="/products">‹ {t("productDetail.backToProducts")}</LocaleLink>
    <header className="page-heading">
      <div><p className="eyebrow">{t("productDetail.eyebrow")}</p><h1 className="page-title">{detail.name}</h1><p className="page-description code-text">{detail.spuCode}</p></div>
      <div className="page-actions">
        {archived ? <button className="button button-secondary" onClick={() => void restoreSpu()} disabled={busy}><RotateCcw size={14} />{t("productDetail.restoreSpu")}</button> : <>
          <button className="button button-secondary" onClick={editSpu} disabled={busy}><SquarePen size={14} />{t("productDetail.editSpu")}</button>
          <button className="button button-secondary" onClick={createSku} disabled={busy}><PackagePlus size={14} />{t("productDetail.addSku")}</button>
          <button className="button button-danger" onClick={() => setArchiveTarget({ type: "spu", id: detail.id, name: detail.name })} disabled={busy}><Archive size={14} />{t("productDetail.archiveSpu")}</button>
        </>}
      </div>
    </header>

    {archived && <div className="notice warning" style={{ marginBottom: 20 }}><CircleAlert size={16} /><div><strong>{t("productDetail.archivedTitle")}</strong><p>{t("productDetail.archivedDescription")}</p></div></div>}

    <section className="detail-panel">
      <div className="detail-heading"><div><h2>{t("productDetail.mainInfo")}</h2><p>{t("productDetail.lastUpdated")}: {formatLocaleDate(detail.updatedAt, locale, { dateStyle: "medium", timeStyle: "short" })}</p></div></div>
      <div className="detail-grid">
        <DetailCell label={t("productDetail.spuCode")} value={detail.spuCode} locale={locale} empty={t("productDetail.empty")} />
        <DetailCell label={t("productForm.nameProduct")} value={detail.name} locale={locale} empty={t("productDetail.empty")} />
        <DetailCell label={t("productForm.brand")} value={detail.brand} locale={locale} empty={t("productDetail.empty")} />
        {detail.fields.map((field) => <DetailCell key={field.key} label={translatedFieldLabel(field.key, field.label, t)} value={field.value} locale={locale} empty={t("productDetail.empty")} type={field.type} />)}
      </div>
    </section>

    <section className="detail-panel">
      <div className="detail-heading">
        <div><h2>{t("productDetail.skuVariants")}</h2><p>{interpolate(t("productDetail.totalSkus"), { count: skuPage?.total ?? 0 }, locale)}</p></div>
        <div className="toolbar-group">
          <div className="view-switch" role="group" aria-label={t("productDetail.status")}>
            <button type="button" aria-pressed={skuStatus === "active"} onClick={() => { setSkuStatus("active"); setPage(1); }}>{t("productDetail.activeFilter")}</button>
            <button type="button" aria-pressed={skuStatus === "archived"} onClick={() => { setSkuStatus("archived"); setPage(1); }}>{t("productDetail.archivedFilter")}</button>
          </div>
        </div>
      </div>
      {skuLoading ? <div className="loading-block"><LoaderCircle className="animate-spin" size={16} />{t("common.loading")}</div> : skuError ? <div className="notice warning"><CircleAlert size={16} /><p>{skuError}</p><button className="button button-secondary" onClick={() => void loadSkus(page, skuStatus)}>{t("common.retry")}</button></div> : skuPage?.items.length ? <>
        <div className="sku-detail-list">{skuPage.items.map((sku) => <SkuRecordCard key={sku.id} sku={sku} locale={locale} t={t} empty={t("productDetail.empty")} archivedParent={archived} busy={busy} onEdit={() => editSku(sku)} onArchive={() => setArchiveTarget({ type: "sku", id: sku.id, name: sku.name })} onRestore={() => void restoreSku(sku)} />)}</div>
        <div className="table-footer">
          <span className="count-label">{interpolate(t("productDetail.page"), { page: skuPage.page, pages: Math.max(1, skuPage.pageCount) }, locale)} · {interpolate(t("productDetail.pageSize"), { count: skuPage.pageSize }, locale)}</span>
          <div className="pagination">
            <button aria-label={t("productDetail.previousPage")} disabled={page <= 1 || skuLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /></button>
            <span>{formatLocaleNumber(page, locale)} / {formatLocaleNumber(Math.max(1, totalPages), locale)}</span>
            <button aria-label={t("productDetail.nextPage")} disabled={page >= totalPages || skuLoading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={15} /></button>
          </div>
        </div>
      </> : <div className="empty-state" style={{ minHeight: 170 }}><div><span className="empty-icon"><PackagePlus size={18} /></span><h3>{t("productDetail.noSkus")}</h3><p>{t("productDetail.noSkusDescription")}</p>{!archived && <button className="button button-primary" onClick={createSku}><PackagePlus size={14} />{t("productDetail.createSku")}</button>}</div></div>}
    </section>

    {form && <ProductRecordForm key={`${form.level}-${form.record?.id ?? "new"}`} level={form.level} fields={fields.filter((field) => field.level === form.level)} record={form.record} parentName={form.parentName} pending={busy} error={formError} fieldErrors={fieldErrors} onClose={() => setForm(null)} onSubmit={(payload) => void submitForm(payload)} />}
    {archiveTarget && <ArchiveConfirmation
      title={interpolate(t("products.deleteTitle"), { level: archiveTarget.type === "spu" ? "SPU" : "SKU", name: archiveTarget.name }, locale)}
      description={archiveTarget.type === "spu" ? interpolate(t("products.deleteSpuDescription"), { count: detail.activeSkuCount }, locale) : t("products.deleteSkuDescription")}
      pending={busy}
      onCancel={() => setArchiveTarget(null)}
      onConfirm={() => void confirmArchive()}
    />}
    {toast && <div className="toast-region" role="status"><div className={`toast${toast.error ? " error" : ""}`}>{toast.error ? <CircleAlert size={15} /> : <Database size={15} />}{toast.message}</div></div>}
  </section>;
}

function DetailCell({ label, value, locale, empty, type }: { label: string; value: unknown; locale: Locale; empty: string; type?: ModelFieldDto["type"] }) {
  return <div className="detail-cell"><label>{label}</label><p>{formatProductValue(value, locale, empty, type)}</p></div>;
}

function SkuRecordCard({
  sku, locale, t, empty, archivedParent, busy, onEdit, onArchive, onRestore,
}: {
  sku: SkuDetailDto;
  locale: Locale;
  t: (key: TranslationKey) => string;
  empty: string;
  archivedParent: boolean;
  busy: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const archived = Boolean(sku.archivedAt);
  return <article className="sku-detail-card">
    <header><div><h3>{sku.name}</h3><span className="code-text">{sku.skuCode}</span></div><div className="sku-card-actions">
      {archived ? <span className="tag archived">{t("productDetail.archived")}</span> : <span className="tag custom">{t("productDetail.active")}</span>}
      {!archived && <button className="icon-button" title={t("productDetail.editSku")} aria-label={interpolate(t("productDetail.editCode"), { code: sku.skuCode }, locale)} onClick={onEdit} disabled={busy || archivedParent}><SquarePen size={15} /></button>}
      {!archived && <button className="icon-button danger" title={t("productDetail.archiveSku")} aria-label={interpolate(t("productDetail.archiveCode"), { code: sku.skuCode }, locale)} onClick={onArchive} disabled={busy || archivedParent}><Archive size={15} /></button>}
      {archived && !archivedParent && <button className="icon-button" title={t("productDetail.restoreSku")} aria-label={interpolate(t("productDetail.restoreCode"), { code: sku.skuCode }, locale)} onClick={onRestore} disabled={busy}><RotateCcw size={15} /></button>}
    </div></header>
    <div className="sku-detail-grid">
      <DetailCell label={t("productDetail.skuCode")} value={sku.skuCode} locale={locale} empty={empty} />
      <DetailCell label={t("productDetail.skuName")} value={sku.name} locale={locale} empty={empty} />
      <DetailCell label={t("productDetail.createdAt")} value={formatLocaleDate(sku.createdAt, locale, { dateStyle: "medium", timeStyle: "short" })} locale={locale} empty={empty} />
      {sku.fields.map((field) => <DetailCell key={field.key} label={translatedFieldLabel(field.key, field.label, t)} value={field.value} locale={locale} empty={empty} type={field.type} />)}
    </div>
  </article>;
}
