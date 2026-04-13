export type EventTypeKey =
  | "cumpleanos"
  | "quinceanos"
  | "matrimonio"
  | "despedida-soltera"
  | "despedida-soltero"
  | "baby-shower"
  | "aniversario"
  | "graduacion"
  | "corporativo"
  | "familia";

export type ModerationMode = "auto" | "manual";

export type LandingSection =
  | "hero"
  | "ctas"
  | "how-it-works"
  | "gallery"
  | "privacy"
  | "event-info"
  | "support";

export type LandingTheme = {
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  heroImage?: string;
};

export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type EventLandingConfig = {
  sections: LandingSection[];
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  tertiaryCta: string;
  introCopy: string;
  privacyCopy: string;
  highlightCopy: string;
  showNameField: boolean;
  showAnonymousToggle: boolean;
  showTerms: boolean;
  theme: LandingTheme;
  // Watermark / brand overlay
  watermarkUrl?: string | null;
  watermarkPosition?: WatermarkPosition;
  watermarkSize?: number;     // 5–40 (% of output image width)
  watermarkOpacity?: number;  // 0.1–1.0
  // Active design template key
  templateKey?: string;
  // Filter & template policy
  // "allow"  → guest chooses freely (default)
  // "none"   → no filter/template applied, picker hidden
  // "forced" → a specific value is applied to everyone, picker hidden
  filtersMode?: "allow" | "none" | "forced";
  forcedFilter?: string | null;
  templatesMode?: "allow" | "none" | "forced";
  forcedTemplate?: string | null;
};

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  event_type_key: EventTypeKey;
  owner_email: string | null;
  event_date: string | null;
  venue_name: string | null;
  venue_city: string | null;
  moderation_mode: ModerationMode;
  max_upload_mb: number;
  landing_config: EventLandingConfig;
  cover_image_url: string | null;
  allow_guest_upload: boolean;
  created_at: string;
  updated_at: string;
};

export type PhotoRecord = {
  id: string;
  event_id: string;
  storage_path: string;
  public_url?: string;
  original_name: string | null;
  uploaded_by_name: string | null;
  uploaded_by_email: string | null;
  is_anonymous: boolean;
  moderation_status: "approved" | "pending" | "rejected";
  filter_name: string | null;
  template_key: string | null;
  created_at: string;
};

export type LandingTemplatePreset = {
  key: string;
  name: string;
  description: string;
  theme: LandingTheme;
};

export type EventTypePreset = {
  key: EventTypeKey;
  name: string;
  description: string;
  sampleTitle: string;
  sampleSubtitle: string;
  accent: string;
  accentSoft: string;
  heroImage: string;
};
