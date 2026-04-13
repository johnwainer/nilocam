import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function TopNav() {
  return (
    <header className="container" style={{ padding: "22px 0 0" }}>
      <nav className="glass" style={styles.nav}>
        <Link href="/" style={styles.brand}>
          <span style={styles.cat}>🐈‍⬛</span>
          <span>
            <strong style={{ display: "block" }}>{APP_NAME}</strong>
            <small style={{ color: "var(--muted-2)" }}>QR, eventos y fotos en vivo</small>
          </span>
        </Link>
        <div style={styles.links}>
          <Link className="btn btn-ghost" href="/admin">
            Admin
          </Link>
          <Link className="btn btn-primary" href="/#demo">
            Ver demo
          </Link>
        </div>
      </nav>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    borderRadius: 999,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  cat: {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
    fontSize: 22,
  },
  links: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};
