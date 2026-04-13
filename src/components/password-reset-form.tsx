"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
    <main className="container section">
      <div className="card glass" style={styles.card}>
        <span className="eyebrow">Recuperación</span>
        <h1 className="serif" style={styles.title}>
          Crea una nueva contraseña
        </h1>
        <p className="muted" style={styles.text}>
          Si abriste el enlace de recuperación enviado por correo, define aquí una nueva clave para volver al panel.
        </p>

        <form onSubmit={submit} style={styles.form}>
          <label>
            <span className="label">Nueva contraseña</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            <span className="label">Confirmar contraseña</span>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </form>

        {message ? <div style={styles.message}>{message}</div> : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 30,
    borderRadius: 30,
    maxWidth: 680,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },
  title: {
    fontSize: "clamp(38px, 4vw, 60px)",
    margin: 0,
    lineHeight: 0.94,
  },
  text: {
    fontSize: 18,
    lineHeight: 1.7,
    margin: 0,
  },
  form: {
    display: "grid",
    gap: 12,
    marginTop: 6,
  },
  message: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
};
