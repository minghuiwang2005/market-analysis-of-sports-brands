import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  athleteShoeLines,
  athleteSources,
  starAthletes,
  starSports,
  type AthleteCareerHighlight,
  type AthleteRepresentativeModel,
} from "@/lib/db/schema";

export type AthleteShoeLine = {
  brand: string;
  lineName: string;
  relationshipStatus: "current" | "historical";
  startedYear: number | null;
  endedYear: number | null;
  representativeModels: AthleteRepresentativeModel[];
};

export type AthleteProfile = {
  slug: string;
  nameZh: string;
  nameEn: string;
  league: string | null;
  position: string | null;
  teamsSummary: string | null;
  nationality: string | null;
  birthDate: string | null;
  heightCm: number | null;
  jerseyNumber: string | null;
  bio: string;
  portraitUrl: string;
  portraitAlt: string;
  portraitSourceUrl: string;
  portraitCredit: string;
  portraitLicense: string;
  portraitLicenseUrl: string;
  careerHighlights: AthleteCareerHighlight[];
  shoeLines: AthleteShoeLine[];
  sources: { url: string; publisher: string; title: string; claimScope: string }[];
};

export type StarSportPageData = {
  slug: string;
  nameZh: string;
  nameEn: string;
  intro: string | null;
  contentStatus: "active" | "coming_soon";
  athletes: AthleteProfile[];
};

export async function getStarSportPageData(slug: string): Promise<StarSportPageData | null> {
  const db = getDatabase();
  const [sport] = await db.select().from(starSports).where(eq(starSports.slug, slug)).limit(1);
  if (!sport) return null;

  const athleteRows = await db
    .select()
    .from(starAthletes)
    .where(and(eq(starAthletes.sportId, sport.id), eq(starAthletes.published, true)))
    .orderBy(asc(starAthletes.sortOrder), asc(starAthletes.nameEn));

  if (athleteRows.length === 0) {
    if (sport.slug === "basketball" && sport.contentStatus === "active") {
      throw new Error("篮球明星目录处于开放状态，但 Neon 中没有已发布球员资料。");
    }
    return {
      slug: sport.slug,
      nameZh: sport.nameZh,
      nameEn: sport.nameEn,
      intro: sport.intro,
      contentStatus: sport.contentStatus as StarSportPageData["contentStatus"],
      athletes: [],
    };
  }

  const athleteIds = athleteRows.map(({ id }) => id);
  const [shoeRows, sourceRows] = await Promise.all([
    db
      .select()
      .from(athleteShoeLines)
      .where(inArray(athleteShoeLines.athleteId, athleteIds))
      .orderBy(asc(athleteShoeLines.athleteId), asc(athleteShoeLines.sortOrder)),
    db
      .select({
        athleteId: athleteSources.athleteId,
        claimScope: athleteSources.claimScope,
        url: athleteSources.sourceUrl,
        publisher: athleteSources.publisher,
        title: athleteSources.title,
      })
      .from(athleteSources)
      .where(and(inArray(athleteSources.athleteId, athleteIds), eq(athleteSources.verificationStatus, "verified"))),
  ]);

  const linesByAthlete = new Map<string, AthleteShoeLine[]>();
  for (const line of shoeRows) {
    const lines = linesByAthlete.get(line.athleteId) ?? [];
    lines.push({
      brand: line.brand,
      lineName: line.lineName,
      relationshipStatus: line.relationshipStatus as AthleteShoeLine["relationshipStatus"],
      startedYear: line.startedYear,
      endedYear: line.endedYear,
      representativeModels: line.representativeModels,
    });
    linesByAthlete.set(line.athleteId, lines);
  }

  const verifiedScopes = new Map<string, Set<string>>();
  const sourcesByAthlete = new Map<string, AthleteProfile["sources"]>();
  for (const source of sourceRows) {
    const scopes = verifiedScopes.get(source.athleteId) ?? new Set<string>();
    scopes.add(source.claimScope);
    verifiedScopes.set(source.athleteId, scopes);
    const sources = sourcesByAthlete.get(source.athleteId) ?? [];
    sources.push({ url: source.url, publisher: source.publisher, title: source.title, claimScope: source.claimScope });
    sourcesByAthlete.set(source.athleteId, sources);
  }

  const athletes = athleteRows
    .filter((athlete) => {
      const scopes = verifiedScopes.get(athlete.id);
      return Boolean(
        scopes?.has("signature_line") &&
        scopes.has("portrait") &&
        scopes.has("image_license") &&
        (linesByAthlete.get(athlete.id)?.length ?? 0) > 0,
      );
    })
    .map((athlete) => ({
      slug: athlete.slug,
      nameZh: athlete.nameZh,
      nameEn: athlete.nameEn,
      league: athlete.league,
      position: athlete.position,
      teamsSummary: athlete.teamsSummary,
      nationality: athlete.nationality,
      birthDate: athlete.birthDate,
      heightCm: athlete.heightCm,
      jerseyNumber: athlete.jerseyNumber,
      bio: athlete.bio,
      portraitUrl: athlete.portraitUrl!,
      portraitAlt: athlete.portraitAlt!,
      portraitSourceUrl: athlete.portraitSourceUrl!,
      portraitCredit: athlete.portraitCredit!,
      portraitLicense: athlete.portraitLicense!,
      portraitLicenseUrl: athlete.portraitLicenseUrl!,
      careerHighlights: athlete.careerHighlights,
      shoeLines: linesByAthlete.get(athlete.id) ?? [],
      sources: sourcesByAthlete.get(athlete.id) ?? [],
    }));

  if (sport.slug === "basketball" && sport.contentStatus === "active" && athletes.length < 15) {
    throw new Error(`篮球明星目录仅有 ${athletes.length} 条完成来源核验的球员记录，至少需要 15 条。`);
  }

  return {
    slug: sport.slug,
    nameZh: sport.nameZh,
    nameEn: sport.nameEn,
    intro: sport.intro,
    contentStatus: sport.contentStatus as StarSportPageData["contentStatus"],
    athletes,
  };
}
