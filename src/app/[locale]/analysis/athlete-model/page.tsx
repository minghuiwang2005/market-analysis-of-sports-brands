import { Suspense } from "react";
import { io } from "next/cache";
import type { Metadata } from "next";
import { DatabaseConfigurationError } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";
import { listEvaluationModels, listEvaluations } from "@/lib/athlete-evaluations/service";
import type { EvaluationListItem, EvaluationModel } from "@/lib/athlete-evaluations/types";
import { AthleteEvaluationPage } from "@/components/athlete-evaluation-page";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getRequestLocale((await params).locale);
  return { title: getLocaleMessages(locale).analysis.athleteModel.metadataTitle };
}

type ModelVersion = { version: string; active: boolean; publishedAt: string; changeNote: string | null; configuration: EvaluationModel };

async function EvaluationContent() {
  await io();
  let initialRuns: EvaluationListItem[] = [];
  let initialModels: ModelVersion[] = [];
  let initialError: "database_missing" | "database_unavailable" | null = null;
  try {
    const [runs, modelRows] = await Promise.all([
      listEvaluations({ limit: 50, offset: 0 }),
      listEvaluationModels(),
    ]);
    initialRuns = runs.items as EvaluationListItem[];
    initialModels = modelRows.map((row) => ({
      version: row.version,
      active: row.active,
      publishedAt: row.publishedAt.toISOString(),
      changeNote: row.changeNote,
      configuration: row.configuration as EvaluationModel,
    }));
  } catch (error) {
    initialError = error instanceof DatabaseConfigurationError ? "database_missing" : "database_unavailable";
  }
  return <AthleteEvaluationPage initialRuns={initialRuns} initialModels={initialModels} initialError={initialError} />;
}

function EvaluationSkeleton({ locale }: { locale: "zh" | "en" }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={locale === "en" ? "Loading athlete evaluations" : "正在加载球星评估"}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonStats}><i /><i /><i /></div>
      <div className={styles.skeletonRows}><i /><i /><i /><i /></div>
    </div>
  );
}

export default async function AthleteModelRoute({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getRequestLocale((await params).locale);
  return <Suspense fallback={<EvaluationSkeleton locale={locale} />}><EvaluationContent /></Suspense>;
}
