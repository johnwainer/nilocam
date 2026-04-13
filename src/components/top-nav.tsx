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
      {/* background */}
      <rect width="32" height="32" rx="7" fill="#F5F2ED" />

      {/* left ear */}
      <path d="M 9 13.5 L 10.8 6.5 L 13.5 11.5" stroke="#0d0f15" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* right ear */}
      <path d="M 18.5 11.5 L 21.2 6.5 L 23 13.5" stroke="#0d0f15" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* face oval */}
      <ellipse cx="16" cy="18.5" rx="9.5" ry="8.8" stroke="#0d0f15" strokeWidth="1.4" />

      {/* left eye — almond */}
      <path d="M 10.2 17.2 C 10.8 15.4 12.4 14.8 13.6 15.2 C 14.8 15.6 15.2 16.7 14.9 17.4 C 14.4 18.3 11.4 18.3 10.2 17.2 Z"
            stroke="#0d0f15" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      {/* left pupil */}
      <ellipse cx="12.5" cy="16.8" rx="0.9" ry="1.3" fill="#0d0f15" />

      {/* right eye — almond */}
      <path d="M 17.1 17.4 C 16.8 16.7 17.2 15.6 18.4 15.2 C 19.6 14.8 21.2 15.4 21.8 17.2 C 20.6 18.3 17.6 18.3 17.1 17.4 Z"
            stroke="#0d0f15" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      {/* right pupil */}
      <ellipse cx="19.5" cy="16.8" rx="0.9" ry="1.3" fill="#0d0f15" />

      {/* nose — tiny inverted triangle */}
      <path d="M 15.1 20.4 L 16 19.3 L 16.9 20.4 Z" fill="#0d0f15" />

      {/* mouth */}
      <path d="M 15.1 20.4 Q 14.1 21.6 13.2 21.4" stroke="#0d0f15" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 16.9 20.4 Q 17.9 21.6 18.8 21.4" stroke="#0d0f15" strokeWidth="1.1" strokeLinecap="round" />

      {/* whiskers left */}
      <line x1="4.5" y1="19" x2="13.5" y2="19.4" stroke="#0d0f15" strokeWidth="0.75" strokeLinecap="round" opacity="0.6" />
      <line x1="4.8" y1="21" x2="13.5" y2="21.2" stroke="#0d0f15" strokeWidth="0.65" strokeLinecap="round" opacity="0.4" />

      {/* whiskers right */}
      <line x1="18.5" y1="19.4" x2="27.5" y2="19" stroke="#0d0f15" strokeWidth="0.75" strokeLinecap="round" opacity="0.6" />
      <line x1="18.5" y1="21.2" x2="27.2" y2="21" stroke="#0d0f15" strokeWidth="0.65" strokeLinecap="round" opacity="0.4" />
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
