import { EventTypePreset, EventTypeKey, EventLandingConfig, LandingTemplatePreset } from "@/types";

export const EVENT_BUCKET = "event-photos";

export const APP_NAME = "Memorica";
export const APP_TAGLINE = "Fotos en tiempo real para eventos con QR, PWA y landing editable.";

export const EVENT_TYPES: EventTypePreset[] = [
  {
    key: "cumpleanos",
    name: "Cumpleaños",
    description: "Diseño alegre para celebrar con fotos instantáneas.",
    sampleTitle: "Cumple de Valentina",
    sampleSubtitle: "Súbelo, edítalo y compártelo en segundos.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "quinceanos",
    name: "Fiesta de 15",
    description: "Elegante, brillante y muy visual.",
    sampleTitle: "XV de Isabella",
    sampleSubtitle: "Un recuerdo vivo durante toda la noche.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "matrimonio",
    name: "Matrimonio",
    description: "Romántico, editorial y sofisticado.",
    sampleTitle: "Boda de Laura & Mateo",
    sampleSubtitle: "Cada invitado deja su mejor recuerdo.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "despedida-soltera",
    name: "Despedida de soltera",
    description: "Divertido, atrevido y lleno de energía.",
    sampleTitle: "Última noche de soltera",
    sampleSubtitle: "Modo fiesta activado.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "despedida-soltero",
    name: "Despedida de soltero",
    description: "Impactante, social y con mucha acción.",
    sampleTitle: "Una noche para recordar",
    sampleSubtitle: "Fotos, filtros y cero complicaciones.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "baby-shower",
    name: "Baby shower",
    description: "Tierno, limpio y con mucho amor.",
    sampleTitle: "Bienvenido bebé",
    sampleSubtitle: "Captura abrazos, sonrisas y detalles.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "aniversario",
    name: "Aniversario",
    description: "Íntimo y elegante para celebrar historia.",
    sampleTitle: "15 años juntos",
    sampleSubtitle: "Un álbum vivo, hecho por todos.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "graduacion",
    name: "Graduación",
    description: "Moderno, festivo y muy compartible.",
    sampleTitle: "Promoción 2026",
    sampleSubtitle: "Todos los momentos de la ceremonia y la fiesta.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "corporativo",
    name: "Evento corporativo",
    description: "Limpio, premium y con marca visible.",
    sampleTitle: "Lanzamiento de producto",
    sampleSubtitle: "Contenido generado por invitados, en vivo.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "familia",
    name: "Reunión familiar",
    description: "Cálido, cercano y lleno de recuerdos.",
    sampleTitle: "Domingo en familia",
    sampleSubtitle: "Cada foto se suma al álbum del evento.",
    accent: "#111111",
    accentSoft: "#ececec",
    heroImage: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
];

export const DEFAULT_LANDING_CONFIG: EventLandingConfig = {
  sections: ["hero", "ctas", "event-info", "gallery", "privacy", "support"],
  heroEyebrow: "Memorica eventos en vivo",
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
  galleryMode: "grid",
  galleryAutoplay: false,
  galleryAutoplayInterval: 4,
  filtersMode: "allow",
  forcedFilter: null,
  templatesMode: "allow",
  forcedTemplate: null,
  theme: {
    background: "#0b0f19",
    surface: "#111827",
    surfaceSoft: "#1f2937",
    text: "#f9fafb",
    muted: "#cbd5e1",
    accent: "#111111",
    accentSoft: "#ececec",
    border: "#273244",
    heroImage:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80",
  },
};

export const FILTERS = [
  { key: "none",     label: "Original",   css: "none" },
  { key: "warm",     label: "Cálido",     css: "sepia(0.2) saturate(1.22) contrast(1.05) brightness(1.03)" },
  { key: "golden",   label: "Dorado",     css: "sepia(0.45) saturate(1.4) brightness(1.05) contrast(1.08)" },
  { key: "rose",     label: "Rosa",       css: "sepia(0.15) saturate(1.3) hue-rotate(-15deg) brightness(1.06)" },
  { key: "vintage",  label: "Vintage",    css: "sepia(0.55) saturate(0.85) contrast(0.9) brightness(1.1)" },
  { key: "dream",    label: "Sueño",      css: "saturate(1.05) contrast(0.96) brightness(1.1)" },
  { key: "soft",     label: "Suave",      css: "brightness(1.14) saturate(0.8) contrast(0.9)" },
  { key: "fade",     label: "Fade",       css: "contrast(0.84) brightness(1.14) saturate(0.7)" },
  { key: "matte",    label: "Mate",       css: "contrast(0.86) saturate(0.78) brightness(1.08) sepia(0.08)" },
  { key: "cool",     label: "Frío",       css: "saturate(0.88) hue-rotate(18deg) brightness(1.05) contrast(1.06)" },
  { key: "mono",     label: "Mono",       css: "grayscale(1) contrast(1.08)" },
  { key: "noir",     label: "Noir",       css: "grayscale(1) contrast(1.45) brightness(0.88)" },
  { key: "pop",      label: "Pop",        css: "saturate(1.5) contrast(1.14) brightness(1.04)" },
  { key: "vivid",    label: "Vívido",     css: "saturate(1.8) contrast(1.18) brightness(1.02)" },
  { key: "dramatic", label: "Dramático",  css: "contrast(1.4) brightness(0.86) saturate(1.1)" },
];

export const TEMPLATES = [
  { key: "clean",    label: "Limpio" },
  { key: "film",     label: "Cine" },
  { key: "frame",    label: "Marco" },
  { key: "polaroid", label: "Polaroid" },
  { key: "vignette", label: "Viñeta" },
  { key: "minimal",  label: "Minimal" },
  { key: "double",   label: "Doble" },
  { key: "corner",   label: "Esquinas" },
];

export const LANDING_TEMPLATES: LandingTemplatePreset[] = [
  // ── Dark themes ───────────────────────────────────────────────────────────
  {
    key: "midnight",
    name: "Midnight",
    description: "Azul noche, clásico y elegante",
    theme: { background: "#0b0f19", surface: "#111827", surfaceSoft: "#1f2937", text: "#f9fafb", muted: "#94a3b8", accent: "#ffffff", accentSoft: "#1e293b", border: "#1e293b" },
  },
  {
    key: "noir",
    name: "Noir",
    description: "Negro profundo con acento dorado",
    theme: { background: "#080808", surface: "#111111", surfaceSoft: "#1a1a1a", text: "#f5f5f0", muted: "#8a8a80", accent: "#d4a373", accentSoft: "#2a2010", border: "#242424" },
  },
  {
    key: "forest",
    name: "Forest",
    description: "Verde oscuro con toques de menta",
    theme: { background: "#070e08", surface: "#0f1a10", surfaceSoft: "#162118", text: "#f0faf0", muted: "#80a880", accent: "#4ade80", accentSoft: "#0a2810", border: "#182c18" },
  },
  {
    key: "obsidian",
    name: "Obsidian",
    description: "Carbón y cian eléctrico",
    theme: { background: "#0c0c0c", surface: "#151515", surfaceSoft: "#1e1e1e", text: "#f9fafb", muted: "#9ca3af", accent: "#22d3ee", accentSoft: "#081c24", border: "#222222" },
  },
  {
    key: "dusk",
    name: "Dusk",
    description: "Violeta profundo, misterioso",
    theme: { background: "#0d0b16", surface: "#141020", surfaceSoft: "#1e1830", text: "#f5f3ff", muted: "#a89bc8", accent: "#a78bfa", accentSoft: "#160f30", border: "#201c38" },
  },
  {
    key: "espresso",
    name: "Espresso",
    description: "Café oscuro con acento ámbar",
    theme: { background: "#130a05", surface: "#1e1008", surfaceSoft: "#2a1a0f", text: "#fdf0e0", muted: "#b08060", accent: "#f59e0b", accentSoft: "#281800", border: "#2c1a08" },
  },
  {
    key: "deep-rose",
    name: "Deep Rose",
    description: "Noche con acento rosa vibrante",
    theme: { background: "#12070f", surface: "#1c0f18", surfaceSoft: "#261522", text: "#fff0f5", muted: "#c080a0", accent: "#fb7185", accentSoft: "#280818", border: "#241020" },
  },
  {
    key: "abyss",
    name: "Abyss",
    description: "Azul abismal, profundo y digital",
    theme: { background: "#05060f", surface: "#0d0f1e", surfaceSoft: "#141830", text: "#eef2ff", muted: "#818cf8", accent: "#818cf8", accentSoft: "#0c1040", border: "#141830" },
  },
  {
    key: "smoke",
    name: "Smoke",
    description: "Gris oscuro neutro y sofisticado",
    theme: { background: "#111111", surface: "#1a1a1a", surfaceSoft: "#222222", text: "#f5f5f5", muted: "#888888", accent: "#e5e7eb", accentSoft: "#282828", border: "#2a2a2a" },
  },
  {
    key: "emerald",
    name: "Emerald",
    description: "Lujo oscuro con acento esmeralda",
    theme: { background: "#050f0b", surface: "#0d1e16", surfaceSoft: "#142820", text: "#ecfdf5", muted: "#6ee7b7", accent: "#34d399", accentSoft: "#042814", border: "#142c20" },
  },
  {
    key: "wine",
    name: "Wine",
    description: "Vino tinto, pasión y calidez",
    theme: { background: "#130410", surface: "#1e0a1a", surfaceSoft: "#2a1025", text: "#fff0f5", muted: "#c07090", accent: "#f43f5e", accentSoft: "#280014", border: "#280820" },
  },
  {
    key: "slate",
    name: "Slate",
    description: "Pizarra azulada, tecnológico",
    theme: { background: "#090e16", surface: "#101520", surfaceSoft: "#18202e", text: "#e8f0fe", muted: "#6080a8", accent: "#7dd3fc", accentSoft: "#081828", border: "#182030" },
  },
  {
    key: "mocha",
    name: "Mocha",
    description: "Marrón cálido con acento miel",
    theme: { background: "#100c05", surface: "#1c1408", surfaceSoft: "#261c10", text: "#fef3e2", muted: "#c8a070", accent: "#fbbf24", accentSoft: "#241a00", border: "#2e1e08" },
  },
  {
    key: "pine",
    name: "Pine",
    description: "Pino oscuro con acento eucalipto",
    theme: { background: "#060f08", surface: "#0e1a12", surfaceSoft: "#142018", text: "#f0fdf4", muted: "#86c898", accent: "#6ee7b7", accentSoft: "#042814", border: "#122818" },
  },
  {
    key: "cobalt",
    name: "Cobalt",
    description: "Azul cobalto, moderno y limpio",
    theme: { background: "#03060f", surface: "#070e20", surfaceSoft: "#0e1830", text: "#dbeafe", muted: "#6090c8", accent: "#60a5fa", accentSoft: "#061840", border: "#101828" },
  },
  // ── Light themes ──────────────────────────────────────────────────────────
  {
    key: "ivory",
    name: "Ivory",
    description: "Crema cálido con acento dorado",
    theme: { background: "#faf8f4", surface: "#ffffff", surfaceSoft: "#f0ede8", text: "#0d0a06", muted: "#6b5c4a", accent: "#b5934a", accentSoft: "#f5e8d0", border: "rgba(0,0,0,0.08)" },
  },
  {
    key: "blush",
    name: "Blush",
    description: "Rosa suave y romántico",
    theme: { background: "#fdf4f5", surface: "#ffffff", surfaceSoft: "#fce8ec", text: "#1a0a0e", muted: "#8a5060", accent: "#e879a0", accentSoft: "#fde8f0", border: "rgba(0,0,0,0.07)" },
  },
  {
    key: "arctic",
    name: "Arctic",
    description: "Blanco frío con acento cielo",
    theme: { background: "#f5f7fa", surface: "#ffffff", surfaceSoft: "#edf2f8", text: "#0d1117", muted: "#5a7090", accent: "#0ea5e9", accentSoft: "#e0f2fe", border: "rgba(0,0,0,0.07)" },
  },
  {
    key: "sage-light",
    name: "Sage",
    description: "Verde salvia, natural y fresco",
    theme: { background: "#f2f5f2", surface: "#ffffff", surfaceSoft: "#e6f0e6", text: "#0d150d", muted: "#4a7050", accent: "#059669", accentSoft: "#d1fae5", border: "rgba(0,0,0,0.07)" },
  },
  {
    key: "champagne",
    name: "Champagne",
    description: "Celebración cálida y refinada",
    theme: { background: "#fdf9f0", surface: "#ffffff", surfaceSoft: "#f5ede0", text: "#1a1208", muted: "#7a6040", accent: "#d4a373", accentSoft: "#f5e0c8", border: "rgba(0,0,0,0.07)" },
  },
];

export const MODERATION_COPY: Record<"auto" | "manual", string> = {
  auto: "Aparecen al instante en la galería del evento.",
  manual: "Quedan pendientes hasta que el admin o dueño las apruebe.",
};

export function eventTypePresetFromKey(key: EventTypeKey) {
  return EVENT_TYPES.find((preset) => preset.key === key) ?? EVENT_TYPES[0];
}
