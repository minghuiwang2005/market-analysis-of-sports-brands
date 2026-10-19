"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  Eye,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  SquarePen,
} from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { ArchiveConfirmation } from "@/components/archive-confirmation";
import { ProductDetail } from "@/components/product-detail";
import { ProductRecordForm } from "@/components/product-form";
import type {
  ModelFieldDto,
  ProductLevel,
  SpuDetailDto,
  SpuListItemDto,
  SkuDetailDto,
} from "@/lib/products/types";

type RecordStatus = "active" | "archived";
type ProductListResponse = { items: SpuListItemDto[]; total: number; page: number; pageSize: number; pageCount: number };
type ProductFormState = { level: ProductLevel; record?: SpuDetailDto | SkuDetailDto; parentId?: string; parentName?: string };
type ArchiveTarget =
  | { type: "spu"; id: string; name: string; skuCount: number }
  | { type: "sku"; id: string; name: string; parentId: string };

const pageSize = 20;
const primaryKeys = new Set(["category", "sport", "series"]);

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) return value.join("、") || "—";
  return String(value);
}

function err(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试。";
}

export function ProductsPage() {
  const [status, setStatus] = useState<RecordStatus>("active");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [sport, setSport] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | null>(null);
  const [spuFields, setSpuFields] = useState<ModelFieldDto[]>([]);
  const [skuFields, setSkuFields] = useState<ModelFieldDto[]>([]);
  const [fieldsError, setFieldsError] = useState<ApiClientError | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SpuDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
    if (category.trim()) params.set("category", category.trim());
    try {
      setResult(await apiRequest<ProductListResponse>(`/api/spus?${params.toString()}`));
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", err(error)));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [status, page, query, brand, sport, category]);

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
      setFieldsError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", err(error)));
    });
    return () => { cancelled = true; };
  }, []);

  const customColumns = useMemo(
    () => spuFields.filter((field) => !field.isSystem && field.showInList && !primaryKeys.has(field.key)),
    [spuFields],
  );
  const currentPageCount = result?.pageCount ?? 0;

  const showToast = (message: string, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3000);
  };

  const refreshDetail = async (id: string, expectedStatus: RecordStatus = status) => {
    setDetailLoading(true);
    try {
      const value = await apiRequest<SpuDetailDto>(`/api/spus/${id}?status=${expectedStatus}`);
      setDetail(value);
      return value;
    } catch (error) {
      setDetail(null);
      showToast(err(error), true);
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    await refreshDetail(id);
  };

  const openEditSpu = async (id: string) => {
    const record = await refreshDetail(id, "active");
    if (record) {
      setForm({ level: "spu", record });
      setFormError("");
      setFieldErrors({});
    }
  };

  const openEditSku = (sku: SkuDetailDto) => {
    setForm({ level: "sku", record: sku, parentId: sku.spuId, parentName: `${sku.spuCode} · ${sku.spuName}` });
    setFormError("");
    setFieldErrors({});
  };

  const openCreateSpu = () => {
    setForm({ level: "spu" });
    setFormError("");
    setFieldErrors({});
  };

  const openCreateSku = (parent: SpuDetailDto) => {
    setForm({ level: "sku", parentId: parent.id, parentName: `${parent.spuCode} · ${parent.name}` });
    setFormError("");
    setFieldErrors({});
  };

  const submitForm = async (payload: Record<string, unknown>) => {
    if (!form) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (form.level === "spu") {
        if (form.record) {
          await apiRequest(`/api/spus/${form.record.id}`, { method: "PATCH", body: JSON.stringify(payload) });
          showToast("SPU 已更新");
        } else {
          await apiRequest("/api/spus", { method: "POST", body: JSON.stringify(payload) });
          showToast("SPU 已创建");
        }
      } else if (form.record) {
        await apiRequest(`/api/skus/${form.record.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("SKU 已更新");
      } else if (form.parentId) {
        await apiRequest(`/api/spus/${form.parentId}/skus`, { method: "POST", body: JSON.stringify(payload) });
        showToast("SKU 已创建");
      }
      setForm(null);
      await loadList();
      if (expandedId) await refreshDetail(expandedId);
    } catch (error) {
      setFormError(err(error));
      if (error instanceof ApiClientError && error.fields) setFieldErrors(error.fields);
    } finally {
      setBusy(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      if (archiveTarget.type === "spu") {
        const response = await apiRequest<{ id: string; archivedSkuCount: number }>(`/api/spus/${archiveTarget.id}`, { method: "DELETE" });
        showToast(`SPU 已归档，连同 ${response.archivedSkuCount} 个启用 SKU 一起归档`);
        setExpandedId(null);
        setDetail(null);
      } else {
        await apiRequest(`/api/skus/${archiveTarget.id}`, { method: "DELETE" });
        showToast("SKU 已归档，观察记录已保留");
      }
      setArchiveTarget(null);
      await loadList();
      if (archiveTarget.type === "sku") await refreshDetail(archiveTarget.parentId);
    } catch (error) {
      showToast(err(error), true);
    } finally {
      setBusy(false);
    }
  };

  const restoreSpu = async (id: string) => {
    setBusy(true);
    try {
      const response = await apiRequest<{ restoredSkuCount: number }>(`/api/spus/${id}/restore`, { method: "POST" });
      showToast(`SPU 已恢复，同时恢复 ${response.restoredSkuCount} 个关联 SKU`);
      await loadList();
      if (expandedId === id) await refreshDetail(id, "active");
    } catch (error) { showToast(err(error), true); }
    finally { setBusy(false); }
  };

  const restoreSku = async (sku: SkuDetailDto) => {
    setBusy(true);
    try {
      await apiRequest(`/api/skus/${sku.id}/restore`, { method: "POST" });
      showToast("SKU 已恢复");
      await loadList();
      await refreshDetail(sku.spuId, status);
    } catch (error) { showToast(err(error), true); }
    finally { setBusy(false); }
  };

  const changeStatus = (next: RecordStatus) => {
    setStatus(next);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const missingDatabase = loadError?.code === "DATABASE_NOT_CONFIGURED" || fieldsError?.code === "DATABASE_NOT_CONFIGURED";
  const unavailable = loadError || fieldsError;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRODUCT CATALOG</p>
          <h1 className="page-title">商品数据</h1>
          <p className="page-description">以 SPU 为主体管理商品资料，在每个档案中维护颜色、尺码等 SKU 变体。</p>
        </div>
        <div className="page-actions">
          {status === "active" && <button className="button button-primary" onClick={openCreateSpu} disabled={Boolean(unavailable) || busy}>
            <Plus size={15} /> 新建 SPU
          </button>}
        </div>
      </div>

      {unavailable && <DatabaseNotice error={loadError ?? fieldsError!} missingDatabase={Boolean(missingDatabase)} />}

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search-wrap"><Search size={15} aria-hidden="true" /><input className="search-input" value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="搜索商品名称、编码或字段" aria-label="搜索商品名称、编码或字段" /></label>
          <input className="select-input filter-input" value={brand} onChange={(event) => changeFilter(setBrand, event.target.value)} placeholder="品牌" aria-label="按品牌筛选" />
          <input className="select-input filter-input" value={sport} onChange={(event) => changeFilter(setSport, event.target.value)} placeholder="运动项目" aria-label="按运动项目筛选" />
          <input className="select-input filter-input" value={category} onChange={(event) => changeFilter(setCategory, event.target.value)} placeholder="品类" aria-label="按品类筛选" />
        </div>
        <div className="toolbar-group">
          <div className="view-switch" role="group" aria-label="商品记录状态">
            <button type="button" aria-pressed={status === "active"} onClick={() => changeStatus("active")}>当前商品</button>
            <button type="button" aria-pressed={status === "archived"} onClick={() => changeStatus("archived")}>已归档</button>
          </div>
          <span className="count-label">{result?.total ?? 0} 条</span>
        </div>
      </div>

      <div className="data-card">
        {loading ? (
          <div className="loading-block"><span className="spinner" />正在从 Neon 读取商品</div>
        ) : result?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="data-table product-table">
                <thead><tr>
                  <th aria-label="展开详情"></th><th>SPU / 商品</th><th>品牌</th><th>品类</th><th>运动</th><th>系列</th>
                  {customColumns.map((field) => <th key={field.id}>{field.label}</th>)}
                  <th>SKU 数</th><th>最近录入 SKU · 最多 5 个</th><th>最近更新</th><th><span className="sr-only">操作</span></th>
                </tr></thead>
                <tbody>
                  {result.items.map((item) => (
                    <ProductRow
                      key={item.id}
                      item={item}
                      status={status}
                      fields={customColumns}
                      expanded={expandedId === item.id}
                      detail={expandedId === item.id ? detail : null}
                      detailLoading={expandedId === item.id && detailLoading}
                      busy={busy}
                      onToggle={() => void toggleDetail(item.id)}
                      onEdit={() => void openEditSpu(item.id)}
                      onArchive={() => setArchiveTarget({ type: "spu", id: item.id, name: item.name, skuCount: item.skuCount })}
                      onRestore={() => void restoreSpu(item.id)}
                      onAddSku={() => detail && detail.id === item.id ? openCreateSku(detail) : void refreshDetail(item.id).then((value) => { if (value) openCreateSku(value); })}
                      onEditSku={openEditSku}
                      onArchiveSku={(sku) => setArchiveTarget({ type: "sku", id: sku.id, name: sku.name, parentId: item.id })}
                      onRestoreSku={(sku) => void restoreSku(sku)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="count-label">第 {result.page} / {Math.max(1, result.pageCount)} 页 · 每页 {result.pageSize} 条</span>
              <div className="pagination">
                <button aria-label="上一页" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /></button>
                <span>{page} / {Math.max(1, currentPageCount)}</span>
                <button aria-label="下一页" disabled={page >= currentPageCount || loading} onClick={() => setPage((value) => Math.min(currentPageCount, value + 1))}><ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div>
              <span className="empty-icon">{missingDatabase ? <Database size={19} /> : <PackageOpen size={19} />}</span>
              <h3>{loadError ? (missingDatabase ? "先连接 Neon 数据库" : "暂时无法读取商品") : (status === "archived" ? "没有已归档商品" : "Neon 当前没有商品记录")}</h3>
              <p>{loadError ? (missingDatabase ? "复制 .env.example 为 .env.local，填写连接串并运行 pnpm db:migrate。" : loadError.message) : (status === "archived" ? "归档的 SPU 会显示在这里，并可随时恢复。" : "创建第一条 SPU 后，可以在商品详情中录入它的 SKU 变体。商品数据只从 Neon 读取。")}</p>
              {!loadError && status === "active" && <button className="button button-primary" onClick={openCreateSpu} disabled={Boolean(unavailable) || busy}><Plus size={14} />新建 SPU</button>}
            </div>
          </div>
        )}
      </div>

      {form && <ProductRecordForm
        key={`${form.level}-${form.record?.id ?? "new"}`}
        level={form.level}
        fields={form.level === "spu" ? spuFields : skuFields}
        record={form.record}
        parentName={form.parentName}
        pending={busy}
        error={formError}
        fieldErrors={fieldErrors}
        onClose={() => setForm(null)}
        onSubmit={(payload) => void submitForm(payload)}
      />}

      {archiveTarget && <ArchiveConfirmation
        title={`归档${archiveTarget.type === "spu" ? " SPU" : " SKU"}「${archiveTarget.name}」`}
        description={archiveTarget.type === "spu"
          ? `该 SPU 下当前有 ${archiveTarget.skuCount} 个启用 SKU。归档会同时隐藏 SPU 与这些 SKU，价格、来源和其他观察记录都会保留。`
          : "该 SKU 会从默认列表和 SKU 摘要中移除，其字段值、来源和价格/可售观察仍会保留。"}
        pending={busy}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
      />}

      {toast && <div className="toast-region" role="status"><div className={`toast${toast.error ? " error" : ""}`}>{toast.error ? <CircleAlert size={15} /> : <Database size={15} />}{toast.message}</div></div>}
    </section>
  );
}

function ProductRow({
  item,
  status,
  fields,
  expanded,
  detail,
  detailLoading,
  busy,
  onToggle,
  onEdit,
  onArchive,
  onRestore,
  onAddSku,
  onEditSku,
  onArchiveSku,
  onRestoreSku,
}: {
  item: SpuListItemDto;
  status: RecordStatus;
  fields: ModelFieldDto[];
  expanded: boolean;
  detail: SpuDetailDto | null;
  detailLoading: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onAddSku: () => void;
  onEditSku: (sku: SkuDetailDto) => void;
  onArchiveSku: (sku: SkuDetailDto) => void;
  onRestoreSku: (sku: SkuDetailDto) => void;
}) {
  const columnCount = 10 + fields.length;
  return (
    <>
      <tr className={expanded ? "row-expanded" : ""}>
        <td><button className="icon-button" aria-label={`${expanded ? "收起" : "展开"} ${item.name} 详情`} aria-expanded={expanded} onClick={onToggle}><ChevronDown size={15} style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform .15s ease" }} /></button></td>
        <td><div className="product-name">{item.name}</div><div className="code-text" style={{ marginTop: 3 }}>{item.spuCode}</div>{item.archivedAt && <span className="tag archived" style={{ marginTop: 5 }}>已归档</span>}</td>
        <td>{item.brand || "—"}</td>
        <td>{valueText(item.values.category)}</td>
        <td>{valueText(item.values.sport)}</td>
        <td>{valueText(item.values.series)}</td>
        {fields.map((field) => <td key={field.id}>{valueText(item.values[field.key])}</td>)}
        <td><span className="sku-count">{item.skuCount}</span></td>
        <td><div className="sku-name-list">{item.latestSkus.length ? item.latestSkus.map((sku) => <span className="sku-name" key={sku.id} title={`${sku.skuCode} · ${sku.name}`}>{sku.name}</span>) : <span className="count-label">暂无 SKU</span>}{item.skuCount > item.latestSkus.length && <span className="sku-more">+{item.skuCount - item.latestSkus.length} 个</span>}</div></td>
        <td><span className="product-subline">{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</span></td>
        <td><div className="table-actions">
          <button className="icon-button" title="查看详情" aria-label={`查看 ${item.name} 详情`} aria-expanded={expanded} onClick={onToggle}><Eye size={15} /></button>
          {status === "active" ? <>
            <button className="icon-button" title="编辑 SPU" aria-label={`编辑 ${item.name}`} disabled={busy} onClick={onEdit}><SquarePen size={15} /></button>
            <button className="icon-button" title="归档 SPU" aria-label={`归档 ${item.name}`} disabled={busy} onClick={onArchive}><Archive size={15} /></button>
          </> : <button className="icon-button" title="恢复 SPU" aria-label={`恢复 ${item.name}`} disabled={busy} onClick={onRestore}><RotateCcw size={15} /></button>}
        </div></td>
      </tr>
      {expanded && <tr><td colSpan={columnCount} style={{ padding: 0 }}>{detailLoading ? <div className="loading-block"><span className="spinner" />正在读取商品档案</div> : detail ? (
        <ProductDetail
          detail={detail}
          onEditSpu={onEdit}
          onAddSku={onAddSku}
          onEditSku={onEditSku}
          onArchiveSpu={onArchive}
          onArchiveSku={onArchiveSku}
          onRestoreSpu={onRestore}
          onRestoreSku={onRestoreSku}
          busy={busy}
        />
      ) : <div className="empty-state" style={{ minHeight: 120 }}><div><span className="empty-icon"><ArrowDownUp size={17} /></span><h3>无法读取商品档案</h3><p>请关闭后重新打开此商品。</p></div></div>}</td></tr>}
    </>
  );
}

function DatabaseNotice({ error, missingDatabase }: { error: ApiClientError; missingDatabase: boolean }) {
  return <div className={`notice ${missingDatabase ? "warning" : ""}`} role="status" style={{ marginBottom: 20 }}>
    {missingDatabase ? <Database size={17} /> : <CircleAlert size={17} />}
    <div><strong>{missingDatabase ? "商品数据需要 Neon 数据库" : "商品数据服务暂时不可用"}</strong><p>{missingDatabase ? "本地开发请填写 .env.local 中的 DATABASE_URL 和 DATABASE_URL_UNPOOLED，并运行 pnpm db:migrate。" : error.message}</p></div>
  </div>;
}
