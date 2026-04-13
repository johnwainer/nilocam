import { EventLanding } from "@/components/event-landing";
import type { EventRecord, PhotoRecord } from "@/types";

const DEMO_EVENT: EventRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "demo-nilo-cam",
  title: "Boda de Ana & Carlos",
  subtitle: "Una noche que nunca olvidaremos",
  event_type_key: "matrimonio",
  owner_email: null,
  event_date: "2025-12-14",
  venue_name: "Hacienda El Roble",
  venue_city: "Bogotá, Colombia",
  moderation_mode: "auto",
  max_upload_mb: 20,
  allow_guest_upload: true,
  cover_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  landing_config: {
    sections: ["hero", "ctas", "how-it-works", "event-info", "gallery", "privacy", "support"],
    heroEyebrow: "Boda en vivo · 14 diciembre 2025",
    heroTitle: "Comparte tu\nfoto favorita",
    heroSubtitle:
      "Escanea el QR, toma o sube una foto y mírala aparecer en la galería del evento en tiempo real.",
    primaryCta: "Tomar foto",
    secondaryCta: "Subir foto",
    tertiaryCta: "Ver galería",
    introCopy:
      "Sin apps, sin registro. Desde cualquier iPhone o Android. Tus fotos aparecen al instante en la pantalla del evento.",
    privacyCopy:
      "Tus fotos pasan por revisión antes de aparecer públicamente. Siempre puedes subir de forma anónima.",
    highlightCopy: "El recuerdo más hermoso lo toman los propios invitados.",
    showNameField: true,
    showAnonymousToggle: true,
    showTerms: false,
    filtersMode: "allow",
    forcedFilter: null,
    galleryMode: "slider",
    templatesMode: "allow",
    forcedTemplate: null,
    templateKey: "midnight",
    theme: {
      background: "#080c14",
      surface: "#0f1623",
      surfaceSoft: "#1a2236",
      text: "#f1f5f9",
      muted: "#94a3b8",
      accent: "#e2e8f0",
      accentSoft: "#1e293b",
      border: "#1e293b",
      heroImage:
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80",
    },
  },
};

const DEMO_PHOTOS: PhotoRecord[] = [
  {
    id: "demo-1",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    original_name: "foto1.jpg",
    uploaded_by_name: "María G.",
    uploaded_by_email: null,
    is_anonymous: false,
    moderation_status: "approved",
    filter_name: "warm",
    template_key: "clean",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "demo-2",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
    original_name: "foto2.jpg",
    uploaded_by_name: "Andrés P.",
    uploaded_by_email: null,
    is_anonymous: false,
    moderation_status: "approved",
    filter_name: "mono",
    template_key: "film",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "demo-3",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    original_name: "foto3.jpg",
    uploaded_by_name: null,
    uploaded_by_email: null,
    is_anonymous: true,
    moderation_status: "approved",
    filter_name: "vintage",
    template_key: "polaroid",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "demo-4",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80",
    original_name: "foto4.jpg",
    uploaded_by_name: "Luisa M.",
    uploaded_by_email: null,
    is_anonymous: false,
    moderation_status: "approved",
    filter_name: "rose",
    template_key: "clean",
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "demo-5",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    original_name: "foto5.jpg",
    uploaded_by_name: "Camilo R.",
    uploaded_by_email: null,
    is_anonymous: false,
    moderation_status: "approved",
    filter_name: "dramatic",
    template_key: "frame",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "demo-6",
    event_id: DEMO_EVENT.id,
    storage_path: "",
    public_url:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    original_name: "foto6.jpg",
    uploaded_by_name: "Valentina S.",
    uploaded_by_email: null,
    is_anonymous: false,
    moderation_status: "approved",
    filter_name: "cool",
    template_key: "minimal",
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
];

export default function DemoEventPage() {
  return (
    <>
      {/* Demo banner */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "rgba(14,18,30,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            DEMO
          </span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.4 }}>
            Así se ve la landing de un evento real · Las fotos de ejemplo son de demostración
          </span>
        </div>
        <a
          href="/admin"
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            padding: "6px 14px",
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          Crear mi evento →
        </a>
      </div>

      {/* Spacer for fixed banner */}
      <div style={{ height: 42 }} />

      <EventLanding event={DEMO_EVENT} initialPhotos={DEMO_PHOTOS} />
    </>
  );
}
