import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container section">
      <div className="card glass" style={{ padding: 32, borderRadius: 28 }}>
        <span className="eyebrow">404</span>
        <h1 className="serif" style={{ fontSize: 54, margin: "10px 0 14px" }}>
          Esa página no existe
        </h1>
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.7 }}>
          Tal vez el QR apunta a otro evento o el slug cambió.
        </p>
        <Link className="btn btn-primary" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
