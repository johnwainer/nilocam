export type EventTypeKey =
  | "cumpleanos"
  | "quince"
  | "matrimonio"
  | "despedida"
  | "baby_shower"
  | "bautizo"
  | "graduacion"
  | "aniversario"
  | "corporativo"
  | "festival";

export type EventVisibility = "public" | "moderated";

export type PhotoFilter =
  | "none"
  | "vivid"
  | "warm"
  | "cool"
  | "mono"
  | "golden"
  | "noir";

export type PhotoTemplate =
  | "full-bleed"
  | "polaroid"
  | "film"
  | "spotlight"
  | "postcard";

export type LandingSectionKind =
  | "hero"
  | "highlights"
  | "instructions"
  | "gallery"
  | "story"
  | "countdown"
  | "faq"
  | "cta";

export type LandingSection = {
  id: string;
  kind: LandingSectionKind;
  title: string;
  body: string;
  enabled: boolean;
};

export type EventTheme = {
  background: string;
  surface: string;
  surfaceSoft: string;
  accent: string;
  accentSoft: string;
  foreground: string;
  muted: string;
};

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  eventType: EventTypeKey;
  dateLabel: string;
  venue: string;
  organizer: string;
  publicUrl: string;
  qrLabel: string;
  theme: EventTheme;
  visibility: EventVisibility;
  allowAnonymous: boolean;
  requireGuestName: boolean;
  maxPhotoMb: number;
  highlightLimit: number;
  logoText: string;
  heroTagline: string;
  landingSections: LandingSection[];
  ctas: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
};

export type PhotoRecord = {
  id: string;
  eventSlug: string;
  src: string;
  authorName: string;
  anonymous: boolean;
  note: string;
  status: "published" | "pending";
  filter: PhotoFilter;
  template: PhotoTemplate;
  createdAt: string;
};

export type EventStore = {
  events: EventRecord[];
  photos: PhotoRecord[];
};
