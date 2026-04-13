import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const features = [
  { label: "QR instantáneo", desc: "Genera un código QR único por evento, listo para imprimir o proyectar." },
  { label: "Landing personalizada", desc: "Cada evento tiene su propia página con tema visual, colores y textos editables." },
  { label: "Galería en vivo", desc: "Las fotos de los invitados aparecen en pantalla en tiempo real, sin recargar." },
  { label: "Sin app ni registro", desc: "Los invitados abren el QR desde cualquier teléfono y suben fotos de inmediato." },
  { label: "Moderación de fotos", desc: "Aprueba las fotos manualmente o activa la moderación automática." },
  { label: "Pantalla de proyección", desc: "Vista de slideshow en pantalla grande con Ken Burns para proyectar en el evento." },
];

const links = [
  { label: "Inicio", href: "/" },
  { label: "Demo", href: "/event/demo-nilo-cam" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Tipos de evento", href: "/#tipos" },
  { label: "Admin", href: "/admin" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={s.footer}>
      <div className="container">
        <div className="divider" style={{ marginBottom: 48 }} />

        {/* Top: brand + nav */}
        <div style={s.top}>
          <div style={s.brand}>
            <strong style={s.brandName}>{APP_NAME}</strong>
            <p className="muted" style={s.tagline}>
              La galería viva de tu evento. Un QR activa una landing personalizada
              donde los invitados suben fotos que aparecen en tiempo real.
            </p>
          </div>

          <nav style={s.nav} aria-label="Footer">
            {links.map((l) => (
              <Link key={l.href} href={l.href} style={s.navLink}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Features grid */}
        <div style={s.grid}>
          {features.map((f) => (
            <div key={f.label} style={s.featureItem}>
              <span style={s.featureLabel}>{f.label}</span>
              <span className="muted" style={s.featureDesc}>{f.desc}</span>
            </div>
          ))}
        </div>

        <div className="divider" style={{ margin: "32px 0 24px" }} />

        {/* Bottom bar */}
        <div style={s.bottom}>
          <span className="muted" style={{ fontSize: 13 }}>
            © {year} {APP_NAME}. Todos los derechos reservados.
          </span>
          <div style={s.bottomLinks}>
            <Link href="/admin" style={s.bottomLink}>Panel de administración</Link>
            <span className="muted" style={{ fontSize: 13, opacity: 0.4 }}>·</span>
            <Link href="/event/demo-nilo-cam" style={s.bottomLink}>Ver demo</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

const s: Record<string, React.CSSProperties> = {
  footer: {
    paddingTop: 0,
    paddingBottom: 48,
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 40,
    flexWrap: "wrap",
    marginBottom: 48,
  },
  brand: {
    display: "grid",
    gap: 12,
    maxWidth: 440,
  },
  brandName: {
    fontSize: 22,
    letterSpacing: "-0.03em",
  },
  tagline: {
    fontSize: 15,
    lineHeight: 1.65,
    margin: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    alignItems: "flex-end",
  },
  navLink: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-muted)",
    textDecoration: "none",
    opacity: 0.7,
    transition: "opacity 150ms ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "24px 32px",
  },
  featureItem: {
    display: "grid",
    gap: 5,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 1.55,
    margin: 0,
  },
  bottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  bottomLinks: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  bottomLink: {
    fontSize: 13,
    color: "var(--text-muted)",
    textDecoration: "none",
    opacity: 0.6,
  },
};
