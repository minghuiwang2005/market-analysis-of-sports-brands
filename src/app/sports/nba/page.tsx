import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "NBA 历史时间轴",
  description: "了解 NBA 从 1946 年联盟前身成立至今的重要事件与发展脉络。",
};

type EventCategory = "league" | "rules" | "people" | "global" | "culture";

const categories: { id: EventCategory; label: string }[] = [
  { id: "league", label: "联盟发展" },
  { id: "rules", label: "规则与赛制" },
  { id: "people", label: "人物与突破" },
  { id: "global", label: "全球传播" },
  { id: "culture", label: "篮球生态" },
];

const events: {
  year: string;
  date: string;
  title: string;
  description: string;
  category: EventCategory;
  source: string;
}[] = [
  {
    year: "1946",
    date: "6 月 · 联盟前身成立",
    title: "BAA 在纽约成立",
    description: "美国篮球协会（BAA）成立，成为后来 NBA 的前身。同年 11 月，纽约尼克斯与多伦多哈士奇进行了联盟首场比赛。",
    category: "league",
    source: "https://www.nba.com/news/what-were-the-original-nba-teams",
  },
  {
    year: "1949",
    date: "8 月 · 联盟整合",
    title: "BAA 与 NBL 合并",
    description: "BAA 与国家篮球联盟（NBL）合并，现代 NBA 由此形成。",
    category: "league",
    source: "https://www.nba.com/news/about",
  },
  {
    year: "1950",
    date: "球员 · 历史突破",
    title: "黑人球员进入 NBA",
    description: "查克·库珀、纳特·克利夫顿和厄尔·劳埃德分别在选秀、签约与正式比赛中取得开创性突破。",
    category: "people",
    source: "https://www.nba.com/news/history-top-moments-earl-lloyd-chuck-cooper-nat-clifton-new-path-nba",
  },
  {
    year: "1954",
    date: "1954—55 赛季 · 规则革新",
    title: "24 秒进攻计时启用",
    description: "联盟引入 24 秒进攻计时，改变了比赛节奏，也成为现代篮球的核心规则之一。",
    category: "rules",
    source: "https://jr.nba.com/the-birth-of-the-nba/",
  },
  {
    year: "1976",
    date: "1976—77 赛季 · 联盟扩展",
    title: "四支 ABA 球队加入 NBA",
    description: "原 ABA 的篮网、步行者、掘金和马刺加入 NBA，联盟规模与球员版图随之扩大。",
    category: "league",
    source: "https://www.nba.com/news/history-season-review-1976-77",
  },
  {
    year: "1979",
    date: "1979—80 赛季 · 规则革新",
    title: "三分线成为正式规则",
    description: "NBA 正式采用三分球规则，为此后几十年的战术演变打开了新的空间。",
    category: "rules",
    source: "https://www.nba.com/news/history-3-pointer-evolution-nba-game-larry-bird-stephen-curry-james-harden",
  },
  {
    year: "1984",
    date: "选秀 · 传奇球员",
    title: "一届影响深远的选秀",
    description: "迈克尔·乔丹、哈基姆·奥拉朱旺、查尔斯·巴克利和约翰·斯托克顿在这一年进入联盟。",
    category: "people",
    source: "https://www.nba.com/news/history-season-review-1984-85",
  },
  {
    year: "1992",
    date: "巴塞罗那 · 全球传播",
    title: "美国“梦之队”亮相奥运会",
    description: "首次由 NBA 球星组成的美国男篮奥运队夺得金牌，成为篮球走向全球的重要象征。",
    category: "global",
    source: "https://www.nba.com/news/history-top-moments-dream-team-1992",
  },
  {
    year: "1997",
    date: "6 月 · 篮球生态",
    title: "WNBA 首场比赛举行",
    description: "由 NBA 支持创办的 WNBA 开始比赛，为职业女子篮球建立新的舞台。",
    category: "culture",
    source: "https://www.nba.com/news/history-this-date-in-nba-june",
  },
  {
    year: "2001",
    date: "2001—02 赛季 · 篮球生态",
    title: "发展联盟开始比赛",
    description: "NBA Development League（现 NBA G League）开启首个赛季，扩展了球员培养与成长路径。",
    category: "culture",
    source: "https://gleague.nba.com/faq",
  },
  {
    year: "2020",
    date: "3 月—7 月 · 特殊赛季",
    title: "赛季暂停后在单一赛区复赛",
    description: "联盟于 3 月暂停比赛，7 月在佛罗里达州奥兰多附近的单一赛区恢复 2019—20 赛季。",
    category: "league",
    source: "https://www.nba.com/nba-returns-2020-faq",
  },
  {
    year: "2023",
    date: "2023—24 赛季 · 新赛制",
    title: "首届季中锦标赛落幕",
    description: "NBA 首次举办季中锦标赛；洛杉矶湖人赢得首座 NBA 杯。",
    category: "rules",
    source: "https://www.nba.com/news/2023-nba-in-season-tournament-tracker",
  },
  {
    year: "2025",
    date: "2025—26 赛季 · 媒体传播",
    title: "新一轮媒体版权合作开启",
    description: "与迪士尼、NBCUniversal 和亚马逊的长期协议开始实施，NBA 比赛进入新的播出与流媒体分发阶段。",
    category: "global",
    source: "https://pr.nba.com/nba-walt-disney-company-nbcuniversal-amazon-prime-video-media-agreements/",
  },
  {
    year: "2026",
    date: "截至 2026 年 10 月 · 现在",
    title: "走过八十年，故事仍在继续",
    description: "从 1946 年的 BAA 到拥有 30 支球队的 NBA，联盟持续举办常规赛与季后赛，并不断发展篮球文化。",
    category: "league",
    source: "https://www.nba.com/news/about",
  },
];

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
          这条时间轴选取联盟成立、规则革新、球员突破与全球传播等节点，呈现 NBA 的主要发展脉络。
          颜色对应事件类别；每个条目都附有 NBA 官方资料，方便进一步查阅。
        </p>
      </section>

      <section className={styles.history} aria-labelledby="nba-history-title">
        <div className={styles.historyHeader}>
          <div>
            <span className={styles.sectionNumber}>02 / TIMELINE</span>
            <h2 id="nba-history-title">从 1946 到现在</h2>
            <p>精选里程碑 · 按时间顺序排列</p>
          </div>
          <div className={styles.legend} aria-label="事件颜色图例">
            {categories.map((category) => (
              <span className={styles.legendItem} data-category={category.id} key={category.id}>
                <span className={styles.legendDot} aria-hidden="true" />
                {category.label}
              </span>
            ))}
          </div>
        </div>

        <ol className={styles.timeline}>
          {events.map((event) => (
            <li className={styles.event} data-category={event.category} key={`${event.year}-${event.title}`}>
              <span className={styles.eventYear}>{event.year}</span>
              <span className={styles.eventNode} aria-hidden="true" />
              <article className={styles.eventCard}>
                <div className={styles.eventMeta}>
                  <span className={styles.eventCategory}>
                    {categories.find((category) => category.id === event.category)?.label}
                  </span>
                  <span>{event.date}</span>
                </div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <a href={event.source} target="_blank" rel="noopener noreferrer">
                  NBA 官方资料 <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </article>
            </li>
          ))}
        </ol>
        <p className={styles.sourceNote}>资料来源：NBA、NBA G League 官方网站。时间轴为精选事件，更新至 2026 年 10 月。</p>
      </section>
    </div>
  );
}
