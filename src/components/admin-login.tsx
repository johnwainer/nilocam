"use client";

import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "@/components/password-input";
import { APP_NAME } from "@/lib/constants";
import { SpyCatIcon } from "@/components/top-nav";

const supabase = createSupabaseBrowserClient();

type Mode = "login" | "access" | "reset";

const copy: Record<Mode, { title: string; subtitle: string; primary: string }> = {
  login: {
    title: "Bienvenido de vuelta.",
    subtitle: "Ingresa con tu correo y contraseña.",
    primary: "Iniciar sesión",
  },
  access: {
    title: "Crea tu cuenta.",
    subtitle: "Empieza gratis. Sin tarjeta de crédito.",
    primary: "Crear cuenta",
  },
  reset: {
    title: "Recuperar contraseña.",
    subtitle: "Te enviamos un enlace a tu correo.",
    primary: "Enviar enlace",
  },
};

const perks = [
  { icon: "⚡", text: "Evento activo en 3 minutos" },
  { icon: "📱", text: "Sin apps para tus invitados" },
  { icon: "🖼", text: "Fotos en pantalla en tiempo real" },
  { icon: "🎨", text: "20+ temas visuales editables" },
  { icon: "🛡", text: "Moderación de fotos incluida" },
];

export function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const inviteEmail = searchParams.get("email");
    const inviteName = searchParams.get("name");
    if (inviteEmail) {
      setMode("access");
      setEmail(inviteEmail);
      if (inviteName) setDisplayName(inviteName);
    }
  }, [searchParams]);

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://memorica.vercel.app";

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setPassword("");
    if (next !== "access") setDisplayName("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setMessage({ text: error.message, ok: false }); return; }
        router.push("/admin");
        router.refresh();
        return;
      }

      if (mode === "access") {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; message?: string }
          | { ok: false; message?: string }
          | null;

        if (!response.ok || !payload?.ok) {
          setMessage({ text: payload?.message || "No pudimos crear el acceso.", ok: false });
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setMessage({ text: error.message, ok: false }); return; }
        router.push("/admin");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset`,
      });
      if (error) { setMessage({ text: error.message, ok: false }); return; }
      setMessage({ text: "Enlace enviado. Revisa tu correo.", ok: true });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={s.root}>

      {/* ── Left panel — branding ── */}
      <div style={s.left} className="auth-left">
        <Link href="/" style={s.leftBrand}>
          <SpyCatIcon size={28} />
          <strong style={s.leftBrandName}>{APP_NAME}</strong>
        </Link>

        <div style={s.leftBody}>
          <p style={s.leftEyebrow}>Galería de eventos en vivo</p>
          <h2 style={s.leftTitle}>
            Un QR.<br />
            Una galería.<br />
            Tu evento.
          </h2>
          <ul style={s.perkList}>
            {perks.map((p) => (
              <li key={p.text} style={s.perkItem}>
                <span style={s.perkIcon}>{p.icon}</span>
                <span style={s.perkText}>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p style={s.leftFooter}>
          <Link href="/#precios" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
            Ver precios →
          </Link>
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div style={s.right}>
        {/* Mobile-only header */}
        <div style={s.mobileHeader} className="auth-mobile-header">
          <Link href="/" style={s.mobileHeaderBrand}>
            <SpyCatIcon size={26} />
            <strong style={{ fontSize: 15, letterSpacing: "-0.02em" }}>{APP_NAME}</strong>
          </Link>
        </div>

        <div style={s.formArea} className="auth-form-area">
          {/* Heading */}
          <div style={s.heading}>
            <h1 style={s.title}>{copy[mode].title}</h1>
            <p style={s.subtitle}>{copy[mode].subtitle}</p>
          </div>

          {/* Tab toggle */}
          {mode !== "reset" && (
            <div style={s.segment}>
              <button
                type="button"
                style={{ ...s.segBtn, ...(mode === "login" ? s.segActive : {}) }}
                onClick={() => switchMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                style={{ ...s.segBtn, ...(mode === "access" ? s.segActive : {}) }}
                onClick={() => switchMode("access")}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {/* Form */}
          {/* suppressHydrationWarning on inputs: browsers (and password managers)
              may auto-fill fields before React hydrates, causing a text-content
              mismatch. This is expected behaviour; suppressing is correct here. */}
          <form onSubmit={submit} style={s.form}>
            {mode === "access" && (
              <label style={s.fieldWrap}>
                <span className="label">Nombre visible</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  suppressHydrationWarning
                />
              </label>
            )}

            <label style={s.fieldWrap}>
              <span className="label">Correo electrónico</span>
              <input
                className="input"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                suppressHydrationWarning
              />
            </label>

            {mode !== "reset" && (
              <label style={s.fieldWrap}>
                <span className="label">Contraseña</span>
                <PasswordInput
                  className="input"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "access" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </label>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSending}
              style={s.submitBtn}
            >
              {isSending ? "Procesando…" : copy[mode].primary}
            </button>
          </form>

          {/* Contextual links */}
          <div style={s.formFooter}>
            {mode === "login" && (
              <button type="button" style={s.textBtn} onClick={() => switchMode("reset")}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {mode === "reset" && (
              <button type="button" style={s.textBtn} onClick={() => switchMode("login")}>
                ← Volver a iniciar sesión
              </button>
            )}
            {mode === "access" && (
              <p style={s.legalNote}>
                Al crear una cuenta aceptas los{" "}
                <Link href="/terms" style={{ color: "inherit", fontWeight: 600 }}>Términos de servicio</Link>
                {" "}y la{" "}
                <Link href="/privacy" style={{ color: "inherit", fontWeight: 600 }}>Política de privacidad</Link>.
              </p>
            )}
          </div>

          {message && (
            <div style={{ ...s.alert, ...(message.ok ? s.alertOk : s.alertErr) }}>
              {message.text}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100dvh",
  },

  /* ── Left panel ── */
  left: {
    width: 420,
    flexShrink: 0,
    background: "#0b0b0f",
    display: "flex",
    flexDirection: "column",
    padding: "32px 40px 40px",
    position: "sticky" as const,
    top: 0,
    height: "100dvh",
    overflowY: "auto",
  },
  leftBrand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    flexShrink: 0,
  },
  leftBrandName: {
    fontSize: 15,
    color: "#ffffff",
    letterSpacing: "-0.02em",
  },
  leftBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 28,
    paddingTop: 40,
  },
  leftEyebrow: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.35)",
  },
  leftTitle: {
    margin: 0,
    fontSize: "clamp(36px, 3.2vw, 52px)",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.05em",
    color: "#ffffff",
  },
  perkList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  perkItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  perkIcon: {
    fontSize: 16,
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: {
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.3,
  },
  leftFooter: {
    margin: 0,
    fontSize: 13,
    flexShrink: 0,
  },

  /* ── Right panel ── */
  right: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "#f5f5f7",
  },
  mobileHeader: {
    display: "none",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    background: "#ffffff",
  },
  mobileHeaderBrand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "inherit",
  },
  formArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "48px 32px",
    maxWidth: 460,
    margin: "0 auto",
    width: "100%",
    gap: 20,
  },

  /* ── Form ── */
  heading: {
    display: "grid",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: "clamp(28px, 4vw, 40px)",
    lineHeight: 1,
    margin: 0,
    letterSpacing: "-0.04em",
    fontWeight: 800,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    color: "var(--muted)",
  },
  segment: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "rgba(0,0,0,0.05)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--muted)",
    transition: "all 180ms ease",
  },
  segActive: {
    background: "#ffffff",
    color: "#111111",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
  },
  form: {
    display: "grid",
    gap: 14,
  },
  fieldWrap: {
    display: "grid",
    gap: 6,
  },
  submitBtn: {
    width: "100%",
    marginTop: 4,
    padding: "15px 20px",
    fontSize: 15,
    fontWeight: 800,
  },
  formFooter: {
    display: "flex",
    justifyContent: "center",
    marginTop: -8,
  },
  textBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "var(--muted)",
    padding: "4px 8px",
  },
  legalNote: {
    margin: 0,
    fontSize: 12,
    color: "var(--muted)",
    lineHeight: 1.6,
    textAlign: "center" as const,
  },
  alert: {
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.55,
  },
  alertOk: {
    background: "rgba(5,150,105,0.08)",
    border: "1px solid rgba(5,150,105,0.2)",
    color: "#065f46",
  },
  alertErr: {
    background: "rgba(200,50,50,0.06)",
    border: "1px solid rgba(200,50,50,0.18)",
    color: "#8b1a1a",
  },
};
