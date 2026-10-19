"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { ModelFieldDto, ProductLevel, SkuDetailDto, SpuDetailDto } from "@/lib/products/types";

type ProductRecordFormProps = {
  level: ProductLevel;
  fields: ModelFieldDto[];
  record?: SpuDetailDto | SkuDetailDto;
  parentName?: string;
  pending: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

export function ProductRecordForm({
  level,
  fields,
  record,
  parentName,
  pending,
  error,
  fieldErrors,
  onClose,
  onSubmit,
}: ProductRecordFormProps) {
  const isSpu = level === "spu";
  const spuRecord = isSpu ? record as SpuDetailDto | undefined : undefined;
  const skuRecord = !isSpu ? record as SkuDetailDto | undefined : undefined;
  const [code, setCode] = useState(spuRecord?.spuCode ?? skuRecord?.skuCode ?? "");
  const [name, setName] = useState(spuRecord?.name ?? skuRecord?.name ?? "");
  const [brand, setBrand] = useState(spuRecord?.brand ?? "");
  const [values, setValues] = useState<Record<string, unknown>>(record?.values ?? {});
  const editableFields = fields.filter((field) => !field.isSystem && !field.archivedAt);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editableKeys = new Set(editableFields.map((field) => field.key));
    const activeValues = Object.fromEntries(
      Object.entries(values).filter(([key]) => editableKeys.has(key)),
    );
    const payload = isSpu
      ? { spuCode: code, name, brand, values: activeValues }
      : { skuCode: code, name, values: activeValues };
    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="product-form-title" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <h2 id="product-form-title">{record ? `编辑 ${isSpu ? "SPU" : "SKU"}` : `新增 ${isSpu ? "SPU" : "SKU"}`}</h2>
            <p>{isSpu ? "保存后会在商品列表中以 SPU 主体展示。" : `所属 SPU：${parentName ?? "未选择"}`}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={17} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="form-grid">
            <FormInput label={`${isSpu ? "SPU" : "SKU"} 编码`} required error={fieldErrors[isSpu ? "spuCode" : "skuCode"]}>
              <input className="text-input" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={120} placeholder={isSpu ? "例如：NK-RUN-001" : "例如：NK-RUN-001-BLK-42"} />
            </FormInput>
            <FormInput label={isSpu ? "商品名称" : "SKU 名称"} required error={fieldErrors.name}>
              <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={240} placeholder={isSpu ? "例如：Pegasus 运动鞋" : "例如：黑色 / US 9"} />
            </FormInput>
            {isSpu && <FormInput label="品牌" required error={fieldErrors.brand}>
              <input className="text-input" value={brand} onChange={(event) => setBrand(event.target.value)} required maxLength={120} placeholder="例如：Nike" />
            </FormInput>}
            {editableFields.map((field) => (
              <FormInput key={field.id} label={field.label} required={field.required} error={fieldErrors[field.key]} wide={field.type === "long_text" || field.type === "multiselect"}>
                <FieldInput
                  field={field}
                  value={values[field.key]}
                  required={field.required}
                  onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                />
              </FormInput>
            ))}
          </div>
          <p className="form-help-line">编码与字段值会在 Neon 中校验唯一性。价格与可售状态作为带来源和时间的观察记录保存。</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>取消</button>
          <button type="submit" className="button button-primary" disabled={pending}>
            {pending && <LoaderCircle size={14} className="animate-spin" />}{pending ? "保存中" : record ? "保存修改" : `创建 ${isSpu ? "SPU" : "SKU"}`}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormInput({
  label,
  required = false,
  error,
  wide = false,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`form-field${wide ? " wide" : ""}`}>
      <label>{label}{required && <span className="required-mark"> *</span>}{children}</label>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

function FieldInput({
  field,
  value,
  required = false,
  onChange,
}: {
  field: ModelFieldDto;
  value: unknown;
  required?: boolean;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "long_text") {
    return <textarea className="text-area" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} maxLength={10000} required={required} />;
  }
  if (field.type === "boolean") {
    return <select className="select-input" value={typeof value === "boolean" ? String(value) : ""} onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")} required={required}>
      <option value="">请选择</option><option value="true">是</option><option value="false">否</option>
    </select>;
  }
  if (field.type === "select") {
    return <select className="select-input" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value || null)} required={required}>
      <option value="">请选择</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>;
  }
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <select className="select-input" multiple value={selected} onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))} style={{ minHeight: 88, padding: 8 }} required={required}>
      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>;
  }
  const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text";
  return <input
    className="text-input"
    type={inputType}
    value={typeof value === "string" || typeof value === "number" ? value : ""}
    onChange={(event) => onChange(field.type === "number" ? (event.target.value === "" ? null : Number(event.target.value)) : event.target.value)}
    maxLength={field.type === "short_text" ? 1000 : undefined}
    required={required}
    placeholder={field.type === "url" ? "https://" : undefined}
  />;
}
