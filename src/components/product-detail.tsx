"use client";

import { Archive, CircleAlert, Eye, PackagePlus, RotateCcw, SquarePen } from "lucide-react";
import { useState } from "react";
import type { SpuDetailDto, SkuDetailDto } from "@/lib/products/types";

type ProductDetailProps = {
  detail: SpuDetailDto;
  onEditSpu: () => void;
  onAddSku: () => void;
  onEditSku: (sku: SkuDetailDto) => void;
  onArchiveSpu: () => void;
  onArchiveSku: (sku: SkuDetailDto) => void;
  onRestoreSpu: () => void;
  onRestoreSku: (sku: SkuDetailDto) => void;
  busy: boolean;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "未填写";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) return value.join("、") || "未填写";
  return String(value);
}

export function ProductDetail({
  detail,
  onEditSpu,
  onAddSku,
  onEditSku,
  onArchiveSpu,
  onArchiveSku,
  onRestoreSpu,
  onRestoreSku,
  busy,
}: ProductDetailProps) {
  const archived = Boolean(detail.archivedAt);
  const coreFields = [
    { label: "SPU 编码", value: detail.spuCode },
    { label: "商品名称", value: detail.name },
    { label: "品牌", value: detail.brand },
  ];

  return (
    <div className="detail-panel">
      <div className="detail-heading">
        <div><h3>商品档案</h3><p>完整字段、SKU 变体与记录状态</p></div>
        <div className="toolbar-group">
          {archived ? (
            <button className="button button-secondary" onClick={onRestoreSpu} disabled={busy}><RotateCcw size={14} />恢复 SPU 与级联 SKU</button>
          ) : (
            <>
              <button className="button button-secondary" onClick={onEditSpu} disabled={busy}><SquarePen size={14} />编辑 SPU</button>
              <button className="button button-secondary" onClick={onAddSku} disabled={busy}><PackagePlus size={14} />添加 SKU</button>
              <button className="icon-button danger" onClick={onArchiveSpu} title="归档 SPU" aria-label={`归档 ${detail.name}`} disabled={busy}><Archive size={15} /></button>
            </>
          )}
        </div>
      </div>

      {archived && <div className="notice warning" style={{ marginTop: 15 }}><CircleAlert size={16} /><div><strong>SPU 已归档</strong><p>默认列表会隐藏此记录。恢复操作会同时恢复由本次 SPU 归档操作归档的 SKU，之前单独归档的 SKU 保持归档。</p></div></div>}

      <div className="detail-section-title"><span>SPU 主要信息</span><span className="count-label">最近更新 {new Date(detail.updatedAt).toLocaleString("zh-CN")}</span></div>
      <div className="detail-grid">
        {coreFields.map((field) => <DetailCell key={field.label} label={field.label} value={field.value} />)}
        {detail.fields.map((field) => <DetailCell key={field.key} label={field.label} value={field.value} />)}
      </div>

      <div className="detail-section-title"><span>SKU 变体</span><span className="count-label">{detail.skus.length} 条记录{detail.skus.length === 500 ? " · 已达到单次展示上限" : ""}</span></div>
      {detail.skus.length ? (
        <div className="table-scroll" style={{ border: "1px solid var(--line)", borderRadius: 7, background: "#fff" }}>
          <table className="data-table">
            <thead><tr><th>SKU 编码</th><th>SKU 名称</th><th>主要变体属性</th><th>录入时间</th><th>状态</th><th><span className="sr-only">SKU 操作</span></th></tr></thead>
            <tbody>
              {detail.skus.map((sku) => (
                <SkuRow
                  key={sku.id}
                  sku={sku}
                  parentArchived={archived}
                  onEdit={() => onEditSku(sku)}
                  onArchive={() => onArchiveSku(sku)}
                  onRestore={() => onRestoreSku(sku)}
                  busy={busy}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ minHeight: 120, padding: 18 }}><div><span className="empty-icon"><PackagePlus size={18} /></span><h3>还没有 SKU</h3><p>为这个商品添加颜色、尺码等销售变体。</p></div></div>
      )}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: unknown }) {
  return <div className="detail-cell"><label>{label}</label><p>{displayValue(value)}</p></div>;
}

function SkuRow({
  sku,
  parentArchived,
  onEdit,
  onArchive,
  onRestore,
  busy,
}: {
  sku: SkuDetailDto;
  parentArchived: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const archived = Boolean(sku.archivedAt);
  const primaryFields = sku.fields.filter((field) => field.value !== null && field.value !== "").slice(0, 4);
  return (
    <>
      <tr>
        <td><span className="code-text">{sku.skuCode}</span></td>
        <td><span className="product-name">{sku.name}</span></td>
        <td><div className="toolbar-group">{primaryFields.length ? primaryFields.map((field) => <span className="tag" key={field.key}>{field.label}：{displayValue(field.value)}</span>) : <span className="count-label">暂无变体属性</span>}</div></td>
        <td><span className="product-subline">{new Date(sku.createdAt).toLocaleDateString("zh-CN")}</span></td>
        <td>{archived ? <span className="tag archived">已归档</span> : <span className="tag custom">启用中</span>}</td>
        <td><div className="table-actions">
          <button className="icon-button" title="查看 SKU 字段" aria-label={`查看 ${sku.skuCode} 的完整字段`} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><Eye size={15} /></button>
          {!archived && <button className="icon-button" title="编辑 SKU" aria-label={`编辑 ${sku.skuCode}`} disabled={busy || parentArchived} onClick={onEdit}><SquarePen size={15} /></button>}
          {!archived && <button className="icon-button danger" title="归档 SKU" aria-label={`归档 ${sku.skuCode}`} disabled={busy || parentArchived} onClick={onArchive}><Archive size={15} /></button>}
          {archived && !parentArchived && <button className="icon-button" title="恢复 SKU" aria-label={`恢复 ${sku.skuCode}`} disabled={busy} onClick={onRestore}><RotateCcw size={15} /></button>}
        </div></td>
      </tr>
      {expanded && <tr><td colSpan={6}><div className="detail-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", padding: "5px 0" }}>
        <DetailCell label="SKU 编码" value={sku.skuCode} />
        <DetailCell label="SKU 名称" value={sku.name} />
        {sku.fields.map((field) => <DetailCell key={field.key} label={field.label} value={field.value} />)}
      </div></td></tr>}
    </>
  );
}
