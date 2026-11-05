import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getLocaleMessages } from "@/lib/i18n/types";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getRequestLocale((await params).locale);
  return { title: getLocaleMessages(locale).login.title };
}

export default async function LoginPage({ searchParams, params }: { searchParams: Promise<{ next?: string }>; params: Promise<{ locale: string }> }) {
  const locale = getRequestLocale((await params).locale);
  const copy = getLocaleMessages(locale).login;
  return <Suspense fallback={<main className={styles.page}><div className={styles.card}>{copy.opening}</div></main>}><LoginContent searchParams={searchParams} copy={copy}/></Suspense>;
}

async function LoginContent({ searchParams, copy }: { searchParams: Promise<{ next?: string }>; copy: ReturnType<typeof getLocaleMessages>["login"] }) {
  const { next } = await searchParams;
  return <main className={styles.page}><div className={styles.card}><p className={styles.brand}>Nike & NBA <span>{copy.brand}</span></p><p className={styles.kicker}>{copy.kicker}</p><h1>{copy.title}</h1><p className={styles.description}>{copy.description}</p><LoginForm next={next}/><p className={styles.setupHint}>{copy.setupHint}</p></div><p className={styles.footer}>{copy.footer}</p></main>;
}
