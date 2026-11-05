"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  Check,
  CircleAlert,
  Database,
  FileSliders,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  SquarePen,
  X,
} from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import type { ModelFieldDto, ProductFieldType, ProductLevel } from "@/lib/products/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatLocaleNumber, translatedApiError, translatedFieldError, translatedFieldLabel } from "@/lib/i18n/display";

const blankForm = {
  key: "",
  label: "",
  type: "short_text" as ProductFieldType,
  required: false,
  isUnique: false,
  optionsText: "",
  searchable: false,
  showInList: false,
};

function errorMessage(error: unknown, locale: "zh" | "en") {
  return translatedApiError(error, locale);
}

export function ModelFieldsPage() {
  const { locale, t } = useLocale();
  const fieldTypeLabels: Record<ProductFieldType, TranslationKey> = {
    short_text: "modelFields.typeShortText",
    long_text: "modelFields.typeLongText",
    number: "modelFields.typeNumber",
    boolean: "modelFields.typeBoolean",
    date: "modelFields.typeDate",
    url: "modelFields.typeUrl",
    select: "modelFields.typeSelect",
    multiselect: "modelFields.typeMultiselect",
  };
  const [level, setLevel] = useState<ProductLevel>("spu");
  const [showArchived, setShowArchived] = useState(false);
  const [fields, setFields] = useState<ModelFieldDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | null>(null);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ModelFieldDto | null>(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiRequest<ModelFieldDto[]>(
        `/api/model-fields?level=${level}&includeArchived=${showArchived}`,
      );
      setFields(result);
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", errorMessage(error, locale)));
    } finally {
      setLoading(false);
    }
  }, [level, showArchived, locale]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<ModelFieldDto[]>(`/api/model-fields?level=${level}&includeArchived=${showArchived}`)
      .then((result) => { if (!cancelled) { setFields(result); setLoadError(null); } })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", errorMessage(error, locale)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [level, showArchived, locale]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setFormError("");
    setFieldErrors({});
    setEditorOpen(true);
  };

  const openEdit = (field: ModelFieldDto) => {
    setEditing(field);
    setForm({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      isUnique: field.isUnique,
      optionsText: field.options.join("\n"),
      searchable: field.searchable,
      showInList: field.showInList,
    });
    setFormError("");
    setFieldErrors({});
    setEditorOpen(true);
  };

  const saveField = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    const payload = {
      level,
      key: form.key.trim(),
      label: form.label.trim(),
      type: form.type,
      required: form.required,
      isUnique: form.isUnique,
      options: form.optionsText.split("\n").map((option) => option.trim()).filter(Boolean),
      searchable: form.searchable,
      showInList: form.showInList,
      sortOrder: editing?.sortOrder ?? fields.length + 1,
    };

    try {
      await apiRequest<ModelFieldDto>(editing ? `/api/model-fields/${editing.id}` : "/api/model-fields", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(editing ? { ...payload, level: undefined, key: undefined } : payload),
      });
      setEditorOpen(false);
      setToast(t(editing ? "modelFields.saveUpdated" : "modelFields.saveCreated"));
      window.setTimeout(() => setToast(""), 2600);
      await load();
    } catch (error) {
      setFormError(errorMessage(error, locale));
      if (error instanceof ApiClientError && error.fields) {
        setFieldErrors(Object.fromEntries(Object.entries(error.fields).map(([key, message]) => [key, translatedFieldError(message, t)])));
      }
    } finally {
      setSaving(false);
    }
  };

  const archiveField = async (field: ModelFieldDto) => {
    if (!window.confirm(t("modelFields.archiveConfirm").replace("{label}", field.label))) return;
    try {
      await apiRequest(`/api/model-fields/${field.id}`, { method: "DELETE" });
      setToast(t("modelFields.archivedToast"));
      window.setTimeout(() => setToast(""), 3000);
      await load();
    } catch (error) {
      setToast(errorMessage(error, locale));
      window.setTimeout(() => setToast(""), 3000);
    }
  };

  const visibleFields = fields.filter((field) => {
    const text = `${field.label} ${field.key}`.toLocaleLowerCase();
    return text.includes(query.trim().toLocaleLowerCase());
  });

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("modelFields.eyebrow")}</p>
          <h1 className="page-title">{t("modelFields.title")}</h1>
          <p className="page-description">{t("modelFields.description")}</p>
        </div>
        <div className="page-actions">
          <button className="button button-primary" onClick={openCreate} disabled={Boolean(loadError)}>
            <Plus size={15} /> {t("modelFields.addField")}
          </button>
        </div>
      </div>

      {loadError && <DatabaseNotice error={loadError} locale={locale} t={t} />}

      <div className="model-tabs" role="tablist" aria-label={t("modelFields.level")}>
        <button type="button" role="tab" aria-selected={level === "spu"} onClick={() => { setLoading(true); setLevel("spu"); }}>SPU {t("modelFields.spuFields")}</button>
        <button type="button" role="tab" aria-selected={level === "sku"} onClick={() => { setLoading(true); setLevel("sku"); }}>SKU {t("modelFields.skuFields")}</button>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search-wrap">
            <Search size={15} aria-hidden="true" />
            <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("modelFields.search")} aria-label={t("modelFields.search")} />
          </label>
        </div>
        <div className="toolbar-group">
          <span className="count-label">{formatLocaleNumber(visibleFields.length, locale)} {t("modelFields.fieldCount")}</span>
          <button className="button button-secondary" onClick={() => { setLoading(true); setShowArchived((value) => !value); }} aria-pressed={showArchived}>
            <Archive size={14} /> {showArchived ? t("modelFields.hideArchived") : t("modelFields.showArchived")}
          </button>
        </div>
      </div>

      <div className="data-card">
        {loading ? <div className="loading-block"><span className="spinner" />{t("modelFields.reading")}</div> : loadError ? (
          <div className="loading-block"><CircleAlert size={15} />{t("modelFields.unavailable")}</div>
        ) : visibleFields.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>{t("modelFields.colName")}</th><th>{t("modelFields.colType")}</th><th>{t("modelFields.colRules")}</th><th>{t("modelFields.colOptions")}</th><th>{t("modelFields.colVisibility")}</th><th>{t("modelFields.colSource")}</th><th><span className="sr-only">{t("modelFields.edit")}</span></th>
              </tr></thead>
              <tbody>
                {visibleFields.map((field) => (
                  <tr key={field.id}>
                    <td><span className="field-label">{translatedFieldLabel(field.key, field.label, t)}{field.required && <span className="required-mark">*</span>}</span><div className="field-code">{field.key}</div></td>
                    <td><span className="tag">{t(fieldTypeLabels[field.type])}</span></td>
                    <td><div className="toolbar-group">{field.required && <span className="tag">{t("modelFields.required")}</span>}{field.isUnique && <span className="tag">{t("modelFields.unique")}</span>}{!field.required && !field.isUnique && <span className="count-label">—</span>}</div></td>
                    <td><span className="product-subline">{field.options.length ? field.options.slice(0, 3).join(locale === "en" ? ", " : "、") + (field.options.length > 3 ? ` +${formatLocaleNumber(field.options.length - 3, locale)}` : "") : "—"}</span></td>
                    <td><div className="toolbar-group">{field.showInList && <span className="tag">{t("modelFields.inList")}</span>}{field.searchable && <span className="tag">{t("modelFields.searchable")}</span>}{!field.showInList && !field.searchable && <span className="count-label">—</span>}</div></td>
                    <td><span className={`tag ${field.isSystem ? "system" : "custom"}`}>{field.isSystem ? t("modelFields.system") : t("modelFields.custom")}</span>{field.archivedAt && <span className="tag archived" style={{ marginLeft: 5 }}>{t("modelFields.archived")}</span>}</td>
                    <td><div className="table-actions">
                      <button className="icon-button" title={t("modelFields.edit")} aria-label={`${t("modelFields.edit")} ${translatedFieldLabel(field.key, field.label, t)}`} disabled={Boolean(field.archivedAt)} onClick={() => openEdit(field)}><SquarePen size={15} /></button>
                      {!field.isSystem && !field.archivedAt && <button className="icon-button danger" title={t("modelFields.archive")} aria-label={`${t("modelFields.archive")} ${translatedFieldLabel(field.key, field.label, t)}`} onClick={() => void archiveField(field)}><Archive size={15} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div><span className="empty-icon"><FileSliders size={19} /></span><h3>{fields.length ? t("modelFields.noMatch") : t("modelFields.noFields")}</h3><p>{fields.length ? t("modelFields.tryDifferentSearch") : t("modelFields.fieldsEmptyHint")}</p></div>
          </div>
        )}
      </div>

      {editorOpen && <FieldEditor
        editing={editing}
        form={form}
        fieldTypeLabels={fieldTypeLabels}
        t={t}
        setForm={setForm}
        errors={fieldErrors}
        error={formError}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveField}
      />}
      {toast && <div className={`toast-region`} role="status"><div className="toast"><Check size={15} />{toast}</div></div>}
    </section>
  );
}

function DatabaseNotice({ error, locale, t }: { error: ApiClientError; locale: "zh" | "en"; t: (key: TranslationKey) => string }) {
  const unconfigured = error.code === "DATABASE_NOT_CONFIGURED";
  return (
    <div className={`notice ${unconfigured ? "warning" : ""}`} role="status" style={{ marginBottom: 20 }}>
      {unconfigured ? <Database size={17} /> : <CircleAlert size={17} />}
      <div><strong>{unconfigured ? t("modelFields.connectTitle") : t("modelFields.unavailableTitle")}</strong>
        <p>{unconfigured ? t("modelFields.databaseSetup") : translatedApiError(error, locale)}</p>
      </div>
    </div>
  );
}

type FieldFormState = typeof blankForm;
function FieldEditor({
  editing,
  form,
  fieldTypeLabels,
  t,
  setForm,
  errors,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  editing: ModelFieldDto | null;
  form: FieldFormState;
  fieldTypeLabels: Record<ProductFieldType, TranslationKey>;
  t: (key: TranslationKey) => string;
  setForm: (value: FieldFormState | ((current: FieldFormState) => FieldFormState)) => void;
  errors: Record<string, string>;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const set = <K extends keyof FieldFormState>(key: K, value: FieldFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const hasOptions = form.type === "select" || form.type === "multiselect";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="field-editor-title" onSubmit={onSubmit}>
        <div className="modal-header">
          <div><h2 id="field-editor-title">{editing ? t("modelFields.editDialog") : t("modelFields.createDialog")}</h2><p>{t("modelFields.dialogDescription")}</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("modelFields.close")}><X size={17} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="form-grid">
            <div className="form-field"><label htmlFor="field-label">{t("modelFields.fieldName")} <span className="required-mark">*</span></label><input id="field-label" className="text-input" value={form.label} onChange={(event) => set("label", event.target.value)} required maxLength={120} placeholder={t("modelFields.namePlaceholder")} />{errors.label && <span className="form-error">{translatedFieldError(errors.label, t)}</span>}</div>
            <div className="form-field"><label htmlFor="field-key">{t("modelFields.fieldKey")} <span className="required-mark">*</span></label><input id="field-key" className="text-input" value={form.key} onChange={(event) => set("key", event.target.value.toLowerCase().replace(/\s+/g, "_"))} required maxLength={80} disabled={Boolean(editing)} placeholder={t("modelFields.keyPlaceholder")} />{errors.key && <span className="form-error">{translatedFieldError(errors.key, t)}</span>}<span className="form-hint">{t("modelFields.keyFormatHint")}</span></div>
            <div className="form-field"><label htmlFor="field-type">{t("modelFields.fieldType")}</label><select id="field-type" className="select-input" value={form.type} onChange={(event) => set("type", event.target.value as ProductFieldType)} disabled={Boolean(editing?.isSystem)}>{Object.entries(fieldTypeLabels).map(([key, translation]) => <option key={key} value={key}>{t(translation)}</option>)}</select>{errors.type && <span className="form-error">{translatedFieldError(errors.type, t)}</span>}</div>
            {hasOptions && <div className="form-field"><label htmlFor="field-options">{t("modelFields.optionsRequired")} <span className="required-mark">*</span></label><textarea id="field-options" className="text-area options-editor" value={form.optionsText} onChange={(event) => set("optionsText", event.target.value)} placeholder={t("modelFields.optionPlaceholder")} />{errors.options && <span className="form-error">{translatedFieldError(errors.options, t)}</span>}</div>}
            <div className="form-field wide"><label>{t("modelFields.rules")}</label><div className="toolbar-group">
              <label className="check-row"><input type="checkbox" checked={form.required} onChange={(event) => set("required", event.target.checked)} disabled={Boolean(editing?.isSystem)} />{t("modelFields.required")}</label>
              <label className="check-row"><input type="checkbox" checked={form.isUnique} onChange={(event) => set("isUnique", event.target.checked)} disabled={Boolean(editing?.isSystem)} />{t("modelFields.valueUnique")}</label>
              <label className="check-row"><input type="checkbox" checked={form.searchable} onChange={(event) => set("searchable", event.target.checked)} disabled={Boolean(editing?.isSystem)} />{t("modelFields.searchableRule")}</label>
              <label className="check-row"><input type="checkbox" checked={form.showInList} onChange={(event) => set("showInList", event.target.checked)} disabled={Boolean(editing?.isSystem)} />{t("modelFields.listDisplay")}</label>
            </div></div>
          </div>
          {editing?.isSystem && <div className="form-help-line"><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />{t("modelFields.systemFieldHint")}</div>}
        </div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>{t("modelFields.cancel")}</button><button type="submit" className="button button-primary" disabled={saving}>{saving && <LoaderCircle size={14} className="animate-spin" />}{saving ? t("modelFields.saving") : t("modelFields.saveField")}</button></div>
      </form>
    </div>
  );
}
