"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

function SpyCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="8" fill="#111111" />
      {/* ears */}
      <path
        d="M11 13L8 7L13 9L16 5L19 9L24 7L21 13"
        stroke="#F5F5F7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <circle cx="13" cy="19" r="2.2" fill="#F5F5F7" />
      <circle cx="21" cy="19" r="2.2" fill="#F5F5F7" />
      {/* nose */}
      <path
        d="M15 22C15.8 23 17.2 23 18 22"
        stroke="#F5F5F7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* smile */}
      <path
        d="M11.5 25C13.5 23 18.5 23 20.5 25"
        stroke="#F5F5F7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopNav() {
  return (
    <header style={s.header}>
      <div className="container">
        <nav style={s.nav}>
          {/* Brand */}
          <Link href="/" style={s.brand}>
            <SpyCatIcon size={32} />
            <strong style={s.brandName}>{APP_NAME}</strong>
          </Link>

          {/* Center links */}
          <div className="nav-links" style={s.centerLinks}>
            <Link href="/#como-funciona" style={s.navLink} className="nav-link">
              Cómo funciona
            </Link>
            <Link href="/#tipos" style={s.navLink} className="nav-link">
              Eventos
            </Link>
            <Link href="/event/demo-nilo-cam" style={s.navLink} className="nav-link">
              Demo
            </Link>
          </div>

          {/* Actions */}
          <div style={s.actions}>
            <Link href="/auth" style={s.navLink} className="nav-link nav-link-admin">
              Admin
            </Link>
            <Link href="/auth" className="btn btn-primary" style={s.cta}>
              Empezar
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(245,245,247,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    height: 56,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  brandName: {
    fontSize: 15,
    letterSpacing: "-0.02em",
  },
  centerLinks: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  navLink: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--muted)",
    padding: "6px 12px",
    borderRadius: 999,
    transition: "color 160ms ease, background 160ms ease",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  cta: {
    fontSize: 14,
    padding: "8px 18px",
    fontWeight: 700,
  },
};
