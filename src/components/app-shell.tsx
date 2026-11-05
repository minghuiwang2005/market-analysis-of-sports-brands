"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { LocaleLink } from "@/lib/i18n/locale-link";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const navGroups: { label: TranslationKey; id: string; items: { href: string; label: TranslationKey }[] }[] = [
  {
    label: "nav.products",
    id: "products-menu",
    items: [
      { href: "/products", label: "nav.productData" },
      { href: "/products/model", label: "nav.productModel" },
      { href: "/products/sales", label: "nav.salesData" },
    ],
  },
  {
    label: "nav.sports",
    id: "sports-menu",
    items: [{ href: "/sports/nba", label: "nav.nba" }],
  },
  {
    label: "nav.stars",
    id: "stars-menu",
    items: [
      { href: "/stars/basketball", label: "nav.basketball" },
      { href: "/stars/football", label: "nav.football" },
      { href: "/stars/tennis", label: "nav.tennis" },
      { href: "/stars/athletics", label: "nav.athletics" },
    ],
  },
  {
    label: "nav.analysis",
    id: "analysis-menu",
    items: [{ href: "/analysis", label: "nav.dataAnalysis" }],
  },
  {
    label: "nav.settings",
    id: "settings-menu",
    items: [
      { href: "/settings/models", label: "nav.modelSettings" },
      { href: "/settings/schedules", label: "nav.schedules" },
    ],
  },
];

function BrandLockup({ onNavigate, label, title }: { onNavigate: () => void; label: string; title: string }) {
  return (
    <LocaleLink className="brand-lockup" href="/products" aria-label={label} onClick={onNavigate}>
      <span className="brand-kicker">Nike & NBA</span>
      <strong className="brand-title">{title}</strong>
    </LocaleLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const publicPathname = pathname.replace(/^\/(?:zh|en)(?=\/|$)/, "") || "/";
  const router = useRouter();
  const { locale, t } = useLocale();
  const loginPage = publicPathname === "/login";
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localeError, setLocaleError] = useState("");

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (navigationRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setOpenMenu(null);
      setMobileOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const changeLanguage = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    setLocaleError("");
    try {
      const response = await fetch("/api/preferences/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("locale preference rejected");
      window.location.reload();
    } catch {
      setLocaleError(t("common.languageSwitchFailed"));
    }
  };

  if (loginPage) return <>{children}</>;

  return (
    <div className="app-layout">
      <header className="site-header">
        <BrandLockup label={t("nav.brandHome")} title={t("nav.brandTitle")} onNavigate={() => { setOpenMenu(null); setMobileOpen(false); }} />

        <nav
          ref={navigationRef}
          id="primary-navigation"
          className={`top-navigation${mobileOpen ? " mobile-open" : ""}`}
          aria-label={t("nav.mainNavigation")}
          onKeyDown={(event) => {
            if (event.key === "Escape" && openMenu) {
              event.preventDefault();
              triggerRefs.current[openMenu]?.focus();
              setOpenMenu(null);
            }
          }}
        >
          {navGroups.map((group) => {
            const activeGroup = group.items.some(({ href }) => publicPathname === href || publicPathname.startsWith(`${href}/`));
            const expanded = openMenu === group.id;

            return (
              <div
                key={group.id}
                className="nav-group"
                onMouseEnter={() => {
                  if (window.matchMedia("(min-width: 801px)").matches) setOpenMenu(group.id);
                }}
                onMouseLeave={() => {
                  if (window.matchMedia("(min-width: 801px)").matches) setOpenMenu(null);
                }}
                onFocus={() => {
                  if (window.matchMedia("(min-width: 801px)").matches) setOpenMenu(group.id);
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenMenu(null);
                }}
              >
                <button
                  ref={(button) => { triggerRefs.current[group.id] = button; }}
                  type="button"
                  className={`nav-trigger${activeGroup ? " active" : ""}`}
                  aria-expanded={expanded}
                  aria-controls={group.id}
                  onClick={() => {
                    if (window.matchMedia("(max-width: 800px)").matches) {
                      setOpenMenu((current) => current === group.id ? null : group.id);
                    } else {
                      setOpenMenu(group.id);
                    }
                  }}
                >
                  {t(group.label)}
                  <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="nav-dropdown" id={group.id} hidden={!expanded}>
                  {group.items.map(({ href, label }) => {
                    const active = publicPathname === href;
                    return (
                      <LocaleLink
                        key={href}
                        className={`nav-dropdown-link${active ? " active" : ""}`}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          setOpenMenu(null);
                          setMobileOpen(false);
                        }}
                      >
                        {label}
                      </LocaleLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="mobile-menu-button"
          aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          onClick={() => {
            setMobileOpen((open) => !open);
            setOpenMenu(null);
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="language-switch" role="group" aria-label={t("nav.switchLanguage")}>
          <button type="button" aria-pressed={locale === "zh"} onClick={() => void changeLanguage("zh")}>{t("common.languageChinese")}</button>
          <button type="button" aria-pressed={locale === "en"} onClick={() => void changeLanguage("en")}>{t("common.languageEnglish")}</button>
        </div>
        <button type="button" className="logout-button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }}>{t("common.logout")}</button>
      </header>

      {localeError && <p className="language-error" role="status">{localeError}</p>}

      <main className="main-content">{children}</main>
    </div>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
