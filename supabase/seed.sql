insert into public.events (
  slug,
  title,
  subtitle,
  event_type_key,
  owner_email,
  moderation_mode,
  max_upload_mb,
  landing_config,
  allow_guest_upload
)
values (
  'demo-nilo-cam',
  'Demo Nilo Cam',
  'Ejemplo de landing en vivo con fotos en tiempo real',
  'matrimonio',
  null,
  'auto',
  12,
  '{
    "sections": ["hero", "ctas", "how-it-works", "gallery", "privacy", "event-info", "support"],
    "heroEyebrow": "Demo viva",
    "heroTitle": "Sube o toma fotos sin instalar nada",
    "heroSubtitle": "Escanea el QR, captura el momento y míralo aparecer en tiempo real.",
    "primaryCta": "Tomar foto",
    "secondaryCta": "Subir foto",
    "tertiaryCta": "Ver fotos del evento",
    "introCopy": "Cada invitado puede participar desde iPhone o Android, con una experiencia tipo app.",
    "privacyCopy": "Las fotos pueden quedar públicas o pasar por moderación antes de aparecer, según el evento.",
    "highlightCopy": "Convierte cualquier QR en una experiencia viva, visual y personalizada.",
    "showNameField": true,
    "showAnonymousToggle": true,
    "showTerms": true,
    "theme": {
      "background": "#0b0f19",
      "surface": "#111827",
      "surfaceSoft": "#1f2937",
      "text": "#f9fafb",
      "muted": "#cbd5e1",
      "accent": "#d4a373",
      "accentSoft": "#2b2118",
      "border": "#273244",
      "heroImage": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1600&q=80"
    }
  }'::jsonb,
  true
)
on conflict (slug) do update set
  title = excluded.title;
