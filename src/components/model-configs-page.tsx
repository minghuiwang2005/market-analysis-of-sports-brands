"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, CircleAlert, CircleHelp, LoaderCircle, Plus, RefreshCw, ShieldCheck, Sparkles, Star, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import type { ModelConfigSummary } from "@/lib/model-configs/service";
import styles from "@/app/settings/models/page.module.css";

type Draft = { name: string; baseUrl: string; model: string; apiKey: string; priority: number; timeoutSeconds: number; reasoningEnabled: boolean; enabled: boolean; isDefault: boolean };
const emptyDraft: Draft = { name: "", baseUrl: "", model: "", apiKey: "", priority: 10, timeoutSeconds: 60, reasoningEnabled: false, enabled: true, isDefault: false };
const fields = [
  ["deepseek", "https://api.deepseek.com", "deepseek-chat"],
  ["qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"],
  ["OpenAI", "https://api.openai.com/v1", "gpt-4.1-mini"],
];

export function ModelConfigsPage() {
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
    catch (error) { setPageError(error instanceof Error ? error.message : "无法读取模型配置。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    apiRequest<ModelConfigSummary[]>("/api/settings/models")
      .then((data) => { if (active) setConfigs(data); })
      .catch((error: unknown) => { if (active) setPageError(error instanceof Error ? error.message : "无法读取模型配置。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
      setDialog(false); setToast(editing ? "模型配置已保存" : "模型配置已添加"); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  };
  const action = async (item: ModelConfigSummary, kind: "test" | "toggle" | "default" | "delete") => {
    if (kind === "delete" && !window.confirm(`确定删除「${item.name}」吗？${item.isDefault ? "删除后将没有默认模型。" : "此操作无法撤销。"}`)) return;
    setPendingAction(`${kind}:${item.id}`);
    try {
      if (kind === "test") {
        const result = await apiRequest<{ success: boolean; message: string }>(`/api/settings/models/${item.id}/test`, { method: "POST", body: "{}" });
        setToast(result.message);
      } else if (kind === "delete") {
        await apiRequest(`/api/settings/models/${item.id}`, { method: "DELETE" });
        setToast("模型配置已删除");
      } else {
        const detail = await apiRequest<Draft & { apiKeyMasked: string }>(`/api/settings/models/${item.id}`);
        await apiRequest(`/api/settings/models/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...detail, apiKey: "", ...(kind === "toggle" ? { enabled: !item.enabled, isDefault: item.enabled ? false : item.isDefault } : { enabled: true, isDefault: true }) }) });
        setToast(kind === "toggle" ? (item.enabled ? "模型已停用" : "模型已启用") : "已设为默认模型");
      }
      await load();
    } catch (error) { setToast(error instanceof Error ? error.message : "操作失败"); }
    finally { setPendingAction(null); }
  };

  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>CONFIGURATION / AI PROVIDERS</p><h1>模型参数</h1><p className={styles.description}>管理大模型接口配置。密钥仅显示末四位；编辑时留空表示保留原密钥。</p></div>
      <button className={styles.addButton} onClick={openCreate}><Plus size={17}/>添加模型</button>
    </header>
    <div className={styles.note}><ShieldCheck size={17}/><span>模型密钥使用服务端加密保存。「主 key」和优先级将作为后续分析调用的路由规则；当前可在此管理配置并测试连接。</span><button title="模型调用及自动路由尚未接入。" aria-label="关于模型配置"><CircleHelp size={16}/></button></div>
    {loading ? <div className={styles.state}><LoaderCircle className={styles.spin}/>正在读取 Neon 中的模型配置…</div> : pageError ? <div className={styles.errorState}><CircleAlert/><div><strong>暂时无法读取模型配置</strong><p>{pageError}</p><button className={styles.secondaryButton} onClick={() => void load()}><RefreshCw size={14}/>重试</button></div></div> : configs.length === 0 ? <div className={styles.empty}><Sparkles size={24}/><h2>还没有模型配置</h2><p>添加 OpenAI 兼容接口后，可在这里测试连接、设置默认模型并管理密钥。</p><button className={styles.addButton} onClick={openCreate}><Plus size={16}/>添加第一个模型</button></div> : <section className={styles.grid} aria-label="模型配置列表">{configs.map((item) => {
      const busy = pendingAction?.endsWith(`:${item.id}`) ?? false;
      return <article className={styles.card} key={item.id}>
        <div className={styles.cardTop}><div className={styles.brandLine}><h2>{item.name}</h2>{item.isDefault && <span className={styles.defaultBadge}>主 key</span>}</div><span className={`${styles.status} ${item.enabled ? styles.available : styles.disabled}`}><i/>{item.enabled ? "可用" : "已停用"}</span></div>
        <p className={styles.url}>{item.baseUrl}</p>
        <div className={styles.details}><Info label="模型" value={item.model}/><Info label="API Key" value={item.apiKeyMasked} mono/><Info label="优先级" value={String(item.priority)}/><Info label="超时（秒）" value={`${item.timeoutSeconds}s`}/><Info label="深度思考" value={item.reasoningEnabled ? "开启" : "关闭"}/><Info label="冷却至" value="—"/></div>
        <div className={styles.testLine}>{item.lastTestStatus === "success" ? <Check size={14}/> : item.lastTestStatus === "failed" ? <CircleAlert size={14}/> : <span className={styles.testDot}/>}<span>{item.lastTestStatus === "success" ? "最近连接成功" : item.lastTestStatus === "failed" ? item.lastTestMessage ?? "最近连接失败" : "尚未测试"}</span>{item.lastTestedAt && <time>{new Date(item.lastTestedAt).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })}</time>}</div>
        <div className={styles.actions}><button onClick={() => void action(item,"test")} disabled={busy}>{busy && pendingAction === `test:${item.id}` ? <LoaderCircle className={styles.spin}/> : <RefreshCw size={15}/>}测试</button><button onClick={() => openEdit(item)}><span>编辑</span></button><button onClick={() => void action(item,"toggle")} disabled={busy}>{item.enabled ? "停用" : "启用"}</button>{!item.isDefault && <button onClick={() => void action(item,"default")} disabled={busy}><Star size={14}/>设为主 key</button>}<button className={styles.delete} onClick={() => void action(item,"delete")} disabled={busy}><Trash2 size={14}/>删除</button></div>
      </article>;
    })}</section>}

    {dialog && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(false); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><p className={styles.eyebrow}>MODEL PROVIDER</p><h2 id="dialog-title">{editing ? "编辑模型" : "添加模型"}</h2></div><button className={styles.close} onClick={() => setDialog(false)} aria-label="关闭弹窗"><X size={19}/></button></header><form onSubmit={save}><div className={styles.formBody}>
      <label>名称<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="例如：deepseek" list="provider-presets"/></label><datalist id="provider-presets">{fields.map(([name]) => <option key={name} value={name}/>)}</datalist>
      <label>接口地址<input required type="url" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" list="url-presets"/></label><datalist id="url-presets">{fields.map(([name,url]) => <option key={name} value={url}/>)}</datalist>
      <label>模型<input required value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="例如：deepseek-chat"/></label>
      <label>API Key <small>{editing ? "（留空表示不修改）" : "（保存在 Neon 前会加密）"}</small><input required={!editing} type="password" autoComplete="new-password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={editing ? "已设置，输入新密钥以替换" : "请输入 API Key"}/></label>
      <div className={styles.twoColumns}><label>优先级（越小越优先）<input required type="number" min="1" max="9999" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}/></label><label>超时（秒）<input required type="number" min="1" max="180" value={draft.timeoutSeconds} onChange={(e) => setDraft({ ...draft, timeoutSeconds: Number(e.target.value) })}/></label></div>
      <label className={styles.check}><input type="checkbox" checked={draft.reasoningEnabled} onChange={(e) => setDraft({ ...draft, reasoningEnabled: e.target.checked })}/>深度思考</label><label className={styles.check}><input type="checkbox" checked={draft.isDefault} disabled={!draft.enabled} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}/>设为主 key</label><label className={styles.check}><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked, isDefault: e.target.checked ? draft.isDefault : false })}/>启用</label>
      {formError && <div className={styles.formError} role="alert">{formError}</div>}
    </div><footer><button type="button" className={styles.cancelButton} onClick={() => setDialog(false)} disabled={saving}>取消</button><button className={styles.saveButton} disabled={saving}>{saving && <LoaderCircle className={styles.spin} size={15}/>}保存</button></footer></form></section></div>}
    {toast && <div className={styles.toast} role="status">{toast}<button onClick={() => setToast("")} aria-label="关闭提示"><X size={15}/></button></div>}
  </main>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className={styles.info}><span>{label}</span><strong className={mono ? styles.mono : ""}>{value}</strong></div>; }
