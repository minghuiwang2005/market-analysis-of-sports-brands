import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import { ArrowUpRight, MoveRight } from "lucide-react";
import { notFound } from "next/navigation";
import { LicensedPortrait } from "@/components/stars/licensed-portrait";
import { DatabaseConfigurationError } from "@/lib/db";
import { getStarSportPageData, type AthleteProfile, type StarSportPageData } from "@/lib/stars/queries";
import styles from "./page.module.css";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/locale";
import { LocaleLink } from "@/lib/i18n/locale-link";
import { formatLocaleDate, formatLocaleNumber } from "@/lib/i18n/display";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getRequestLocale((await params).locale);
  const copy = getLocaleMessages(locale).stars;
  return { title: copy.metadataTitle, description: copy.metadataDescription };
}

const sports = ["basketball", "football", "tennis", "athletics"] as const;

export function generateStaticParams() {
  return sports.map((sport) => ({ sport }));
}

function scopeLabel(scope: string, copy: ReturnType<typeof getLocaleMessages>["stars"]) {
  if (scope === "biography" || scope === "career_highlight") return copy.sourcesBiography;
  if (scope === "signature_line") return copy.sourcesSignature;
  return copy.sourcesPortrait;
}

function SourceLinks({ athlete, copy, locale }: { athlete: AthleteProfile; copy: ReturnType<typeof getLocaleMessages>["stars"]; locale: Locale }) {
  const sources = athlete.sources.filter((source) => ["biography", "career_highlight", "signature_line"].includes(source.claimScope));

  return (
    <div className={styles.sourceLinks} aria-label={`${locale === "en" ? athlete.nameEn : athlete.nameZh} · ${copy.sourceLabel}`}>
      {sources.map((source) => (
        <a href={source.url} key={`${source.claimScope}-${source.url}`} target="_blank" rel="noopener noreferrer">
          {scopeLabel(source.claimScope, copy)} · {source.publisher}<ArrowUpRight size={12} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function AthleteCredits({ athlete, copy }: { athlete: AthleteProfile; copy: ReturnType<typeof getLocaleMessages>["stars"] }) {
  return (
    <div className={styles.photoCredit}>
      <a href={athlete.portraitSourceUrl} target="_blank" rel="noopener noreferrer">{copy.image}: {athlete.portraitCredit}</a>
      <span> · </span>
      <a href={athlete.portraitLicenseUrl} target="_blank" rel="noopener noreferrer">{athlete.portraitLicense}</a>
    </div>
  );
}

function ShoeLine({ athlete, copy, locale }: { athlete: AthleteProfile; copy: ReturnType<typeof getLocaleMessages>["stars"]; locale: Locale }) {
  const displayName = locale === "en" ? athlete.nameEn : athlete.nameZh;
  return (
    <div className={styles.shoeLines} aria-label={`${displayName} · ${copy.shoeSeries}`}>
      {athlete.shoeLines.map((line) => (
        <div className={styles.shoeLine} key={`${line.brand}-${line.lineName}`}>
          <span className={`${styles.lineStatus} ${line.relationshipStatus === "current" ? styles.lineCurrent : styles.lineHistoric}`}>
            {line.relationshipStatus === "current" ? copy.continued : copy.historical}
          </span>
          <strong>{line.lineName}</strong>
          <span>{line.brand}{line.startedYear ? ` · ${line.startedYear} ${copy.startedSuffix}` : ""}{line.endedYear ? `–${line.endedYear}` : ""}</span>
          {line.representativeModels.length > 0 && (
            <small>{line.representativeModels.map((model) => model.name).join(" / ")}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", { minimumIntegerDigits: 2, useGrouping: false }).format(value);
}

function AthleteCard({ athlete, index, copy, locale }: { athlete: AthleteProfile; index: number; copy: ReturnType<typeof getLocaleMessages>["stars"]; locale: Locale }) {
  const displayName = locale === "en" ? athlete.nameEn : athlete.nameZh;
  const alternateName = locale === "en" ? athlete.nameZh : athlete.nameEn;
  const profileFacts = [
    athlete.league,
    athlete.position,
    athlete.nationality,
    athlete.heightCm ? `${copy.height}: ${formatLocaleNumber(athlete.heightCm, locale)} cm` : null,
    athlete.birthDate ? `${copy.birth}: ${formatLocaleDate(athlete.birthDate, locale, { dateStyle: "medium" })}` : null,
  ].filter(Boolean);

  return (
    <article className={styles.athleteCard}>
      <a className={styles.cardPortrait} href={athlete.portraitSourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${copy.viewSource}: ${displayName}`}>
        <LicensedPortrait
          src={athlete.portraitUrl}
          alt={athlete.portraitAlt}
          className={styles.cardImage}
          sizes="(max-width: 620px) 38vw, (max-width: 1040px) 22vw, 15vw"
        />
        <span className={styles.cardIndex}>{formatCount(index, locale)}</span>
      </a>
      <div className={styles.cardBody}>
        <div className={styles.cardHeading}>
          <div>
            <h3>{displayName}</h3>
            <p>{alternateName}</p>
          </div>
          {athlete.jerseyNumber && <span className={styles.jersey}>#{athlete.jerseyNumber}</span>}
        </div>
        <p className={styles.cardBio}>{athlete.bio}</p>
        <p className={styles.playerMeta}>{profileFacts.join(" · ")}</p>
        {athlete.teamsSummary && <p className={styles.teamMeta}>{copy.teams} · {athlete.teamsSummary}</p>}
        {athlete.careerHighlights.length > 0 && (
          <ul className={styles.highlights}>
            {athlete.careerHighlights.slice(0, 2).map((highlight) => (
              <li key={`${highlight.value}-${highlight.label}`}><strong>{highlight.value}</strong><span>{highlight.label}</span></li>
            ))}
          </ul>
        )}
        <ShoeLine athlete={athlete} copy={copy} locale={locale} />
        <AthleteCredits athlete={athlete} copy={copy} />
        <SourceLinks athlete={athlete} copy={copy} locale={locale} />
      </div>
    </article>
  );
}

function JordanFeature({ athlete, copy, locale }: { athlete: AthleteProfile; copy: ReturnType<typeof getLocaleMessages>["stars"]; locale: Locale }) {
  const biographySource = athlete.sources.find((source) => source.claimScope === "biography");
  return (
    <article className={styles.jordanFeature}>
      <div className={styles.jordanPortrait}>
        <LicensedPortrait src={athlete.portraitUrl} alt={athlete.portraitAlt} className={styles.jordanImage} sizes="(max-width: 780px) 100vw, 44vw" priority />
        {athlete.jerseyNumber && <span className={styles.jordanNumber} aria-hidden="true">{athlete.jerseyNumber}</span>}
        <div className={styles.jordanCredit}><AthleteCredits athlete={athlete} copy={copy} /></div>
      </div>
      <div className={styles.jordanCopy}>
        <p className={styles.eyebrow}>{copy.signatureLineEyebrow}</p>
        <h2>{locale === "en" ? athlete.nameEn : athlete.nameZh}<span>{locale === "en" ? athlete.nameZh : athlete.nameEn}</span></h2>
        <p className={styles.jordanBio}>{athlete.bio}</p>
        <div className={styles.jordanFacts}>
          {[
            athlete.league ? { label: copy.league, value: athlete.league } : null,
            athlete.position ? { label: copy.position, value: athlete.position } : null,
            athlete.nationality ? { label: copy.nationality, value: athlete.nationality } : null,
            athlete.heightCm ? { label: copy.height, value: `${new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(athlete.heightCm / 100)} m` } : null,
            athlete.birthDate ? { label: copy.birth, value: athlete.birthDate } : null,
            athlete.teamsSummary ? { label: copy.teams, value: athlete.teamsSummary } : null,
          ].filter((fact): fact is { label: string; value: string } => Boolean(fact)).map((fact) => (
            <div className={styles.jordanFact} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>
          ))}
        </div>
        <div className={styles.jordanHighlights}>
          {athlete.careerHighlights.map((highlight) => (
            <div className={styles.jordanHighlight} key={highlight.label}><strong>{highlight.value}</strong><span>{highlight.label}</span></div>
          ))}
        </div>
        <ShoeLine athlete={athlete} copy={copy} locale={locale} />
        <div className={styles.jordanLinks}>
          {biographySource && <a href={biographySource.url} target="_blank" rel="noopener noreferrer">{copy.nbaProfile} <ArrowUpRight size={14} aria-hidden="true" /></a>}
          <LocaleLink href="/sports/nba">{copy.viewNbaHistory} <MoveRight size={14} aria-hidden="true" /></LocaleLink>
        </div>
      </div>
    </article>
  );
}

function BasketballDirectory({ data, copy, locale }: { data: StarSportPageData; copy: ReturnType<typeof getLocaleMessages>["stars"]; locale: Locale }) {
  const jordan = data.athletes.find(({ slug }) => slug === "michael-jordan");
  const roster = data.athletes.filter(({ slug }) => slug !== "michael-jordan");
  const activeCount = data.athletes.filter((athlete) => athlete.shoeLines.some((line) => line.relationshipStatus === "current")).length;
  const currentRoster = roster.filter((athlete) => athlete.shoeLines.some((line) => line.relationshipStatus === "current"));
  const historicalRoster = roster.filter((athlete) => athlete.shoeLines.every((line) => line.relationshipStatus === "historical"));

  if (!jordan) return <p className={styles.status} role="alert">{copy.basketballMissingJordan}</p>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>{copy.athletesEyebrow} / {copy.sports.basketball}</p><h1>{copy.sports.basketball}<span>{copy.signatureAthletes}</span></h1></div>
      </header>
      <div className={styles.directoryMeta}>
        <span>{copy.nbaRoster} <strong>{formatCount(data.athletes.length, locale)}</strong> {copy.playerCount}</span>
        <span>{copy.activeLines} <strong>{formatCount(activeCount, locale)}</strong></span>
        <span>{copy.historicalLines}</span>
      </div>
      <section aria-label={copy.jordanAlt}><JordanFeature athlete={jordan} copy={copy} locale={locale} /></section>
      <section className={styles.rosterSection} aria-labelledby="roster-heading">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{copy.playerIndexEyebrow}</p><h2 id="roster-heading">{copy.playerIndex}</h2></div></div>
        <div className={styles.rosterGroup}>
          <div className={styles.groupHeading}><h3>{copy.currentLines}</h3><span>{formatCount(currentRoster.length, locale)} {copy.jordanAtTop}</span></div>
          <div className={styles.rosterGrid}>
            {currentRoster.map((athlete) => <AthleteCard key={athlete.slug} athlete={athlete} index={data.athletes.indexOf(athlete) + 1} copy={copy} locale={locale} />)}
          </div>
        </div>
        <div className={styles.rosterGroup}>
          <div className={styles.groupHeading}><h3>{copy.historicLinesTitle}</h3><span>{formatCount(historicalRoster.length, locale)} {copy.playerCount}</span></div>
          <div className={styles.rosterGrid}>
            {historicalRoster.map((athlete) => <AthleteCard key={athlete.slug} athlete={athlete} index={data.athletes.indexOf(athlete) + 1} copy={copy} locale={locale} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function ComingSoon({ data, copy }: { data: StarSportPageData; copy: ReturnType<typeof getLocaleMessages>["stars"] }) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>{copy.athletesEyebrow} / {copy.sports[data.slug as keyof typeof copy.sports]}</p><h1>{copy.sports[data.slug as keyof typeof copy.sports]}<span>{copy.signatureAthletes}</span></h1></div>
      </header>
      <section className={styles.comingSoon}>
        <span>{copy.comingSoonEyebrow}</span>
        <h2>{copy.comingSoon}</h2>
        <LocaleLink href="/stars/basketball">{copy.viewBasketball} <MoveRight size={15} aria-hidden="true" /></LocaleLink>
      </section>
    </div>
  );
}

async function SportContent({ slug, locale }: { slug: string; locale: Locale }) {
  await io();
  const copy = getLocaleMessages(locale).stars;
  let data: StarSportPageData | null;
  try {
    data = await getStarSportPageData(slug, locale);
  } catch (error) {
    const message = error instanceof DatabaseConfigurationError
      ? copy.databaseMissing
      : copy.unavailable;
    return <p className={styles.status} role="alert">{message}</p>;
  }

  if (!data) notFound();
  return data.contentStatus === "active" ? <BasketballDirectory data={data} copy={copy} locale={locale} /> : <ComingSoon data={data} copy={copy} />;
}

function LoadingState({ locale }: { locale: Locale }) {
  return <p className={styles.status} role="status">{getLocaleMessages(locale).stars.loading}</p>;
}

export default async function StarSportPage({ params }: { params: Promise<{ sport: string; locale: string }> }) {
  const { sport, locale: localeParam } = await params;
  const locale = getRequestLocale(localeParam);
  if (!sports.some((slug) => slug === sport)) notFound();
  return <Suspense fallback={<LoadingState locale={locale} />}><SportContent slug={sport} locale={locale} /></Suspense>;
}
