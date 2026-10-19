"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Activity, Boxes, Database, Menu, X } from "lucide-react";

const navItems = [
  { href: "/products/model", label: "商品模型", icon: Boxes },
  { href: "/products", label: "商品数据", icon: Activity },
];

function BrandLockup() {
  return (
    <div className="brand-lockup" aria-label="Fieldnote 运动品牌研究">
      <span className="brand-mark" aria-hidden="true">
        <Activity size={18} strokeWidth={2.1} />
      </span>
      <span>
        <span className="brand-name">FIELDNOTE</span>
        <span className="brand-caption">SPORTS RESEARCH</span>
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <BrandLockup />
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <BrandLockup />
        <p className="nav-label">CATALOG</p>
        <nav className="nav-stack" aria-label="主导航">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === "/products" && pathname.startsWith("/products/") && pathname !== "/products/model");
            return (
              <Link
                key={href}
                className={`nav-link${active ? " active" : ""}`}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-divider" />
        <div className="sidebar-note">
          <div className="sidebar-note-title"><Database size={14} /> Neon 数据源</div>
          <p className="sidebar-note-copy">商品、字段与研究记录保存在项目数据库中。</p>
        </div>
        <div className="sidebar-footer">
          <strong>运动品牌研究工作台</strong>
          SPU · SKU · 证据记录
        </div>
      </aside>

      <div className="app-main">
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
