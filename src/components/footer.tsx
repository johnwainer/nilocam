import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={s.footer}>
      <div className="container">
        <div className="divider" style={{ marginBottom: 32 }} />

        <div style={s.row}>
          <strong style={s.brand}>{APP_NAME}</strong>

          <div style={s.links}>
            <Link href="/#como-funciona" style={s.link}>Cómo funciona</Link>
            <Link href="/#precios" style={s.link}>Precios</Link>
            <Link href="/event/demo-nilo-cam" style={s.link}>Demo</Link>
            <Link href="/terms" style={s.link}>Términos</Link>
            <Link href="/privacy" style={s.link}>Privacidad</Link>
          </div>

          <span className="muted" style={s.copy}>
            © {year} {APP_NAME}
          </span>
        </div>
      </div>
    </footer>
  );
}

const s: Record<string, React.CSSProperties> = {
  footer: {
    paddingTop: 0,
    paddingBottom: 40,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },
  brand: {
    fontSize: 15,
    letterSpacing: "-0.02em",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  link: {
    fontSize: 13,
    color: "var(--muted)",
    textDecoration: "none",
    opacity: 0.75,
  },
  copy: {
    fontSize: 13,
    opacity: 0.5,
    whiteSpace: "nowrap" as const,
  },
};
