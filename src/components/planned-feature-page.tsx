"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n/types";

type PlannedFeaturePageProps = {
  section: TranslationKey;
  title: TranslationKey;
  description: TranslationKey;
};

export function PlannedFeaturePage({ section, title, description }: PlannedFeaturePageProps) {
  const { t } = useLocale();
  const titleText = t(title);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t(section)}</p>
          <h1 className="page-title">{titleText}</h1>
          <p className="page-description">{t(description)}</p>
        </div>
      </div>
      <section className="data-card feature-state" aria-label={t("planned.stateLabel").replace("{title}", titleText)}>
        <span className="feature-state-label">{t("planned.notEnabled")}</span>
        <h2>{t("planned.unavailableTitle").replace("{title}", titleText)}</h2>
        <p>{t("planned.unavailableDescription")}</p>
      </section>
    </>
  );
}
