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

const fieldTypeLabels: Record<ProductFieldType, string> = {
  short_text: "短文本",
  long_text: "长文本",
  number: "数字",
  boolean: "是 / 否",
  date: "日期",
  url: "链接",
  select: "单选",
  multiselect: "多选",
};

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请重试。";
}

export function ModelFieldsPage() {
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
      setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", errorMessage(error)));
    } finally {
      setLoading(false);
    }
  }, [level, showArchived]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<ModelFieldDto[]>(`/api/model-fields?level=${level}&includeArchived=${showArchived}`)
      .then((result) => { if (!cancelled) { setFields(result); setLoadError(null); } })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof ApiClientError ? error : new ApiClientError(500, "REQUEST_FAILED", errorMessage(error)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [level, showArchived]);

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
      setToast(editing ? "字段已更新" : "字段已创建");
      window.setTimeout(() => setToast(""), 2600);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
      if (error instanceof ApiClientError && error.fields) setFieldErrors(error.fields);
    } finally {
      setSaving(false);
    }
  };

  const archiveField = async (field: ModelFieldDto) => {
    if (!window.confirm(`归档“${field.label}”？既有商品值会保留，新商品表单将不再显示此字段。`)) return;
    try {
      await apiRequest(`/api/model-fields/${field.id}`, { method: "DELETE" });
      setToast("字段已归档，既有商品值仍保留");
      window.setTimeout(() => setToast(""), 3000);
      await load();
    } catch (error) {
      setToast(errorMessage(error));
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
          <p className="eyebrow">DATA STRUCTURE</p>
          <h1 className="page-title">商品模型</h1>
          <p className="page-description">先定义商品结构，再按同一套字段录入 SPU 与具体 SKU 变体。</p>
        </div>
        <div className="page-actions">
          <button className="button button-primary" onClick={openCreate} disabled={Boolean(loadError)}>
            <Plus size={15} /> 添加字段
          </button>
        </div>
      </div>

      {loadError && <DatabaseNotice error={loadError} />}

      <div className="model-tabs" role="tablist" aria-label="字段层级">
        <button type="button" role="tab" aria-selected={level === "spu"} onClick={() => { setLoading(true); setLevel("spu"); }}>SPU 字段</button>
        <button type="button" role="tab" aria-selected={level === "sku"} onClick={() => { setLoading(true); setLevel("sku"); }}>SKU 字段</button>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search-wrap">
            <Search size={15} aria-hidden="true" />
            <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索字段名称或编码" aria-label="搜索字段名称或编码" />
          </label>
        </div>
        <div className="toolbar-group">
          <span className="count-label">{visibleFields.length} 个字段</span>
          <button className="button button-secondary" onClick={() => { setLoading(true); setShowArchived((value) => !value); }} aria-pressed={showArchived}>
            <Archive size={14} /> {showArchived ? "隐藏已归档" : "查看已归档"}
          </button>
        </div>
      </div>

      <div className="data-card">
        {loading ? <div className="loading-block"><span className="spinner" />正在读取 Neon 字段</div> : loadError ? (
          <div className="loading-block"><CircleAlert size={15} />字段暂不可用，完成数据库连接后会显示在这里。</div>
        ) : visibleFields.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>字段名称 / 编码</th><th>类型</th><th>规则</th><th>选项</th><th>展示</th><th>来源</th><th><span className="sr-only">操作</span></th>
              </tr></thead>
              <tbody>
                {visibleFields.map((field) => (
                  <tr key={field.id}>
                    <td><span className="field-label">{field.label}{field.required && <span className="required-mark">*</span>}</span><div className="field-code">{field.key}</div></td>
                    <td><span className="tag">{fieldTypeLabels[field.type]}</span></td>
                    <td><div className="toolbar-group">{field.required && <span className="tag">必填</span>}{field.isUnique && <span className="tag">唯一</span>}{!field.required && !field.isUnique && <span className="count-label">—</span>}</div></td>
                    <td><span className="product-subline">{field.options.length ? field.options.slice(0, 3).join("、") + (field.options.length > 3 ? ` +${field.options.length - 3}` : "") : "—"}</span></td>
                    <td><div className="toolbar-group">{field.showInList && <span className="tag">列表</span>}{field.searchable && <span className="tag">可搜索</span>}{!field.showInList && !field.searchable && <span className="count-label">—</span>}</div></td>
                    <td><span className={`tag ${field.isSystem ? "system" : "custom"}`}>{field.isSystem ? "系统" : "自定义"}</span>{field.archivedAt && <span className="tag archived" style={{ marginLeft: 5 }}>已归档</span>}</td>
                    <td><div className="table-actions">
                      <button className="icon-button" title="编辑字段" aria-label={`编辑字段 ${field.label}`} disabled={Boolean(field.archivedAt)} onClick={() => openEdit(field)}><SquarePen size={15} /></button>
                      {!field.isSystem && !field.archivedAt && <button className="icon-button danger" title="归档字段" aria-label={`归档字段 ${field.label}`} onClick={() => void archiveField(field)}><Archive size={15} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div><span className="empty-icon"><FileSliders size={19} /></span><h3>{fields.length ? "没有匹配的字段" : "Neon 中还没有字段"}</h3><p>{fields.length ? "换一个字段名称或编码试试。" : "配置 Neon 并运行数据库迁移后，系统字段与可配置字段会显示在这里。"}</p></div>
          </div>
        )}
      </div>

      {editorOpen && <FieldEditor
        editing={editing}
        form={form}
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

function DatabaseNotice({ error }: { error: ApiClientError }) {
  const unconfigured = error.code === "DATABASE_NOT_CONFIGURED";
  return (
    <div className={`notice ${unconfigured ? "warning" : ""}`} role="status" style={{ marginBottom: 20 }}>
      {unconfigured ? <Database size={17} /> : <CircleAlert size={17} />}
      <div><strong>{unconfigured ? "连接 Neon 后即可管理字段" : "暂时无法读取字段模型"}</strong>
        <p>{unconfigured ? "本地开发请将 .env.example 复制为 .env.local，填写 Neon 连接串，并运行 pnpm db:migrate。" : error.message}</p>
      </div>
    </div>
  );
}

type FieldFormState = typeof blankForm;
function FieldEditor({
  editing,
  form,
  setForm,
  errors,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  editing: ModelFieldDto | null;
  form: FieldFormState;
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
          <div><h2 id="field-editor-title">{editing ? "编辑字段" : "新增字段"}</h2><p>字段结构保存在 Neon，归档不会删除历史商品值。</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={17} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="inline-error" role="alert">{error}</div>}
          <div className="form-grid">
            <div className="form-field"><label htmlFor="field-label">字段名称 <span className="required-mark">*</span></label><input id="field-label" className="text-input" value={form.label} onChange={(event) => set("label", event.target.value)} required maxLength={120} placeholder="例如：鞋面科技" />{errors.label && <span className="form-error">{errors.label}</span>}</div>
            <div className="form-field"><label htmlFor="field-key">字段编码 <span className="required-mark">*</span></label><input id="field-key" className="text-input" value={form.key} onChange={(event) => set("key", event.target.value.toLowerCase().replace(/\s+/g, "_"))} required maxLength={80} disabled={Boolean(editing)} placeholder="例如：upper_technology" />{errors.key && <span className="form-error">{errors.key}</span>}<span className="form-hint">使用小写英文、数字和下划线，创建后不可更改。</span></div>
            <div className="form-field"><label htmlFor="field-type">数据类型</label><select id="field-type" className="select-input" value={form.type} onChange={(event) => set("type", event.target.value as ProductFieldType)} disabled={Boolean(editing?.isSystem)}>{Object.entries(fieldTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{errors.type && <span className="form-error">{errors.type}</span>}</div>
            {hasOptions && <div className="form-field"><label htmlFor="field-options">选项 <span className="required-mark">*</span></label><textarea id="field-options" className="text-area options-editor" value={form.optionsText} onChange={(event) => set("optionsText", event.target.value)} placeholder={"每行一个选项\n例如：\n低帮\n中帮\n高帮"} />{errors.options && <span className="form-error">{errors.options}</span>}</div>}
            <div className="form-field wide"><label>数据规则</label><div className="toolbar-group">
              <label className="check-row"><input type="checkbox" checked={form.required} onChange={(event) => set("required", event.target.checked)} disabled={Boolean(editing?.isSystem)} />必填</label>
              <label className="check-row"><input type="checkbox" checked={form.isUnique} onChange={(event) => set("isUnique", event.target.checked)} disabled={Boolean(editing?.isSystem)} />值唯一</label>
              <label className="check-row"><input type="checkbox" checked={form.searchable} onChange={(event) => set("searchable", event.target.checked)} disabled={Boolean(editing?.isSystem)} />支持搜索</label>
              <label className="check-row"><input type="checkbox" checked={form.showInList} onChange={(event) => set("showInList", event.target.checked)} disabled={Boolean(editing?.isSystem)} />列表展示</label>
            </div></div>
          </div>
          {editing?.isSystem && <div className="form-help-line"><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />系统字段编码和类型受保护，可调整展示名称。</div>}
        </div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>取消</button><button type="submit" className="button button-primary" disabled={saving}>{saving && <LoaderCircle size={14} className="animate-spin" />}{saving ? "保存中" : "保存字段"}</button></div>
      </form>
    </div>
  );
}
