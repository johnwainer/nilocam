"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { siteUrl } from "@/lib/utils";

const supabase = createSupabaseBrowserClient();

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendLink = async () => {
    setIsSending(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: siteUrl("/auth/callback?next=/admin"),
      },
    });
    setIsSending(false);
    setMessage(error ? error.message : "Te enviamos un enlace para entrar al admin.");
  };

  return (
    <main className="container section">
      <div className="card glass" style={styles.card}>
        <span className="eyebrow">Acceso al admin</span>
        <h1 className="serif" style={styles.title}>
          Entra con tu correo para crear y editar eventos
        </h1>
        <p className="muted" style={styles.text}>
          Usa el correo del admin o del dueño del evento. El enlace de acceso se envía por email desde Supabase.
        </p>
        <div style={styles.form}>
          <input
            className="input"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="btn btn-primary" onClick={sendLink} disabled={isSending || !email}>
            {isSending ? "Enviando..." : "Enviar enlace"}
          </button>
        </div>
        {message ? <div style={styles.message}>{message}</div> : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 30,
    borderRadius: 30,
    maxWidth: 760,
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
    gridTemplateColumns: "1fr auto",
    gap: 12,
    marginTop: 6,
  },
  message: {
    borderRadius: 18,
    padding: 14,
    background: "rgba(52, 211, 153, 0.11)",
    border: "1px solid rgba(52, 211, 153, 0.18)",
    color: "#bbf7d0",
  },
};
