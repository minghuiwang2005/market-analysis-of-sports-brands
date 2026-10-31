import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "球星 · 迈克尔·乔丹",
  description: "迈克尔·乔丹的球员档案、生涯成就与 Air Jordan 代表性签名球鞋。",
};

const shoes = [
  {
    name: "Air Jordan 1",
    year: "1985",
    designer: "Peter Moore",
    description: "Air Jordan 签名鞋系列的起点，以鲜明的篮球鞋轮廓进入大众视野。",
    image: "/images/stars/air-jordan-1.jpg",
    alt: "红白黑配色的 Air Jordan 1 球鞋资料照片",
    source: "https://www.nike.com/jordan/air-jordan-1",
  },
  {
    name: "Air Jordan 3",
    year: "1988",
    designer: "Tinker Hatfield",
    description: "Tinker Hatfield 首次为这一系列操刀；爆裂纹与 Jumpman 标志成为重要设计语言。",
    image: "/images/stars/air-jordan-3.jpg",
    alt: "白色和水泥灰配色的 Air Jordan 3 球鞋资料照片",
    source: "https://www.nike.com/jordan/air-jordan-3",
  },
  {
    name: "Air Jordan 11",
    year: "1995",
    designer: "Tinker Hatfield",
    description: "漆皮鞋面让这款回归赛场时期的签名鞋兼具运动性能与鲜明外观。",
    image: "/images/stars/air-jordan-11.jpg",
    alt: "黑红配色的 Air Jordan 11 球鞋资料照片",
    source: "https://www.nike.com/jordan/air-jordan-11",
  },
  {
    name: "Air Jordan 13",
    year: "1997",
    designer: "Tinker Hatfield",
    description: "以“黑猫”为灵感，鞋底借鉴豹爪形态，并采用全息装饰细节。",
    image: "/images/stars/air-jordan-13.jpg",
    alt: "白黑红配色的 Air Jordan 13 球鞋资料照片",
    source: "https://www.nike.com/jordan/air-jordan-13",
  },
] as const;

const facts = [
  { label: "出生", value: "1963.02.17" },
  { label: "场上位置", value: "后卫" },
  { label: "身高", value: "1.98 m" },
  { label: "NBA 球队", value: "公牛 / 奇才" },
] as const;

const achievements = [
  { number: "6", label: "NBA 总冠军" },
  { number: "5", label: "常规赛 MVP" },
  { number: "14", label: "全明星入选" },
  { number: "30.1", label: "生涯场均得分" },
] as const;

const imageCredits = [
  { label: "乔丹照片", author: "Steve Lipofsky / Basketballphoto.com", href: "https://commons.wikimedia.org/wiki/File:Steve_Lipfosky_--_Michael_Jordan_(1997)_(cropped)_3x4.jpg", license: "CC BY-SA 3.0", licenseHref: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { label: "Air Jordan 1", author: "Osyffar", href: "https://commons.wikimedia.org/wiki/File:Nike_Air_Jordan_I.jpg", license: "CC0 1.0", licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { label: "Air Jordan 3", author: "2Pacalyp", href: "https://commons.wikimedia.org/wiki/File:Air_Jordan_III,_(White_Cement_Colorway).jpg", license: "CC BY-SA 4.0", licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { label: "Air Jordan 11", author: "2Pacalyp / Fourthords", href: "https://commons.wikimedia.org/wiki/File:Air_Jordan_XI_(cropped).jpg", license: "CC BY-SA 4.0", licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { label: "Air Jordan 13", author: "2Pacalyp / Fourthords", href: "https://commons.wikimedia.org/wiki/File:Nike_Air_Jordan_XIII_(cropped).jpg", license: "CC BY-SA 4.0", licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/" },
] as const;

export default function StarsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="star-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>ATHLETE PROFILE <span>01 / MICHAEL JORDAN</span></p>
          <h1 id="star-title">迈克尔·乔丹<span>Michael Jordan</span></h1>
          <p className={styles.heroLead}>从 23 号球衣到 Air Jordan，<br />一位球员如何改变篮球与球鞋文化。</p>
          <p className={styles.heroDescription}>
            乔丹曾效力于芝加哥公牛和华盛顿奇才，以六次 NBA 总冠军、五次常规赛 MVP 和十次得分王写下职业生涯。
            Nike 以他的名字推出的 Air Jordan 签名鞋系列，也成为篮球鞋历史中的长期标志。
          </p>
          <div className={styles.heroLinks}>
            <a href="https://www.nba.com/news/history-nba-legend-michael-jordan" target="_blank" rel="noopener noreferrer">
              NBA 球员档案 <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <Link href="/sports/nba">查看 NBA 历史 <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <span className={styles.heroNumber} aria-hidden="true">23</span>
        </div>
        <figure className={styles.portrait}>
          <Image
            src="/images/stars/michael-jordan.jpg"
            alt="1997 年身穿芝加哥公牛队球衣、手持篮球的迈克尔·乔丹"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 43vw"
            className={styles.portraitImage}
          />
          <figcaption>1997 年 · 芝加哥公牛 · 摄影 Steve Lipofsky</figcaption>
        </figure>
      </section>

      <section className={styles.overview} aria-labelledby="profile-heading">
        <div className={styles.overviewTitle}>
          <span className={styles.sectionIndex}>01 / PROFILE</span>
          <h2 id="profile-heading">球员档案</h2>
          <p>基本资料与职业生涯的关键数字</p>
        </div>
        <div className={styles.factGrid}>
          {facts.map((fact) => (
            <div className={styles.fact} key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
        <div className={styles.achievementGrid}>
          {achievements.map((achievement) => (
            <div className={styles.achievement} key={achievement.label}>
              <strong>{achievement.number}</strong>
              <span>{achievement.label}</span>
            </div>
          ))}
        </div>
        <p className={styles.dataSource}>
          生涯数据来源：<a href="https://www.nba.com/news/history-nba-legend-michael-jordan" target="_blank" rel="noopener noreferrer">NBA Legends Profile <ArrowUpRight size={13} aria-hidden="true" /></a>、
          <a href="https://www.nba.com/stats/player/893" target="_blank" rel="noopener noreferrer">NBA 球员统计 <ArrowUpRight size={13} aria-hidden="true" /></a>。
        </p>
      </section>

      <section className={styles.shoeSection} aria-labelledby="shoes-heading">
        <div className={styles.shoeHeading}>
          <div>
            <span className={styles.sectionIndex}>02 / SIGNATURE SHOES</span>
            <h2 id="shoes-heading">签名球鞋</h2>
          </div>
          <p>精选 Air Jordan 系列四款代表性鞋型。年份为型号初次推出时间；图片为鞋款资料照片，不代表当年的首发实物。</p>
        </div>
        <div className={styles.shoeGrid}>
          {shoes.map((shoe, index) => (
            <article className={styles.shoeCard} key={shoe.name}>
              <div className={styles.shoeImageWrap}>
                <Image src={shoe.image} alt={shoe.alt} fill sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 25vw" className={styles.shoeImage} />
                <span className={styles.shoeIndex}>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className={styles.shoeBody}>
                <div className={styles.shoeMeta}><span>初发 {shoe.year}</span><span>NIKE / JORDAN</span></div>
                <h3>{shoe.name}</h3>
                <p>{shoe.description}</p>
                <div className={styles.shoeFooter}>
                  <span>设计 {shoe.designer}</span>
                  <a href={shoe.source} target="_blank" rel="noopener noreferrer" aria-label={`查看 ${shoe.name} 的 Nike 官方档案`}>
                    Nike 档案 <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.credits} aria-label="图片来源与许可">
        <h2>图片来源与许可</h2>
        <p>页面使用 Wikimedia Commons 的授权照片；图片在页面容器内按比例裁切显示，原始文件未修改。</p>
        <ul>
          {imageCredits.map((credit) => (
            <li key={credit.label}>
              <a href={credit.href} target="_blank" rel="noopener noreferrer">{credit.label}</a>
              <span> · {credit.author} · </span>
              <a href={credit.licenseHref} target="_blank" rel="noopener noreferrer">{credit.license}</a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
