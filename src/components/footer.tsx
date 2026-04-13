export function Footer() {
  return (
    <footer className="section" style={{ paddingTop: 20 }}>
      <div className="container">
        <div className="divider" style={{ marginBottom: 18 }} />
        <div style={styles.wrap}>
          <div>
            <strong>Construido para Nilo Cam</strong>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: 560 }}>
              Una experiencia de fotos con QR, landing editable y galería en vivo para eventos en español.
            </p>
          </div>
          <div className="muted" style={styles.meta}>
            <span>PWA</span>
            <span>Supabase</span>
            <span>Vercel</span>
            <span>Storage listo para escalar a S3</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    alignItems: "end",
    flexWrap: "wrap",
  },
  meta: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};
