"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "@/components/password-input";
import { APP_NAME } from "@/lib/constants";
import { SpyCatIcon } from "@/components/top-nav";

const supabase = createSupabaseBrowserClient();

export function PasswordResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Contraseña actualizada. Ya puedes entrar al panel.");
    router.replace("/admin");
    router.refresh();
  };

  return (
    <div style={s.root}>

      {/* Left panel */}
      <div style={s.left} className="auth-left">
        <Link href="/" style={s.leftBrand}>
          <SpyCatIcon size={28} />
          <strong style={s.leftBrandName}>{APP_NAME}</strong>
        </Link>
        <div style={s.leftBody}>
          <h2 style={s.leftTitle}>Nueva<br />contraseña.</h2>
          <p style={s.leftSub}>Define una clave segura para proteger tu cuenta y tus eventos.</p>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.mobileHeader} className="auth-mobile-header">
          <Link href="/" style={s.mobileHeaderBrand}>
            <SpyCatIcon size={26} />
            <strong style={{ fontSize: 15, letterSpacing: "-0.02em" }}>{APP_NAME}</strong>
          </Link>
        </div>

        <div style={s.formArea} className="auth-form-area">
          <div style={s.heading}>
            <h1 style={s.title}>Crea una nueva contraseña.</h1>
            <p style={s.subtitle}>
              Abriste el enlace de recuperación. Define aquí tu nueva clave para volver al panel.
            </p>
          </div>

          <form onSubmit={submit} style={s.form}>
            <label style={s.fieldWrap}>
              <span className="label">Nueva contraseña</span>
              <PasswordInput
                className="input"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label style={s.fieldWrap}>
              <span className="label">Confirmar contraseña</span>
              <PasswordInput
                className="input"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSaving}
              style={s.submitBtn}
            >
              {isSaving ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </form>

          {message && (
            <div style={s.message}>{message}</div>
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
    gap: 20,
  },
  leftTitle: {
    margin: 0,
    fontSize: "clamp(36px, 3.2vw, 52px)",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.05em",
    color: "#ffffff",
  },
  leftSub: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.45)",
  },
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
    lineHeight: 1.65,
    margin: 0,
    color: "var(--muted)",
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
  message: {
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.55,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
};
