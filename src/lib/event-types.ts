import type { EventRecord, EventTypeKey, LandingSection } from "@/lib/types";

type EventTypeConfig = {
  key: EventTypeKey;
  label: string;
  headline: string;
  description: string;
  defaultTagline: string;
  ctas: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  sections: Array<Pick<LandingSection, "kind" | "title" | "body" | "enabled">>;
};

const baseSections: LandingSection[] = [
  {
    id: "hero",
    kind: "hero",
    title: "Captura el momento",
    body: "Usa el QR para tomar o subir fotos desde cualquier teléfono.",
    enabled: true,
  },
  {
    id: "highlights",
    kind: "highlights",
    title: "CTAs por todas partes",
    body: "Botones visibles arriba, en medio del flujo y al final de cada bloque.",
    enabled: true,
  },
  {
    id: "instructions",
    kind: "instructions",
    title: "Sube en segundos",
    body: "El invitado elige nombre o anonimato, toma la foto o la sube y listo.",
    enabled: true,
  },
  {
    id: "gallery",
    kind: "gallery",
    title: "Fotos en vivo",
    body: "La galería se actualiza al instante y destaca la última foto subida.",
    enabled: true,
  },
  {
    id: "cta",
    kind: "cta",
    title: "Haz más ruido en el evento",
    body: "Abre la cámara, agrega filtros y comparte el resultado con un solo toque.",
    enabled: true,
  },
];

const eventTypes: EventTypeConfig[] = [
  {
    key: "cumpleanos",
    label: "Cumpleaños",
    headline: "Una fiesta que se vive en fotos",
    description:
      "Perfecto para celebraciones familiares, sorpresas y cumpleaños memorables.",
    defaultTagline: "Sube cada momento y deja que la galería crezca en vivo.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Subir foto",
      tertiary: "Ver galería",
    },
    sections: baseSections,
  },
  {
    key: "quince",
    label: "Fiesta de 15",
    headline: "Brillo, poses y recuerdos en tiempo real",
    description:
      "Diseñado para quinceaños con estética elegante, portada destacada y gran protagonismo visual.",
    defaultTagline: "Un evento de gala necesita una landing con presencia.",
    ctas: {
      primary: "Capturar momento",
      secondary: "Elegir foto",
      tertiary: "Compartir QR",
    },
    sections: baseSections,
  },
  {
    key: "matrimonio",
    label: "Matrimonio",
    headline: "Cada abrazo, cada brindis, cada sonrisa",
    description:
      "Ideal para bodas con estilo romántico, monograma, cronología y muro de recuerdos.",
    defaultTagline: "Que la historia del día quede viva en una sola galería.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Subir recuerdo",
      tertiary: "Mirar fotos",
    },
    sections: baseSections,
  },
  {
    key: "despedida",
    label: "Despedida de solter@",
    headline: "Fotos atrevidas para una noche legendaria",
    description:
      "Plantillas dinámicas, ritmo alto y CTAs irresistibles para capturar todo.",
    defaultTagline: "Haz la foto, ponle filtro y que salga directo al muro.",
    ctas: {
      primary: "Foto rápida",
      secondary: "Subir selfie",
      tertiary: "Ver últimos uploads",
    },
    sections: baseSections,
  },
  {
    key: "baby_shower",
    label: "Baby shower",
    headline: "Ternura, colores suaves y recuerdos para siempre",
    description:
      "Pensado para celebraciones familiares con calidez, detalles tiernos y CTA amable.",
    defaultTagline: "Una landing dulce que invita a todos a participar.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Elegir foto",
      tertiary: "Dejar mensaje",
    },
    sections: baseSections,
  },
  {
    key: "bautizo",
    label: "Bautizo",
    headline: "Un día solemne, delicado y lleno de significado",
    description:
      "Landing sobria, elegante y con foco en los recuerdos familiares del evento.",
    defaultTagline: "La galería se siente limpia, clara y emocional.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Subir foto",
      tertiary: "Ver álbum",
    },
    sections: baseSections,
  },
  {
    key: "graduacion",
    label: "Graduación",
    headline: "Gorras al aire y fotos para celebrar el logro",
    description:
      "Hecho para actos de grado, fiestas académicas y celebraciones de cierre de ciclo.",
    defaultTagline: "Cada foto es una prueba de que el esfuerzo valió la pena.",
    ctas: {
      primary: "Capturar logro",
      secondary: "Subir foto",
      tertiary: "Ver momentos",
    },
    sections: baseSections,
  },
  {
    key: "aniversario",
    label: "Aniversario",
    headline: "Una historia que merece guardarse bien",
    description:
      "Ideal para aniversarios de pareja, empresa o familia con tono cálido y elegante.",
    defaultTagline: "Fotos íntimas, momentos grandes y una memoria viva.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Subir recuerdo",
      tertiary: "Ver galería",
    },
    sections: baseSections,
  },
  {
    key: "corporativo",
    label: "Evento corporativo",
    headline: "Marca, networking y contenido listo para compartir",
    description:
      "Hecho para lanzamientos, ferias, activaciones y eventos empresariales.",
    defaultTagline: "Un sistema visual que también se siente profesional.",
    ctas: {
      primary: "Tomar foto",
      secondary: "Subir foto",
      tertiary: "Ver actividad",
    },
    sections: baseSections,
  },
  {
    key: "festival",
    label: "Concierto / Festival",
    headline: "Energía alta, fotos en vivo y mucha participación",
    description:
      "Diseñado para eventos con volumen, movimiento y una landing imposible de ignorar.",
    defaultTagline: "Muchas CTAs, mucha acción y una galería vibrante.",
    ctas: {
      primary: "Abrir cámara",
      secondary: "Subir foto",
      tertiary: "Ver muro vivo",
    },
    sections: baseSections,
  },
];

export function getEventTypes() {
  return eventTypes;
}

export function getEventType(key: EventTypeKey) {
  return eventTypes.find((type) => type.key === key) ?? eventTypes[0];
}

export function buildThemeSeed(key: EventTypeKey) {
  const palettes: Record<EventTypeKey, EventRecord["theme"]> = {
    cumpleanos: {
      background: "#0a0f1d",
      surface: "#121a31",
      surfaceSoft: "#162140",
      accent: "#7c5cff",
      accentSoft: "rgba(124, 92, 255, 0.18)",
      foreground: "#eff3ff",
      muted: "#9caacf",
    },
    quince: {
      background: "#190f21",
      surface: "#2b1838",
      surfaceSoft: "#3a2149",
      accent: "#f472b6",
      accentSoft: "rgba(244, 114, 182, 0.18)",
      foreground: "#fff1fb",
      muted: "#d7aac8",
    },
    matrimonio: {
      background: "#10151e",
      surface: "#1a2430",
      surfaceSoft: "#243041",
      accent: "#f5c26b",
      accentSoft: "rgba(245, 194, 107, 0.18)",
      foreground: "#fffaf0",
      muted: "#d6c5a3",
    },
    despedida: {
      background: "#101218",
      surface: "#1b2030",
      surfaceSoft: "#23293d",
      accent: "#f97316",
      accentSoft: "rgba(249, 115, 22, 0.18)",
      foreground: "#fff8f0",
      muted: "#d3b7a0",
    },
    baby_shower: {
      background: "#0d1820",
      surface: "#142533",
      surfaceSoft: "#1b3141",
      accent: "#22c55e",
      accentSoft: "rgba(34, 197, 94, 0.18)",
      foreground: "#effbf3",
      muted: "#bad4c0",
    },
    bautizo: {
      background: "#0f1724",
      surface: "#182235",
      surfaceSoft: "#203047",
      accent: "#60a5fa",
      accentSoft: "rgba(96, 165, 250, 0.18)",
      foreground: "#f3f7ff",
      muted: "#b8c6dd",
    },
    graduacion: {
      background: "#07131b",
      surface: "#102533",
      surfaceSoft: "#173243",
      accent: "#38bdf8",
      accentSoft: "rgba(56, 189, 248, 0.18)",
      foreground: "#effdff",
      muted: "#acd4e8",
    },
    aniversario: {
      background: "#15101f",
      surface: "#221738",
      surfaceSoft: "#2e1f46",
      accent: "#c084fc",
      accentSoft: "rgba(192, 132, 252, 0.18)",
      foreground: "#faf5ff",
      muted: "#d2c2e8",
    },
    corporativo: {
      background: "#0b1320",
      surface: "#111c33",
      surfaceSoft: "#162541",
      accent: "#22d3ee",
      accentSoft: "rgba(34, 211, 238, 0.18)",
      foreground: "#effcff",
      muted: "#b7d9e1",
    },
    festival: {
      background: "#121217",
      surface: "#1f2436",
      surfaceSoft: "#2b3046",
      accent: "#facc15",
      accentSoft: "rgba(250, 204, 21, 0.18)",
      foreground: "#fffbeb",
      muted: "#e0d8b0",
    },
  };

  return palettes[key];
}

export function createDefaultSections(
  key: EventTypeKey,
): LandingSection[] {
  const config = getEventType(key);
  return config.sections.map((section, index) => ({
    id: `${key}-${section.kind}-${index}`,
    ...section,
  }));
}
