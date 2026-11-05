import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { ArrowUpRight, MoveRight } from "lucide-react";
import { notFound } from "next/navigation";
import { LicensedPortrait } from "@/components/stars/licensed-portrait";
import { DatabaseConfigurationError } from "@/lib/db";
import { getStarSportPageData, type AthleteProfile, type StarSportPageData } from "@/lib/stars/queries";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "明星档案",
  description: "以来源可追溯的方式整理 Nike 与 Jordan Brand 签名鞋运动员档案。",
};

const sports = [
  { slug: "basketball", label: "篮球" },
  { slug: "football", label: "足球" },
  { slug: "tennis", label: "网球" },
  { slug: "athletics", label: "田径" },
] as const;

export function generateStaticParams() {
  return sports.map(({ slug }) => ({ sport: slug }));
}

function scopeLabel(scope: string) {
  if (scope === "biography" || scope === "career_highlight") return "球员资料";
  if (scope === "signature_line") return "签名鞋资料";
  return "图片来源";
}

function SourceLinks({ athlete }: { athlete: AthleteProfile }) {
  const sources = athlete.sources.filter((source) => ["biography", "career_highlight", "signature_line"].includes(source.claimScope));

  return (
    <div className={styles.sourceLinks} aria-label={`${athlete.nameZh}资料来源`}>
      {sources.map((source) => (
        <a href={source.url} key={`${source.claimScope}-${source.url}`} target="_blank" rel="noopener noreferrer">
          {scopeLabel(source.claimScope)} · {source.publisher}<ArrowUpRight size={12} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function AthleteCredits({ athlete }: { athlete: AthleteProfile }) {
  return (
    <div className={styles.photoCredit}>
      <a href={athlete.portraitSourceUrl} target="_blank" rel="noopener noreferrer">图片：{athlete.portraitCredit}</a>
      <span> · </span>
      <a href={athlete.portraitLicenseUrl} target="_blank" rel="noopener noreferrer">{athlete.portraitLicense}</a>
    </div>
  );
}

function ShoeLine({ athlete }: { athlete: AthleteProfile }) {
  return (
    <div className={styles.shoeLines} aria-label={`${athlete.nameZh}签名鞋系列`}>
      {athlete.shoeLines.map((line) => (
        <div className={styles.shoeLine} key={`${line.brand}-${line.lineName}`}>
          <span className={`${styles.lineStatus} ${line.relationshipStatus === "current" ? styles.lineCurrent : styles.lineHistoric}`}>
            {line.relationshipStatus === "current" ? "持续发布" : "历史系列"}
          </span>
          <strong>{line.lineName}</strong>
          <span>{line.brand}{line.startedYear ? ` · ${line.startedYear} 起` : ""}{line.endedYear ? `–${line.endedYear}` : ""}</span>
          {line.representativeModels.length > 0 && (
            <small>{line.representativeModels.map((model) => model.name).join(" / ")}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function AthleteCard({ athlete, index }: { athlete: AthleteProfile; index: number }) {
  const profileFacts = [
    athlete.league,
    athlete.position,
    athlete.nationality,
    athlete.heightCm ? `${athlete.heightCm} cm` : null,
    athlete.birthDate ? `生于 ${athlete.birthDate}` : null,
  ].filter(Boolean);

  return (
    <article className={styles.athleteCard}>
      <a className={styles.cardPortrait} href={athlete.portraitSourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`查看${athlete.nameZh}照片来源`}>
        <LicensedPortrait
          src={athlete.portraitUrl}
          alt={athlete.portraitAlt}
          className={styles.cardImage}
          sizes="(max-width: 620px) 38vw, (max-width: 1040px) 22vw, 15vw"
        />
        <span className={styles.cardIndex}>{String(index).padStart(2, "0")}</span>
      </a>
      <div className={styles.cardBody}>
        <div className={styles.cardHeading}>
          <div>
            <h3>{athlete.nameZh}</h3>
            <p>{athlete.nameEn}</p>
          </div>
          {athlete.jerseyNumber && <span className={styles.jersey}>#{athlete.jerseyNumber}</span>}
        </div>
        <p className={styles.cardBio}>{athlete.bio}</p>
        <p className={styles.playerMeta}>{profileFacts.join(" · ")}</p>
        {athlete.teamsSummary && <p className={styles.teamMeta}>球队经历 · {athlete.teamsSummary}</p>}
        {athlete.careerHighlights.length > 0 && (
          <ul className={styles.highlights}>
            {athlete.careerHighlights.slice(0, 2).map((highlight) => (
              <li key={`${highlight.value}-${highlight.label}`}><strong>{highlight.value}</strong><span>{highlight.label}</span></li>
            ))}
          </ul>
        )}
        <ShoeLine athlete={athlete} />
        <AthleteCredits athlete={athlete} />
        <SourceLinks athlete={athlete} />
      </div>
    </article>
  );
}

function JordanFeature({ athlete }: { athlete: AthleteProfile }) {
  const biographySource = athlete.sources.find((source) => source.claimScope === "biography");
  return (
    <article className={styles.jordanFeature}>
      <div className={styles.jordanPortrait}>
        <LicensedPortrait src={athlete.portraitUrl} alt={athlete.portraitAlt} className={styles.jordanImage} sizes="(max-width: 780px) 100vw, 44vw" priority />
        {athlete.jerseyNumber && <span className={styles.jordanNumber} aria-hidden="true">{athlete.jerseyNumber}</span>}
        <div className={styles.jordanCredit}><AthleteCredits athlete={athlete} /></div>
      </div>
      <div className={styles.jordanCopy}>
        <p className={styles.eyebrow}>01 / THE ORIGINAL SIGNATURE LINE</p>
        <h2>{athlete.nameZh}<span>{athlete.nameEn}</span></h2>
        <p className={styles.jordanBio}>{athlete.bio}</p>
        <div className={styles.jordanFacts}>
          {[
            athlete.league ? { label: "联盟", value: athlete.league } : null,
            athlete.position ? { label: "位置", value: athlete.position } : null,
            athlete.nationality ? { label: "国籍", value: athlete.nationality } : null,
            athlete.heightCm ? { label: "身高", value: `${(athlete.heightCm / 100).toFixed(2)} m` } : null,
            athlete.birthDate ? { label: "出生", value: athlete.birthDate } : null,
            athlete.teamsSummary ? { label: "效力球队", value: athlete.teamsSummary } : null,
          ].filter((fact): fact is { label: string; value: string } => Boolean(fact)).map((fact) => (
            <div className={styles.jordanFact} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>
          ))}
        </div>
        <div className={styles.jordanHighlights}>
          {athlete.careerHighlights.map((highlight) => (
            <div className={styles.jordanHighlight} key={highlight.label}><strong>{highlight.value}</strong><span>{highlight.label}</span></div>
          ))}
        </div>
        <ShoeLine athlete={athlete} />
        <div className={styles.jordanLinks}>
          {biographySource && <a href={biographySource.url} target="_blank" rel="noopener noreferrer">NBA 球员档案 <ArrowUpRight size={14} aria-hidden="true" /></a>}
          <Link href="/sports/nba">查看 NBA 历史 <MoveRight size={14} aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

function BasketballDirectory({ data }: { data: StarSportPageData }) {
  const jordan = data.athletes.find(({ slug }) => slug === "michael-jordan");
  const roster = data.athletes.filter(({ slug }) => slug !== "michael-jordan");
  const activeCount = data.athletes.filter((athlete) => athlete.shoeLines.some((line) => line.relationshipStatus === "current")).length;
  const currentRoster = roster.filter((athlete) => athlete.shoeLines.some((line) => line.relationshipStatus === "current"));
  const historicalRoster = roster.filter((athlete) => athlete.shoeLines.every((line) => line.relationshipStatus === "historical"));

  if (!jordan) return <p className={styles.status} role="alert">篮球明星数据缺少乔丹代表档案，请检查 Neon 种子数据。</p>;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>ATHLETES / BASKETBALL</p><h1>篮球<span>签名鞋运动员档案</span></h1></div>
      </header>
      <div className={styles.directoryMeta}>
        <span>NBA 球员档案 <strong>{data.athletes.length.toString().padStart(2, "0")}</strong> 位</span>
        <span>当前仍发布系列 <strong>{activeCount.toString().padStart(2, "0")}</strong></span>
        <span>历史系列单独标注</span>
      </div>
      <section aria-label="代表球员档案"><JordanFeature athlete={jordan} /></section>
      <section className={styles.rosterSection} aria-labelledby="roster-heading">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / PLAYER INDEX</p><h2 id="roster-heading">球员目录</h2></div></div>
        <div className={styles.rosterGroup}>
          <div className={styles.groupHeading}><h3>其他持续推出的签名系列</h3><span>{currentRoster.length.toString().padStart(2, "0")} 位 · 乔丹见页首</span></div>
          <div className={styles.rosterGrid}>
            {currentRoster.map((athlete) => <AthleteCard key={athlete.slug} athlete={athlete} index={data.athletes.indexOf(athlete) + 1} />)}
          </div>
        </div>
        <div className={styles.rosterGroup}>
          <div className={styles.groupHeading}><h3>历史签名系列</h3><span>{historicalRoster.length.toString().padStart(2, "0")} 位</span></div>
          <div className={styles.rosterGrid}>
            {historicalRoster.map((athlete) => <AthleteCard key={athlete.slug} athlete={athlete} index={data.athletes.indexOf(athlete) + 1} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function ComingSoon({ data }: { data: StarSportPageData }) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>ATHLETES / {data.nameEn.toUpperCase()}</p><h1>{data.nameZh}<span>明星档案</span></h1></div>
      </header>
      <section className={styles.comingSoon}>
        <span>RESEARCH IN PROGRESS</span>
        <h2>档案建设中</h2>
        <Link href="/stars/basketball">先查看篮球档案 <MoveRight size={15} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}

async function SportContent({ slug }: { slug: string }) {
  await io();
  let data: StarSportPageData | null;
  try {
    data = await getStarSportPageData(slug);
  } catch (error) {
    const message = error instanceof DatabaseConfigurationError
      ? "Neon 数据库尚未配置。请检查数据库连接后重试。"
      : "暂时无法读取 Neon 明星档案，请确认数据库连接和迁移状态后重试。";
    return <p className={styles.status} role="alert">{message}</p>;
  }

  if (!data) notFound();
  return data.contentStatus === "active" ? <BasketballDirectory data={data} /> : <ComingSoon data={data} />;
}

function LoadingState() {
  return <p className={styles.status} role="status">正在读取 Neon 明星档案…</p>;
}

export default async function StarSportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  if (!sports.some(({ slug }) => slug === sport)) notFound();
  return <Suspense fallback={<LoadingState />}><SportContent slug={sport} /></Suspense>;
}
