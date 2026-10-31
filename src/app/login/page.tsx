import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "管理员登录" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<main className={styles.page}><div className={styles.card}>正在打开登录页面…</div></main>}><LoginContent searchParams={searchParams}/></Suspense>;
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className={styles.page}><div className={styles.card}><p className={styles.brand}>Nike & NBA <span>商品数据平台</span></p><p className={styles.kicker}>ADMIN ACCESS</p><h1>管理员登录</h1><p className={styles.description}>登录后管理运动品牌研究数据与模型配置。</p><LoginForm next={next}/><p className={styles.setupHint}>首次使用前，请按项目 docs/model-config-setup.md 配置管理员账号与服务端密钥。</p></div><p className={styles.footer}>仅供授权管理员使用</p></main>;
}
