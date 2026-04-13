"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

type Mode = "login" | "access" | "reset";

const modeCopy: Record<Mode, { title: string; text: string; primary: string }> = {
  login: {
    title: "Entra al panel",
    text: "Accede con tu correo y contraseña para gestionar eventos, moderación y URLs del QR.",
    primary: "Entrar",
  },
  access: {
    title: "Crear o reparar acceso",
    text: "Si ya existe tu usuario en la base, definimos la contraseña y dejamos la cuenta lista sin confirmaciones.",
    primary: "Crear acceso",
  },
  reset: {
    title: "Recupera tu contraseña",
    text: "Te enviaremos un enlace para restablecerla y volver a entrar al panel.",
    primary: "Enviar enlace",
  },
};

export function AdminLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://nilocam.vercel.app";

  const resetForm = () => {
    setPassword("");
    setMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.push("/admin");
        router.refresh();
        return;
      }

      if (mode === "access") {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            displayName,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok: true; message?: string }
          | { ok: false; message?: string }
          | null;

        if (!response.ok || !payload?.ok) {
          setMessage(payload?.message || "No pudimos crear el acceso.");
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.push("/admin");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset`,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Te enviamos un enlace para restablecer tu contraseña.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="container section">
      <div className="card glass" style={styles.shell}>
        <div style={styles.hero}>
          <span className="eyebrow">Acceso profesional</span>
          <h1 className="serif" style={styles.title}>
            Administra eventos, fotos y QR desde una cuenta normal
          </h1>
          <p className="muted" style={styles.text}>
            El acceso usa email y contraseña, con perfiles guardados en Supabase. Sin links mágicos para entrar al
            panel.
          </p>

          <div style={styles.bullets}>
            <div className="card" style={styles.bullet}>
              <strong>Login simple</strong>
              <span className="muted">Entrar con email y contraseña.</span>
            </div>
            <div className="card" style={styles.bullet}>
              <strong>Registro real</strong>
              <span className="muted">Cuenta vinculada a `profiles` en la DB.</span>
            </div>
            <div className="card" style={styles.bullet}>
              <strong>Recuperación</strong>
              <span className="muted">Enlace para restablecer contraseña cuando lo necesites.</span>
            </div>
          </div>
        </div>

          <div className="card glass" style={styles.formCard}>
          <div style={styles.tabs}>
            {(["login", "access", "reset"] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                className="btn"
                style={mode === item ? styles.tabActive : styles.tab}
                onClick={() => {
                  setMode(item);
                  setMessage(null);
                  if (item !== "access") setDisplayName("");
                  if (item === "login") resetForm();
                }}
              >
                {item === "login" ? "Entrar" : item === "access" ? "Crear acceso" : "Recuperar"}
              </button>
            ))}
          </div>

          <div style={styles.copyBlock}>
            <h2 className="serif" style={styles.formTitle}>
              {modeCopy[mode].title}
            </h2>
            <p className="muted" style={styles.formText}>
              {modeCopy[mode].text}
            </p>
          </div>

          <form onSubmit={submit} style={styles.form}>
            {mode === "access" ? (
              <label>
                <span className="label">Nombre visible</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Ej: John Wainer"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label>
              <span className="label">Correo</span>
              <input
                className="input"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            {mode !== "reset" ? (
              <label>
                <span className="label">Contraseña</span>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "access" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </label>
            ) : null}

            {mode === "access" ? (
              <p className="muted" style={styles.note}>
                No pedimos confirmación por email. Si tu usuario ya existe en `profiles`, creamos o reparamos el
                acceso y entras enseguida.
              </p>
            ) : null}

            <button className="btn btn-primary" type="submit" disabled={isSending}>
              {isSending ? "Procesando..." : modeCopy[mode].primary}
            </button>
          </form>

          <div style={styles.footerRow}>
            {mode !== "login" ? (
              <button type="button" className="btn btn-ghost" onClick={() => setMode("login")}>
                Volver a entrar
              </button>
            ) : null}
            {mode !== "access" ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMode("access");
                  setMessage(null);
                }}
              >
                Crear acceso
              </button>
            ) : null}
          </div>

          {message ? <div style={styles.message}>{message}</div> : null}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    padding: 18,
    borderRadius: 34,
    display: "grid",
    gap: 18,
    gridTemplateColumns: "1.08fr 0.92fr",
    alignItems: "start",
  },
  hero: {
    padding: 18,
    display: "grid",
    gap: 16,
    alignContent: "start",
  },
  title: {
    fontSize: "clamp(40px, 4.4vw, 70px)",
    margin: 0,
    lineHeight: 0.94,
    letterSpacing: "-0.05em",
    maxWidth: 680,
  },
  text: {
    fontSize: 18,
    lineHeight: 1.75,
    margin: 0,
    maxWidth: 620,
  },
  bullets: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginTop: 10,
  },
  bullet: {
    padding: 16,
    borderRadius: 22,
    display: "grid",
    gap: 6,
  },
  formCard: {
    padding: 20,
    borderRadius: 28,
    display: "grid",
    gap: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.82))",
  },
  tabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
  tabActive: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.16)",
    color: "var(--text)",
  },
  copyBlock: {
    display: "grid",
    gap: 8,
  },
  formTitle: {
    fontSize: "clamp(30px, 3vw, 42px)",
    margin: 0,
    lineHeight: 0.96,
    letterSpacing: "-0.04em",
  },
  formText: {
    margin: 0,
    lineHeight: 1.7,
  },
  form: {
    display: "grid",
    gap: 12,
  },
  note: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
  },
  footerRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  message: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
};
