import { EventTypePreset, EventTypeKey, EventLandingConfig } from "@/types";

export const EVENT_BUCKET = "event-photos";

export const APP_NAME = "Nilo Cam";
export const APP_TAGLINE = "Fotos en tiempo real para eventos con QR, PWA y landing editable.";

export const EVENT_TYPES: EventTypePreset[] = [
  {
    key: "cumpleanos",
    name: "Cumpleaños",
    description: "Diseño alegre para celebrar con fotos instantáneas.",
    sampleTitle: "Cumple de Valentina",
    sampleSubtitle: "Súbelo, edítalo y compártelo en segundos.",
    accent: "#f97316",
    accentSoft: "#fff1e8",
    heroImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "quinceanos",
    name: "Fiesta de 15",
    description: "Elegante, brillante y muy visual.",
    sampleTitle: "XV de Isabella",
    sampleSubtitle: "Un recuerdo vivo durante toda la noche.",
    accent: "#ec4899",
    accentSoft: "#fde7f2",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "matrimonio",
    name: "Matrimonio",
    description: "Romántico, editorial y sofisticado.",
    sampleTitle: "Boda de Laura & Mateo",
    sampleSubtitle: "Cada invitado deja su mejor recuerdo.",
    accent: "#d4a373",
    accentSoft: "#f6ece1",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "despedida-soltera",
    name: "Despedida de soltera",
    description: "Divertido, atrevido y lleno de energía.",
    sampleTitle: "Última noche de soltera",
    sampleSubtitle: "Modo fiesta activado.",
    accent: "#7c3aed",
    accentSoft: "#efe7ff",
    heroImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "despedida-soltero",
    name: "Despedida de soltero",
    description: "Impactante, social y con mucha acción.",
    sampleTitle: "Una noche para recordar",
    sampleSubtitle: "Fotos, filtros y cero complicaciones.",
    accent: "#0f766e",
    accentSoft: "#def7f3",
    heroImage: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "baby-shower",
    name: "Baby shower",
    description: "Tierno, limpio y con mucho amor.",
    sampleTitle: "Bienvenido bebé",
    sampleSubtitle: "Captura abrazos, sonrisas y detalles.",
    accent: "#22c55e",
    accentSoft: "#e7f8eb",
    heroImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "aniversario",
    name: "Aniversario",
    description: "Íntimo y elegante para celebrar historia.",
    sampleTitle: "15 años juntos",
    sampleSubtitle: "Un álbum vivo, hecho por todos.",
    accent: "#b45309",
    accentSoft: "#faebd6",
    heroImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "graduacion",
    name: "Graduación",
    description: "Moderno, festivo y muy compartible.",
    sampleTitle: "Promoción 2026",
    sampleSubtitle: "Todos los momentos de la ceremonia y la fiesta.",
    accent: "#2563eb",
    accentSoft: "#e6efff",
    heroImage: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "corporativo",
    name: "Evento corporativo",
    description: "Limpio, premium y con marca visible.",
    sampleTitle: "Lanzamiento de producto",
    sampleSubtitle: "Contenido generado por invitados, en vivo.",
    accent: "#111827",
    accentSoft: "#e7e9ee",
    heroImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "familia",
    name: "Reunión familiar",
    description: "Cálido, cercano y lleno de recuerdos.",
    sampleTitle: "Domingo en familia",
    sampleSubtitle: "Cada foto se suma al álbum del evento.",
    accent: "#dc2626",
    accentSoft: "#fdecec",
    heroImage: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
];

export const DEFAULT_LANDING_CONFIG: EventLandingConfig = {
  sections: ["hero", "ctas", "event-info", "gallery", "privacy", "support"],
  heroEyebrow: "Nilo Cam eventos en vivo",
  heroTitle: "Sube o toma fotos sin instalar nada",
  heroSubtitle: "Escanea el QR, captura el momento y míralo aparecer en tiempo real en la landing del evento.",
  primaryCta: "Tomar foto",
  secondaryCta: "Subir foto",
  tertiaryCta: "Ver fotos del evento",
  introCopy:
    "Cada invitado puede participar desde iPhone o Android, con una experiencia tipo app y una landing adaptada al estilo de tu celebración.",
  privacyCopy:
    "Las fotos pueden quedar públicas o pasar por moderación antes de aparecer, según la configuración del evento.",
  highlightCopy:
    "Convierte cualquier QR en una experiencia viva, visual y personalizada.",
  showNameField: true,
  showAnonymousToggle: true,
  showTerms: true,
  theme: {
    background: "#0b0f19",
    surface: "#111827",
    surfaceSoft: "#1f2937",
    text: "#f9fafb",
    muted: "#cbd5e1",
    accent: "#d4a373",
    accentSoft: "#2b2118",
    border: "#273244",
    heroImage:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80",
  },
};

export const FILTERS = [
  { key: "none", label: "Original", css: "none" },
  { key: "warm", label: "Cálido", css: "sepia(0.2) saturate(1.2) contrast(1.05) brightness(1.03)" },
  { key: "dream", label: "Sueño", css: "saturate(1.05) contrast(0.95) brightness(1.08) blur(0px)" },
  { key: "mono", label: "Mono", css: "grayscale(1) contrast(1.08)" },
  { key: "pop", label: "Pop", css: "saturate(1.45) contrast(1.12) brightness(1.03)" },
];

export const TEMPLATES = [
  { key: "clean", label: "Limpio" },
  { key: "film", label: "Film" },
  { key: "frame", label: "Marco" },
];

export const MODERATION_COPY: Record<"auto" | "manual", string> = {
  auto: "Aparecen al instante en la galería del evento.",
  manual: "Quedan pendientes hasta que el admin o dueño las apruebe.",
};

export function eventTypePresetFromKey(key: EventTypeKey) {
  return EVENT_TYPES.find((preset) => preset.key === key) ?? EVENT_TYPES[0];
}
