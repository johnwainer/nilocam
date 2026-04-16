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
  // Gallery display mode
  galleryMode?: "grid" | "slider";
  galleryAutoplay?: boolean;
  galleryAutoplayInterval?: number; // seconds, default 4
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
  is_active: boolean;
  photo_limit: number;
  created_at: string;
  updated_at: string;
};

export type CreditPricing = {
  key: string;
  label: string;
  description: string;
  credits: number;
};

export type CreditTransaction = {
  id: string;
  user_email: string;
  amount: number;
  type: string;
  event_id: string | null;
  event_slug: string | null;
  description: string;
  created_at: string;
};

export type PhotoDeviceData = {
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  pixelRatio?: number;
};

export type PhotoExif = {
  make?: string;
  model?: string;
  lens?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  dateTaken?: string;
  gpsLat?: number;
  gpsLon?: number;
  gpsAlt?: number;
  flash?: string;
  whiteBalance?: string;
  exposureCompensation?: number;
  colorSpace?: string;
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
  size_bytes?: number | null;
  original_size_bytes?: number | null;
  original_mime_type?: string | null;
  original_width?: number | null;
  original_height?: number | null;
  exif_data?: PhotoExif | null;
  device_data?: PhotoDeviceData | null;
  upload_ip?: string | null;
  created_at: string;
};

export type PaymentMethod = "stripe" | "paypal" | "bank_transfer";

export type PurchaseStatus = "pending" | "approved" | "rejected" | "completed";

export type BankTransferInfo = {
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  routing_number?: string;
  swift_code?: string;
  instructions?: string;
};

export type PaymentSettings = {
  credit_price_usd: number;
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
  paypal_secret: string;
  paypal_sandbox: boolean;
  bank_transfer_enabled: boolean;
  bank_transfer_info: BankTransferInfo;
};

export type PublicPaymentSettings = {
  credit_price_usd: number;
  stripe_enabled: boolean;
  stripe_public_key: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
  bank_transfer_enabled: boolean;
  bank_transfer_info: BankTransferInfo;
};

export type CreditPurchase = {
  id: string;
  user_id: string | null;
  user_email: string;
  credits: number;
  amount_usd: number;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  payment_reference: string | null;
  proof_url: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailSettings = {
  provider: "disabled" | "resend" | "smtp";
  resend_api_key: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_name: string;
  from_email: string;
  tpl_welcome_subject: string;
  tpl_welcome_body: string;
  tpl_payment_confirmed_subject: string;
  tpl_payment_confirmed_body: string;
  tpl_bank_approved_subject: string;
  tpl_bank_approved_body: string;
  tpl_bank_rejected_subject: string;
  tpl_bank_rejected_body: string;
  tpl_credits_adjusted_subject: string;
  tpl_credits_adjusted_body: string;
  tpl_bank_transfer_received_subject: string;
  tpl_bank_transfer_received_body: string;
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
