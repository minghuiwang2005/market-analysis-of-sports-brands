"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import styles from "@/app/login/page.module.css";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = await apiRequest<{ redirectTo: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, next }) });
      router.replace(result.redirectTo); router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "登录失败，请重试。");
    } finally { setLoading(false); }
  };
  return <form className={styles.form} onSubmit={submit}>
    <label>管理员账号<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
    <label>密码<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button disabled={loading}>{loading ? "正在登录…" : "登录"}</button>
  </form>;
}
