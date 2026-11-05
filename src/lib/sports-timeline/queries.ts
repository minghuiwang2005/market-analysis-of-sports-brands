import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import type { Locale } from "@/lib/i18n/locale";
import {
  nbaClassicGameSources,
  nbaClassicGames,
  sportsTimelineEventSources,
  sportsTimelineEvents,
} from "@/lib/db/schema";

export type NbaClassicGame = {
  id: string;
  occurredYear: number;
  gameLabel: string;
  title: string;
  matchup: string;
  result: string;
  description: string;
  sources: {
    url: string;
    publisher: string;
    sourceTitle: string;
  }[];
};

export async function getNbaClassicGames(locale: Locale = "zh"): Promise<NbaClassicGame[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: nbaClassicGames.id,
      occurredYear: nbaClassicGames.occurredYear,
      gameLabel: nbaClassicGames.gameLabel,
      gameLabelEn: nbaClassicGames.gameLabelEn,
      title: nbaClassicGames.title,
      titleEn: nbaClassicGames.titleEn,
      matchup: nbaClassicGames.matchup,
      matchupEn: nbaClassicGames.matchupEn,
      result: nbaClassicGames.result,
      resultEn: nbaClassicGames.resultEn,
      description: nbaClassicGames.description,
      descriptionEn: nbaClassicGames.descriptionEn,
      sourceUrl: nbaClassicGameSources.url,
      sourcePublisher: nbaClassicGameSources.publisher,
      sourceTitle: nbaClassicGameSources.sourceTitle,
    })
    .from(nbaClassicGames)
    .innerJoin(
      nbaClassicGameSources,
      and(
        eq(nbaClassicGameSources.gameId, nbaClassicGames.id),
        eq(nbaClassicGameSources.verificationStatus, "verified"),
      ),
    )
    .where(eq(nbaClassicGames.published, true))
    .orderBy(
      asc(nbaClassicGames.occurredYear),
      asc(nbaClassicGames.sortOrder),
      asc(nbaClassicGames.eventKey),
      asc(nbaClassicGameSources.url),
    );

  const gamesById = new Map<string, NbaClassicGame>();
  for (const row of rows) {
    let game = gamesById.get(row.id);
    if (!game) {
      game = {
        id: row.id,
        occurredYear: row.occurredYear,
        gameLabel: locale === "en" ? row.gameLabelEn ?? row.gameLabel : row.gameLabel,
        title: locale === "en" ? row.titleEn ?? row.title : row.title,
        matchup: locale === "en" ? row.matchupEn ?? row.matchup : row.matchup,
        result: locale === "en" ? row.resultEn ?? row.result : row.result,
        description: locale === "en" ? row.descriptionEn ?? row.description : row.description,
        sources: [],
      };
      gamesById.set(row.id, game);
    }

    game.sources.push({
      url: row.sourceUrl,
      publisher: row.sourcePublisher,
      sourceTitle: row.sourceTitle,
    });
  }

  return [...gamesById.values()];
}

export type TimelineEvent = {
  id: string;
  eventType: "league_milestone" | "athlete_signing";
  category: string;
  occurredYear: number;
  occurredMonth: number | null;
  occurredDay: number | null;
  datePrecision: "year" | "month" | "day";
  athleteNameZh: string | null;
  athleteNameEn: string | null;
  organization: string | null;
  organizationEn: string | null;
  title: string;
  description: string;
  sources: {
    url: string;
    publisher: string;
    sourceTitle: string;
    evidenceNote: string;
  }[];
};

export type TimelineYearGroup = {
  year: number;
  nbaEvents: TimelineEvent[];
  signingEvents: TimelineEvent[];
};

export async function getSportsTimelineGroups(sport: "nba", locale: Locale = "zh"): Promise<TimelineYearGroup[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: sportsTimelineEvents.id,
      eventType: sportsTimelineEvents.eventType,
      category: sportsTimelineEvents.category,
      occurredYear: sportsTimelineEvents.occurredYear,
      occurredMonth: sportsTimelineEvents.occurredMonth,
      occurredDay: sportsTimelineEvents.occurredDay,
      datePrecision: sportsTimelineEvents.datePrecision,
      athleteNameZh: sportsTimelineEvents.athleteNameZh,
      athleteNameEn: sportsTimelineEvents.athleteNameEn,
      organization: sportsTimelineEvents.organization,
      organizationEn: sportsTimelineEvents.organizationEn,
      title: sportsTimelineEvents.title,
      titleEn: sportsTimelineEvents.titleEn,
      description: sportsTimelineEvents.description,
      descriptionEn: sportsTimelineEvents.descriptionEn,
      sourceUrl: sportsTimelineEventSources.url,
      sourcePublisher: sportsTimelineEventSources.publisher,
      sourceTitle: sportsTimelineEventSources.sourceTitle,
      evidenceNote: sportsTimelineEventSources.evidenceNote,
    })
    .from(sportsTimelineEvents)
    .innerJoin(
      sportsTimelineEventSources,
      and(
        eq(sportsTimelineEventSources.eventId, sportsTimelineEvents.id),
        eq(sportsTimelineEventSources.verificationStatus, "verified"),
      ),
    )
    .where(and(eq(sportsTimelineEvents.sport, sport), eq(sportsTimelineEvents.published, true)))
    .orderBy(
      desc(sportsTimelineEvents.occurredYear),
      sql`${sportsTimelineEvents.occurredMonth} DESC NULLS LAST`,
      sql`${sportsTimelineEvents.occurredDay} DESC NULLS LAST`,
      asc(sportsTimelineEvents.sortOrder),
      asc(sportsTimelineEvents.eventKey),
      asc(sportsTimelineEventSources.url),
    );

  const eventsById = new Map<string, TimelineEvent>();

  for (const row of rows) {
    let event = eventsById.get(row.id);
    if (!event) {
      event = {
        id: row.id,
        eventType: row.eventType as TimelineEvent["eventType"],
        category: row.category,
        occurredYear: row.occurredYear,
        occurredMonth: row.occurredMonth,
        occurredDay: row.occurredDay,
        datePrecision: row.datePrecision as TimelineEvent["datePrecision"],
        athleteNameZh: row.athleteNameZh,
        athleteNameEn: row.athleteNameEn,
        organization: locale === "en" ? row.organizationEn ?? row.organization : row.organization,
        organizationEn: row.organizationEn,
        title: locale === "en" ? row.titleEn ?? row.title : row.title,
        description: locale === "en" ? row.descriptionEn ?? row.description : row.description,
        sources: [],
      };
      eventsById.set(row.id, event);
    }

    event.sources.push({
      url: row.sourceUrl,
      publisher: row.sourcePublisher,
      sourceTitle: row.sourceTitle,
      evidenceNote: row.evidenceNote,
    });
  }

  const groups = new Map<number, TimelineYearGroup>();
  for (const event of eventsById.values()) {
    let group = groups.get(event.occurredYear);
    if (!group) {
      group = { year: event.occurredYear, nbaEvents: [], signingEvents: [] };
      groups.set(event.occurredYear, group);
    }

    if (event.eventType === "athlete_signing") {
      group.signingEvents.push(event);
    } else {
      group.nbaEvents.push(event);
    }
  }

  return [...groups.values()].sort((left, right) => right.year - left.year);
}
