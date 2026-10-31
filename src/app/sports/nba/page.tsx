import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";
import { ArrowUpRight } from "lucide-react";
import { getSportsTimelineGroups, type TimelineEvent } from "@/lib/sports-timeline/queries";
import { DatabaseConfigurationError } from "@/lib/db";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "NBA 历史时间轴",
  description: "从现在回看 NBA 自 1946 年以来的重要事件与 Nike、Jordan 球星合作。",
};

const categories = [
  { id: "league", label: "联盟发展" },
  { id: "rules", label: "规则与赛制" },
  { id: "people", label: "人物与突破" },
  { id: "global", label: "全球传播" },
  { id: "culture", label: "篮球生态" },
] as const;

function formatEventDate(event: TimelineEvent) {
  if (event.datePrecision === "day" && event.occurredMonth && event.occurredDay) {
    return `${event.occurredYear} 年 ${event.occurredMonth} 月 ${event.occurredDay} 日`;
  }
  if (event.datePrecision === "month" && event.occurredMonth) {
    return `${event.occurredYear} 年 ${event.occurredMonth} 月`;
  }
  return `${event.occurredYear} 年`;
}

function formatDateTime(event: TimelineEvent) {
  const year = String(event.occurredYear);
  const month = event.occurredMonth?.toString().padStart(2, "0");
  const day = event.occurredDay?.toString().padStart(2, "0");

  if (event.datePrecision === "day" && month && day) return `${year}-${month}-${day}`;
  if (event.datePrecision === "month" && month) return `${year}-${month}`;
  return year;
}

function EventCard({ event }: { event: TimelineEvent }) {
  const isSigning = event.eventType === "athlete_signing";
  const categoryLabel = categories.find((category) => category.id === event.category)?.label;

  return (
    <article
      className={styles.eventCard}
      data-category={event.category}
      data-event-type={event.eventType}
    >
      <div className={styles.eventMeta}>
        <span className={styles.eventCategory}>
          {isSigning ? "球星签约" : categoryLabel ?? "NBA 大事件"}
        </span>
        <time dateTime={formatDateTime(event)}>{formatEventDate(event)}</time>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <ul className={styles.sources} aria-label="资料来源">
        {event.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${source.publisher}：${source.sourceTitle}（在新窗口打开）`}
            >
              {source.publisher} <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

async function TimelineContent() {
  await io();

  let groups: Awaited<ReturnType<typeof getSportsTimelineGroups>>;
  try {
    groups = await getSportsTimelineGroups("nba");
  } catch (error) {
    const message = error instanceof DatabaseConfigurationError
      ? "Neon 数据库尚未配置。请检查数据库连接后重试。"
      : "暂时无法读取 Neon 时间轴数据，请确认数据库连接和迁移状态后重试。";

    return <p className={styles.timelineStatus} role="alert">{message}</p>;
  }

  if (groups.length === 0) {
    return <p className={styles.timelineStatus}>暂时没有可展示的 NBA 时间轴资料。</p>;
  }

  return (
    <>
      <div className={styles.trackLabels} aria-hidden="true">
        <span>NBA 大事件</span>
        <span>年份</span>
        <span>球星签约 / 合作公告</span>
      </div>
      <ol className={styles.timeline} aria-label="按年份倒序排列的 NBA 历史和球星签约事件">
        {groups.map((group) => (
          <li className={styles.yearGroup} key={group.year}>
            <div className={styles.yearMarker}>
              <span className={styles.yearNode} aria-hidden="true" />
              <time className={styles.yearLabel} dateTime={String(group.year)}>
                {group.year}
              </time>
            </div>
            <div className={styles.nbaLane} role="group" aria-label={`${group.year} 年 NBA 大事件`}>
              {group.nbaEvents.map((event) => <EventCard event={event} key={event.id} />)}
            </div>
            <div className={styles.signingLane} role="group" aria-label={`${group.year} 年球星签约事件`}>
              {group.signingEvents.map((event) => <EventCard event={event} key={event.id} />)}
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.sourceNote}>
        联盟事件与球星签约资料均来自卡片所列来源。日期仅显示来源能够支持的年份、年月或完整日期；合作公告日不代表未公开的合同签署日。
      </p>
    </>
  );
}

function TimelineLoading() {
  return <p className={styles.timelineStatus} role="status">正在读取 Neon 时间轴资料…</p>;
}

export default function NbaPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="nba-title">
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>SPORTS / NBA HISTORY</p>
          <h1 className={styles.heroTitle} id="nba-title">NBA</h1>
          <p className={styles.heroSubtitle}>一部不断延伸的篮球史</p>
          <p className={styles.heroDescription}>
            NBA（National Basketball Association，美国职业篮球联赛）是北美职业篮球联盟。
            它的前身 BAA 于 1946 年成立，并在 1949 年与 NBL 合并，形成现代 NBA。
          </p>
          <a className={styles.heroSource} href="https://www.nba.com/news/about" target="_blank" rel="noopener noreferrer">
            了解 NBA 官方介绍 <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <span>1946</span>
          <i />
          <span>2026</span>
        </div>
      </section>

      <section className={styles.intro} aria-label="NBA 历史概览">
        <div className={styles.introLead}>
          <span className={styles.sectionNumber}>01 / OVERVIEW</span>
          <h2>从一场比赛，<br />到全球篮球文化。</h2>
        </div>
        <p>
          时间轴以中线为界：左侧记录 NBA 联盟大事件，右侧记录 Nike 与 Jordan Brand 球星合作。
          年份从现在向下回溯至 1946 年，事件条目附有来源，便于查阅与核对。
        </p>
      </section>

      <section className={styles.history} aria-labelledby="nba-history-title">
        <div className={styles.historyHeader}>
          <div>
            <span className={styles.sectionNumber}>02 / TIMELINE</span>
            <h2 id="nba-history-title">从现在回望 1946</h2>
            <p>联盟历史 × 球星合作 · 由近及远</p>
          </div>
          <div className={styles.legend} aria-label="NBA 事件颜色图例">
            {categories.map((category) => (
              <span className={styles.legendItem} data-category={category.id} key={category.id}>
                <span className={styles.legendDot} aria-hidden="true" />
                {category.label}
              </span>
            ))}
            <span className={styles.legendItem} data-event-type="athlete_signing">
              <span className={styles.legendDot} aria-hidden="true" />
              球星签约
            </span>
          </div>
        </div>

        <Suspense fallback={<TimelineLoading />}>
          <TimelineContent />
        </Suspense>
      </section>
    </div>
  );
}
