"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { useLocale } from "@/lib/i18n/locale-provider";
import styles from "@/app/[locale]/login/page.module.css";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useLocale();
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
      setError(err instanceof ApiClientError && err.code === "INVALID_CREDENTIALS"
        ? t("login.invalidCredentials")
        : t("login.failed"));
    } finally { setLoading(false); }
  };
  return <form className={styles.form} onSubmit={submit}>
    <label>{t("login.username")}<input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
    <label>{t("login.password")}<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button disabled={loading}>{loading ? t("login.signingIn") : t("login.signIn")}</button>
  </form>;
}
