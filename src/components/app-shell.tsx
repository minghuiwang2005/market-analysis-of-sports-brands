"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

const navGroups = [
  {
    label: "商品",
    id: "products-menu",
    items: [
      { href: "/products", label: "商品数据" },
      { href: "/products/model", label: "商品模型" },
      { href: "/products/sales", label: "销售数据" },
    ],
  },
  {
    label: "运动",
    id: "sports-menu",
    items: [{ href: "/sports/nba", label: "NBA" }],
  },
  {
    label: "明星",
    id: "stars-menu",
    items: [
      { href: "/stars/basketball", label: "篮球" },
      { href: "/stars/football", label: "足球" },
      { href: "/stars/tennis", label: "网球" },
      { href: "/stars/athletics", label: "田径" },
    ],
  },
  {
    label: "分析",
    id: "analysis-menu",
    items: [{ href: "/analysis", label: "数据分析" }],
  },
  {
    label: "配置",
    id: "settings-menu",
    items: [
      { href: "/settings/models", label: "模型参数" },
      { href: "/settings/schedules", label: "定时配置" },
    ],
  },
] as const;

function BrandLockup({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link className="brand-lockup" href="/products" aria-label="Nike & NBA 商品数据平台首页" onClick={onNavigate}>
      <span className="brand-kicker">Nike & NBA</span>
      <strong className="brand-title">商品数据平台</strong>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loginPage = pathname === "/login";
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  if (loginPage) return <>{children}</>;

  return (
    <div className="app-layout">
      <header className="site-header">
        <BrandLockup onNavigate={() => { setOpenMenu(null); setMobileOpen(false); }} />

        <nav
          ref={navigationRef}
          id="primary-navigation"
          className={`top-navigation${mobileOpen ? " mobile-open" : ""}`}
          aria-label="主导航"
          onKeyDown={(event) => {
            if (event.key === "Escape" && openMenu) {
              event.preventDefault();
              triggerRefs.current[openMenu]?.focus();
              setOpenMenu(null);
            }
          }}
        >
          {navGroups.map((group) => {
            const activeGroup = group.items.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
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
                  {group.label}
                  <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="nav-dropdown" id={group.id} hidden={!expanded}>
                  {group.items.map(({ href, label }) => {
                    const active = pathname === href;
                    return (
                      <Link
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
                      </Link>
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
          aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          onClick={() => {
            setMobileOpen((open) => !open);
            setOpenMenu(null);
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button type="button" className="logout-button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }}>退出</button>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
