import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import {
  getNbaClassicGames,
  getSportsTimelineGroups,
  type NbaClassicGame,
  type TimelineEvent,
} from "@/lib/sports-timeline/queries";
import { DatabaseConfigurationError } from "@/lib/db";
import styles from "./page.module.css";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getRequestLocale((await params).locale);
  const copy = getLocaleMessages(locale).nba;
  return { title: copy.metadataTitle, description: copy.metadataDescription };
}

function formatEventDate(event: TimelineEvent, locale: Locale) {
  const lang = locale === "en" ? "en-US" : "zh-CN";
  if (event.datePrecision === "day" && event.occurredMonth && event.occurredDay) {
    return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(event.occurredYear, event.occurredMonth - 1, event.occurredDay)));
  }
  if (event.datePrecision === "month" && event.occurredMonth) {
    return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(event.occurredYear, event.occurredMonth - 1, 1)));
  }
  return new Intl.NumberFormat(lang).format(event.occurredYear);
}

function formatDateTime(event: TimelineEvent) {
  const year = String(event.occurredYear);
  const month = event.occurredMonth?.toString().padStart(2, "0");
  const day = event.occurredDay?.toString().padStart(2, "0");

  if (event.datePrecision === "day" && month && day) return `${year}-${month}-${day}`;
  if (event.datePrecision === "month" && month) return `${year}-${month}`;
  return year;
}

function EventCard({ event, locale, copy }: { event: TimelineEvent; locale: Locale; copy: ReturnType<typeof getLocaleMessages>["nba"] }) {
  const isSigning = event.eventType === "athlete_signing";
  const categoryLabel = copy.categories[event.category as keyof typeof copy.categories];

  return (
    <article
      className={styles.eventCard}
      data-category={event.category}
      data-event-type={event.eventType}
    >
      <div className={styles.eventMeta}>
        <span className={styles.eventCategory}>
          {isSigning ? copy.eventSigning : categoryLabel ?? copy.eventDefault}
        </span>
        <time dateTime={formatDateTime(event)}>{formatEventDate(event, locale)}</time>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <ul className={styles.sources} aria-label={copy.sources}>
        {event.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${source.publisher}: ${source.sourceTitle} (${copy.openSource})`}
            >
              {source.publisher} <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ClassicGameCard({ game, copy }: { game: NbaClassicGame; copy: ReturnType<typeof getLocaleMessages>["nba"] }) {
  return (
    <article className={styles.classicGameCard}>
      <div className={styles.classicGameMeta}>
        <span>{game.gameLabel}</span>
        <time dateTime={String(game.occurredYear)}>{game.occurredYear}</time>
      </div>
      <h3>{game.title}</h3>
      <p className={styles.classicGameMatchup}>{game.matchup}</p>
      <p className={styles.classicGameResult}>{game.result}</p>
      <p className={styles.classicGameDescription}>{game.description}</p>
      <ul className={styles.classicGameSources} aria-label={`${game.title} · ${copy.sources}`}>
        {game.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${source.publisher}: ${source.sourceTitle} (${copy.openSource})`}
            >
              {source.publisher} <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

async function ClassicGamesContent({ locale }: { locale: Locale }) {
  await io();
  const copy = getLocaleMessages(locale).nba;

  let games: Awaited<ReturnType<typeof getNbaClassicGames>>;
  try {
    games = await getNbaClassicGames(locale);
  } catch (error) {
    const message = error instanceof DatabaseConfigurationError
      ? copy.databaseMissing
      : copy.classicUnavailable;

    return <p className={styles.classicGamesStatus} role="alert">{message}</p>;
  }

  if (games.length === 0) {
    return <p className={styles.classicGamesStatus}>{copy.classicNoData}</p>;
  }

  return (
    <div className={styles.classicGamesGrid}>
      {games.map((game) => <ClassicGameCard game={game} copy={copy} key={game.id} />)}
    </div>
  );
}

async function TimelineContent({ locale }: { locale: Locale }) {
  await io();
  const copy = getLocaleMessages(locale).nba;

  let groups: Awaited<ReturnType<typeof getSportsTimelineGroups>>;
  try {
    groups = await getSportsTimelineGroups("nba", locale);
  } catch (error) {
    const message = error instanceof DatabaseConfigurationError
      ? copy.databaseMissing
      : copy.timelineUnavailable;

    return <p className={styles.timelineStatus} role="alert">{message}</p>;
  }

  if (groups.length === 0) {
    return <p className={styles.timelineStatus}>{copy.timelineNoData}</p>;
  }

  return (
    <>
      <div className={styles.trackLabels} aria-hidden="true">
        <span>{copy.nbaEvents}</span>
        <span>{copy.yearLabel}</span>
        <span>{copy.signingEvents}</span>
      </div>
      <ol className={styles.timeline} aria-label={copy.timelineAria}>
        {groups.map((group) => (
          <li className={styles.yearGroup} key={group.year}>
            <div className={styles.yearMarker}>
              <span className={styles.yearNode} aria-hidden="true" />
              <time className={styles.yearLabel} dateTime={String(group.year)}>
                {group.year}
              </time>
            </div>
            <div className={styles.nbaLane} role="group" aria-label={`${group.year} · ${copy.nbaEvents}`}>
              {group.nbaEvents.map((event) => <EventCard event={event} locale={locale} copy={copy} key={event.id} />)}
            </div>
            <div className={styles.signingLane} role="group" aria-label={`${group.year} · ${copy.eventSigning}`}>
              {group.signingEvents.map((event) => <EventCard event={event} locale={locale} copy={copy} key={event.id} />)}
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.sourceNote}>
        {copy.sourceNote}
      </p>
    </>
  );
}

function TimelineLoading({ locale }: { locale: Locale }) {
  return <p className={styles.timelineStatus} role="status">{getLocaleMessages(locale).nba.loading}</p>;
}

export default async function NbaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getRequestLocale((await params).locale);
  const copy = getLocaleMessages(locale).nba;
  const categories = Object.entries(copy.categories).filter(([key]) => key !== "signing").map(([id, label]) => ({ id, label }));
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="nba-title">
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>{copy.heroKicker}</p>
          <h1 className={styles.heroTitle} id="nba-title">NBA</h1>
          <p className={styles.heroSubtitle}>{copy.heroSubtitle}</p>
          <p className={styles.heroDescription}>{copy.heroDescription}</p>
          <a className={styles.heroSource} href="https://www.nba.com/news/about" target="_blank" rel="noopener noreferrer">
            {copy.officialIntro} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <span>1946</span>
          <i />
          <span>2026</span>
        </div>
      </section>

      <section className={styles.intro} aria-label={copy.overviewAria}>
        <div className={styles.introLead}>
          <span className={styles.sectionNumber}>{copy.overviewLabel}</span>
          <h2>{copy.overviewTitle.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h2>
        </div>
      </section>

      <section className={styles.classicGames} aria-labelledby="nba-classic-games-title">
        <div className={styles.classicGamesHeader}>
          <div>
            <span className={styles.sectionNumber}>{copy.classicLabel}</span>
            <h2 id="nba-classic-games-title">{copy.classicTitle}</h2>
          </div>
          <span className={styles.classicGamesCount}>1970 — 2013</span>
        </div>
        <Suspense fallback={<p className={styles.classicGamesStatus} role="status">{copy.classicLoading}</p>}>
          <ClassicGamesContent locale={locale} />
        </Suspense>
      </section>

      <section className={styles.history} aria-labelledby="nba-history-title">
        <div className={styles.historyHeader}>
          <div>
            <span className={styles.sectionNumber}>{copy.timelineLabel}</span>
            <h2 id="nba-history-title">{copy.timelineTitle}</h2>
            <p>{copy.timelineSubtitle}</p>
          </div>
          <div className={styles.legend} aria-label={copy.eventLegend}>
            {categories.map((category) => (
              <span className={styles.legendItem} data-category={category.id} key={category.id}>
                <span className={styles.legendDot} aria-hidden="true" />
                {category.label}
              </span>
            ))}
            <span className={styles.legendItem} data-event-type="athlete_signing">
              <span className={styles.legendDot} aria-hidden="true" />
              {copy.eventSigning}
            </span>
          </div>
        </div>

        <Suspense fallback={<TimelineLoading locale={locale} />}>
          <TimelineContent locale={locale} />
        </Suspense>
      </section>
    </div>
  );
}
