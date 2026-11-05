"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, CircleAlert, CircleHelp, LoaderCircle, Plus, RefreshCw, ShieldCheck, Sparkles, Star, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import type { ModelConfigSummary } from "@/lib/model-configs/service";
import styles from "@/app/[locale]/settings/models/page.module.css";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatLocaleNumber, translatedApiError } from "@/lib/i18n/display";

type Draft = { name: string; baseUrl: string; model: string; apiKey: string; priority: number; timeoutSeconds: number; reasoningEnabled: boolean; enabled: boolean; isDefault: boolean };
const emptyDraft: Draft = { name: "", baseUrl: "", model: "", apiKey: "", priority: 10, timeoutSeconds: 60, reasoningEnabled: false, enabled: true, isDefault: false };
const fields = [
  ["deepseek", "https://api.deepseek.com", "deepseek-chat"],
  ["qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"],
  ["OpenAI", "https://api.openai.com/v1", "gpt-4.1-mini"],
];

export function ModelConfigsPage() {
  const { locale, t } = useLocale();
  const [configs, setConfigs] = useState<ModelConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<ModelConfigSummary | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try { setConfigs(await apiRequest<ModelConfigSummary[]>("/api/settings/models")); }
    catch (error) { setPageError(translatedApiError(error, locale)); }
    finally { setLoading(false); }
  }, [locale]);
  useEffect(() => {
    let active = true;
    apiRequest<ModelConfigSummary[]>("/api/settings/models")
      .then((data) => { if (active) setConfigs(data); })
      .catch((error: unknown) => { if (active) setPageError(translatedApiError(error, locale)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale]);

  const openCreate = () => { setEditing(null); setDraft(emptyDraft); setFormError(""); setDialog(true); };
  const openEdit = (item: ModelConfigSummary) => {
    setEditing(item);
    setDraft({ name: item.name, baseUrl: item.baseUrl, model: item.model, apiKey: "", priority: item.priority, timeoutSeconds: item.timeoutSeconds, reasoningEnabled: item.reasoningEnabled, enabled: item.enabled, isDefault: item.isDefault });
    setFormError(""); setDialog(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      await apiRequest(editing ? `/api/settings/models/${editing.id}` : "/api/settings/models", { method: editing ? "PATCH" : "POST", body: JSON.stringify(draft) });
      setDialog(false); setToast(t(editing ? "modelConfigs.saved" : "modelConfigs.added")); await load();
    } catch (error) { setFormError(translatedApiError(error, locale)); }
    finally { setSaving(false); }
  };
  const action = async (item: ModelConfigSummary, kind: "test" | "toggle" | "default" | "delete") => {
    if (kind === "delete" && !window.confirm(t("modelConfigs.confirmDelete").replace("{name}", item.name).replace("{defaultNote}", item.isDefault ? t("modelConfigs.defaultDeleteNote") : "").replace("{undoNote}", item.isDefault ? "" : t("modelConfigs.irreversible")))) return;
    setPendingAction(`${kind}:${item.id}`);
    try {
      if (kind === "test") {
        const result = await apiRequest<{ success: boolean; message: string }>(`/api/settings/models/${item.id}/test`, { method: "POST", body: "{}" });
        setToast(result.success ? t("modelConfigs.testSuccess") : t("modelConfigs.testFailed"));
      } else if (kind === "delete") {
        await apiRequest(`/api/settings/models/${item.id}`, { method: "DELETE" });
        setToast(t("modelConfigs.deleted"));
      } else {
        const detail = await apiRequest<Draft & { apiKeyMasked: string }>(`/api/settings/models/${item.id}`);
        await apiRequest(`/api/settings/models/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...detail, apiKey: "", ...(kind === "toggle" ? { enabled: !item.enabled, isDefault: item.enabled ? false : item.isDefault } : { enabled: true, isDefault: true }) }) });
        setToast(kind === "toggle" ? (item.enabled ? t("modelConfigs.deactivated") : t("modelConfigs.activated")) : t("modelConfigs.nowDefault"));
      }
      await load();
    } catch (error) { setToast(translatedApiError(error, locale)); }
    finally { setPendingAction(null); }
  };

  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>{t("modelConfigs.eyebrow")}</p><h1>{t("modelConfigs.title")}</h1><p className={styles.description}>{t("modelConfigs.description")}</p></div>
      <button className={styles.addButton} onClick={openCreate}><Plus size={17}/>{t("modelConfigs.add")}</button>
    </header>
    <div className={styles.note}><ShieldCheck size={17}/><span>{t("modelConfigs.securityNote")}</span><button title={t("modelConfigs.routingNote")} aria-label={t("modelConfigs.about")}><CircleHelp size={16}/></button></div>
    {loading ? <div className={styles.state}><LoaderCircle className={styles.spin}/>{t("modelConfigs.loading")}</div> : pageError ? <div className={styles.errorState}><CircleAlert/><div><strong>{t("modelConfigs.unavailableTitle")}</strong><p>{pageError}</p><button className={styles.secondaryButton} onClick={() => void load()}><RefreshCw size={14}/>{t("common.retry")}</button></div></div> : configs.length === 0 ? <div className={styles.empty}><Sparkles size={24}/><h2>{t("modelConfigs.emptyTitle")}</h2><p>{t("modelConfigs.emptyDescription")}</p><button className={styles.addButton} onClick={openCreate}><Plus size={16}/>{t("modelConfigs.addFirst")}</button></div> : <section className={styles.grid} aria-label={t("modelConfigs.listLabel")}>{configs.map((item) => {
      const busy = pendingAction?.endsWith(`:${item.id}`) ?? false;
      return <article className={styles.card} key={item.id}>
        <div className={styles.cardTop}><div className={styles.brandLine}><h2>{item.name}</h2>{item.isDefault && <span className={styles.defaultBadge}>{t("modelConfigs.defaultBadge")}</span>}</div><span className={`${styles.status} ${item.enabled ? styles.available : styles.disabled}`}><i/>{item.enabled ? t("modelConfigs.available") : t("modelConfigs.disabled")}</span></div>
        <p className={styles.url}>{item.baseUrl}</p>
        <div className={styles.details}><Info label={t("modelConfigs.model")} value={item.model}/><Info label={t("modelConfigs.apiKey")} value={item.apiKeyMasked} mono/><Info label={t("modelConfigs.priority")} value={formatLocaleNumber(item.priority, locale)}/><Info label={t("modelConfigs.timeout")} value={`${formatLocaleNumber(item.timeoutSeconds, locale)}s`}/><Info label={t("modelConfigs.reasoning")} value={item.reasoningEnabled ? t("modelConfigs.on") : t("modelConfigs.off")}/><Info label={t("modelConfigs.cooldown")} value="—"/></div>
        <div className={styles.testLine}>{item.lastTestStatus === "success" ? <Check size={14}/> : item.lastTestStatus === "failed" ? <CircleAlert size={14}/> : <span className={styles.testDot}/>}<span>{item.lastTestStatus === "success" ? t("modelConfigs.testSuccess") : item.lastTestStatus === "failed" ? t("modelConfigs.testFailed") : t("modelConfigs.notTested")}</span>{item.lastTestedAt && <time>{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.lastTestedAt))}</time>}</div>
        <div className={styles.actions}><button onClick={() => void action(item,"test")} disabled={busy}>{busy && pendingAction === `test:${item.id}` ? <LoaderCircle className={styles.spin}/> : <RefreshCw size={15}/>} {t("modelConfigs.test")}</button><button onClick={() => openEdit(item)}><span>{t("modelConfigs.edit")}</span></button><button onClick={() => void action(item,"toggle")} disabled={busy}>{item.enabled ? t("modelConfigs.deactivate") : t("modelConfigs.activate")}</button>{!item.isDefault && <button onClick={() => void action(item,"default")} disabled={busy}><Star size={14}/>{t("modelConfigs.setDefault")}</button>}<button className={styles.delete} onClick={() => void action(item,"delete")} disabled={busy}><Trash2 size={14}/>{t("modelConfigs.delete")}</button></div>
      </article>;
    })}</section>}

    {dialog && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(false); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><p className={styles.eyebrow}>{t("modelConfigs.dialogEyebrow")}</p><h2 id="dialog-title">{editing ? t("modelConfigs.editTitle") : t("modelConfigs.createTitle")}</h2></div><button className={styles.close} onClick={() => setDialog(false)} aria-label={t("modelConfigs.closeDialog")}><X size={19}/></button></header><form onSubmit={save}><div className={styles.formBody}>
      <label>{t("modelConfigs.name")}<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t("modelConfigs.namePlaceholder")} list="provider-presets"/></label><datalist id="provider-presets">{fields.map(([name]) => <option key={name} value={name}/>)}</datalist>
      <label>{t("modelConfigs.endpoint")}<input required type="url" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder={t("modelConfigs.endpointPlaceholder")} list="url-presets"/></label><datalist id="url-presets">{fields.map(([name,url]) => <option key={name} value={url}/>)}</datalist>
      <label>{t("modelConfigs.modelLabel")}<input required value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder={t("modelConfigs.modelPlaceholder")}/></label>
      <label>{t("modelConfigs.keyLabel")} <small>{editing ? t("modelConfigs.keepKeyHint") : t("modelConfigs.encryptKeyHint")}</small><input required={!editing} type="password" autoComplete="new-password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={editing ? t("modelConfigs.keepExistingKeyPlaceholder") : t("modelConfigs.apiKeyPlaceholder")}/></label>
      <div className={styles.twoColumns}><label>{t("modelConfigs.priorityHint")}<input required type="number" min="1" max="9999" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}/></label><label>{t("modelConfigs.timeoutLabel")}<input required type="number" min="1" max="180" value={draft.timeoutSeconds} onChange={(e) => setDraft({ ...draft, timeoutSeconds: Number(e.target.value) })}/></label></div>
      <label className={styles.check}><input type="checkbox" checked={draft.reasoningEnabled} onChange={(e) => setDraft({ ...draft, reasoningEnabled: e.target.checked })}/>{t("modelConfigs.reasoningLabel")}</label><label className={styles.check}><input type="checkbox" checked={draft.isDefault} disabled={!draft.enabled} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}/>{t("modelConfigs.defaultLabel")}</label><label className={styles.check}><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked, isDefault: e.target.checked ? draft.isDefault : false })}/>{t("modelConfigs.enableLabel")}</label>
      {formError && <div className={styles.formError} role="alert">{formError}</div>}
    </div><footer><button type="button" className={styles.cancelButton} onClick={() => setDialog(false)} disabled={saving}>{t("modelConfigs.cancel")}</button><button className={styles.saveButton} disabled={saving}>{saving && <LoaderCircle className={styles.spin} size={15}/>} {saving ? t("modelConfigs.saving") : t("modelConfigs.save")}</button></footer></form></section></div>}
    {toast && <div className={styles.toast} role="status">{toast}<button onClick={() => setToast("")} aria-label={t("modelConfigs.closeToast")}><X size={15}/></button></div>}
  </main>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className={styles.info}><span>{label}</span><strong className={mono ? styles.mono : ""}>{value}</strong></div>; }
