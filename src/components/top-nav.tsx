"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AppIcon({ size = 32 }: { size?: number }) {
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
      {/* camera body */}
      <rect x="4" y="12" width="24" height="15" rx="3.5" stroke="#0d0f15" strokeWidth="1.5" />
      {/* viewfinder bump */}
      <path d="M11 12 L11 8.5 Q11 7 12.5 7 L19.5 7 Q21 7 21 8.5 L21 12" stroke="#0d0f15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* shutter button */}
      <circle cx="7" cy="9.5" r="2.2" stroke="#0d0f15" strokeWidth="1.2" />
      <circle cx="7" cy="9.5" r="1" fill="#0d0f15" />
      {/* lens outer */}
      <circle cx="16" cy="19.5" r="5" stroke="#0d0f15" strokeWidth="1.5" />
      {/* lens inner */}
      <circle cx="16" cy="19.5" r="2.4" fill="#0d0f15" />
      {/* lens highlight */}
      <circle cx="14.6" cy="18.2" r="0.8" fill="#F5F2ED" opacity="0.7" />
    </svg>
  );
}

/** @deprecated Use AppIcon */
export const SpyCatIcon = AppIcon;

const supabase = createSupabaseBrowserClient();

export function TopNav() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
    });

    // Keep in sync with auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header style={s.header}>
      <div className="container">
        <nav style={s.nav}>
          {/* Brand */}
          <Link href="/" style={s.brand}>
            <AppIcon size={32} />
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
            <Link href="/#precios" style={s.navLink} className="nav-link">
              Precios
            </Link>
            <Link href="/event/demo-memorica" style={s.navLink} className="nav-link">
              Demo
            </Link>
          </div>

          {/* Actions — swap based on auth state */}
          <div style={s.actions}>
            {loggedIn ? (
              <Link href="/admin" className="btn btn-primary" style={s.cta}>
                Mi panel
              </Link>
            ) : (
              <Link href="/auth" className="btn btn-primary" style={s.cta}>
                Empezar gratis
              </Link>
            )}
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
