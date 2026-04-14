"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

type Mode = "login" | "access" | "reset";

const copy: Record<Mode, { title: string; subtitle: string; primary: string }> = {
  login: {
    title: "Bienvenido de vuelta.",
    subtitle: "Ingresa con tu correo y contraseña para gestionar eventos y fotos.",
    primary: "Iniciar sesión",
  },
  access: {
    title: "Crear cuenta.",
    subtitle: "Completa los campos para registrarte y acceder al panel.",
    primary: "Crear cuenta",
  },
  reset: {
    title: "Recuperar contraseña.",
    subtitle: "Te enviaremos un enlace a tu correo para restablecerla.",
    primary: "Enviar enlace",
  },
};

export function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Pre-fill from invite link (?email=...&name=...)
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
      : "https://nilocam.vercel.app";

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
    <main style={s.page}>
      <div style={s.wrap}>

        {/* Heading block */}
        <div style={s.heading}>
          <span className="eyebrow">Panel de administración</span>
          <h1 className="serif" style={s.title}>{copy[mode].title}</h1>
          <p className="muted" style={s.subtitle}>{copy[mode].subtitle}</p>
        </div>

        {/* Segmented toggle — only for login / access */}
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

        {/* Form card */}
        <div className="card" style={s.card}>
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
              />
            </label>

            {mode !== "reset" && (
              <label style={s.fieldWrap}>
                <span className="label">Contraseña</span>
                <input
                  className="input"
                  type="password"
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

          {/* Footer links */}
          <div style={s.footer}>
            {mode === "login" && (
              <button
                type="button"
                style={s.footerLink}
                onClick={() => switchMode("reset")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {mode === "reset" && (
              <button
                type="button"
                style={s.footerLink}
                onClick={() => switchMode("login")}
              >
                ← Volver a iniciar sesión
              </button>
            )}
          </div>

          {message && (
            <div style={{ ...s.alert, ...(message.ok ? s.alertOk : s.alertErr) }}>
              {message.text}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 56px)",
    display: "flex",
    alignItems: "center",
    padding: "48px 0 72px",
  },
  wrap: {
    width: "min(420px, calc(100% - 32px))",
    margin: "0 auto",
    display: "grid",
    gap: 20,
  },
  heading: {
    display: "grid",
    gap: 10,
  },
  title: {
    fontSize: "clamp(36px, 5vw, 52px)",
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.05em",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.65,
    margin: 0,
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
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  card: {
    padding: "28px 28px 24px",
    borderRadius: 28,
    display: "grid",
    gap: 20,
    background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,255,255,0.84))",
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
    padding: "14px 20px",
    fontSize: 15,
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    marginTop: -8,
  },
  footerLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "var(--muted)",
    padding: "4px 8px",
  },
  alert: {
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.55,
  },
  alertOk: {
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
  alertErr: {
    background: "rgba(200,50,50,0.06)",
    border: "1px solid rgba(200,50,50,0.18)",
    color: "#8b1a1a",
  },
};
