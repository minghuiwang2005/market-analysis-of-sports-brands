"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { ModelFieldDto, ProductLevel, SkuDetailDto, SpuDetailDto } from "@/lib/products/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import { translatedFieldError, translatedFieldLabel } from "@/lib/i18n/display";

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
  const { t } = useLocale();
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
            <h2 id="product-form-title">{record ? t(isSpu ? "productForm.editSpu" : "productForm.editSku") : t(isSpu ? "productForm.createSpu" : "productForm.createSku")}</h2>
            <p>{isSpu ? t("productForm.spuSavedHint") : t("productForm.parentSpu").replace("{name}", parentName ?? t("productForm.noParent"))}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("productForm.close")}><X size={17} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="form-grid">
            <FormInput label={t(isSpu ? "productForm.codeSpu" : "productForm.codeSku")} required error={translatedFieldError(fieldErrors[isSpu ? "spuCode" : "skuCode"] ?? "", t)}>
              <input className="text-input" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={120} placeholder={t(isSpu ? "productForm.exampleSpuCode" : "productForm.exampleSkuCode")} />
            </FormInput>
            <FormInput label={t(isSpu ? "productForm.nameProduct" : "productForm.nameSku")} required error={translatedFieldError(fieldErrors.name ?? "", t)}>
              <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={240} placeholder={t(isSpu ? "productForm.exampleProductName" : "productForm.exampleSkuName")} />
            </FormInput>
            {isSpu && <FormInput label={t("productForm.brand")} required error={translatedFieldError(fieldErrors.brand ?? "", t)}>
              <input className="text-input" value={brand} onChange={(event) => setBrand(event.target.value)} required maxLength={120} placeholder={t("productForm.exampleBrand")} />
            </FormInput>}
            {editableFields.map((field) => (
              <FormInput key={field.id} label={translatedFieldLabel(field.key, field.label, t)} required={field.required} error={translatedFieldError(fieldErrors[field.key] ?? "", t)} wide={field.type === "long_text" || field.type === "multiselect"}>
                <FieldInput
                  field={field}
                  value={values[field.key]}
                  required={field.required}
                  t={t}
                  onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                />
              </FormInput>
            ))}
          </div>
          <p className="form-help-line">{t("productForm.uniqueValuesHelp")}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>{t("productForm.cancel")}</button>
          <button type="submit" className="button button-primary" disabled={pending}>
            {pending && <LoaderCircle size={14} className="animate-spin" />}{pending ? t("productForm.saving") : record ? t("productForm.saveChanges") : t("productForm.create").replace("{level}", isSpu ? "SPU" : "SKU")}
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
  t,
}: {
  field: ModelFieldDto;
  value: unknown;
  required?: boolean;
  onChange: (value: unknown) => void;
  t: (key: import("@/lib/i18n/types").TranslationKey) => string;
}) {
  if (field.type === "long_text") {
    return <textarea className="text-area" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} maxLength={10000} required={required} />;
  }
  if (field.type === "boolean") {
    return <select className="select-input" value={typeof value === "boolean" ? String(value) : ""} onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")} required={required}>
      <option value="">{t("productForm.choose")}</option><option value="true">{t("productForm.yes")}</option><option value="false">{t("productForm.no")}</option>
    </select>;
  }
  if (field.type === "select") {
    return <select className="select-input" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value || null)} required={required}>
      <option value="">{t("productForm.choose")}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}
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
