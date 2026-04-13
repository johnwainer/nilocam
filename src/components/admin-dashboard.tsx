"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  APP_NAME,
  DEFAULT_LANDING_CONFIG,
  EVENT_TYPES,
  MODERATION_COPY,
  eventTypePresetFromKey,
} from "@/lib/constants";
import { siteUrl, toSlug } from "@/lib/utils";
import type { EventRecord, EventTypeKey } from "@/types";

const supabase = createSupabaseBrowserClient();

const emptyEvent: EventRecord = {
  id: "",
  slug: "",
  title: "",
  subtitle: null,
  event_type_key: "matrimonio",
  owner_email: null,
  event_date: null,
  venue_name: null,
  venue_city: null,
  moderation_mode: "auto",
  max_upload_mb: 12,
  landing_config: DEFAULT_LANDING_CONFIG,
  cover_image_url: null,
  allow_guest_upload: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function AdminDashboard({
  userEmail,
  initialEvents,
}: {
  userEmail: string;
  initialEvents: EventRecord[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedId, setSelectedId] = useState(initialEvents[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0] ?? emptyEvent,
    [events, selectedId]
  );

  const createNew = () => {
    const preset = eventTypePresetFromKey("matrimonio");
    const event: EventRecord = {
      ...emptyEvent,
      id: crypto.randomUUID(),
      slug: toSlug(`${preset.sampleTitle}-${Date.now().toString(36)}`),
      title: preset.sampleTitle,
      subtitle: preset.sampleSubtitle,
      event_type_key: preset.key,
      owner_email: userEmail,
      landing_config: {
        ...DEFAULT_LANDING_CONFIG,
        heroEyebrow: preset.name,
        heroTitle: preset.sampleTitle,
        heroSubtitle: preset.sampleSubtitle,
        theme: {
          ...DEFAULT_LANDING_CONFIG.theme,
          accent: preset.accent,
          accentSoft: preset.accentSoft,
          heroImage: preset.heroImage,
        },
      },
    };
    setEvents((current) => [event, ...current]);
    setSelectedId(event.id);
  };

  const saveEvent = async () => {
    if (!selected.slug || !selected.title) {
      setNotice("Completa el título y el slug antes de guardar.");
      return;
    }

    setSaving(true);
    setNotice(null);
    const payload = {
      id: selected.id || crypto.randomUUID(),
      slug: selected.slug,
      title: selected.title,
      subtitle: selected.subtitle,
      event_type_key: selected.event_type_key,
      owner_email: selected.owner_email ?? userEmail,
      event_date: selected.event_date,
      venue_name: selected.venue_name,
      venue_city: selected.venue_city,
      moderation_mode: selected.moderation_mode,
      max_upload_mb: selected.max_upload_mb,
      landing_config: selected.landing_config,
      cover_image_url: selected.cover_image_url,
      allow_guest_upload: selected.allow_guest_upload,
    };

    const { data, error } = await supabase.from("events").upsert(payload).select("*").single();
    setSaving(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setEvents((current) => {
      const next = current.filter((event) => event.id !== data.id);
      return [data as EventRecord, ...next];
    });
    setSelectedId(data.id);
    setNotice("Evento guardado.");
  };

  const updateSelected = <K extends keyof EventRecord>(key: K, value: EventRecord[K]) => {
    setEvents((current) =>
      current.map((event) => (event.id === selected.id ? { ...event, [key]: value } : event))
    );
  };

  const updateLanding = <K extends keyof EventRecord["landing_config"]>(
    key: K,
    value: EventRecord["landing_config"][K]
  ) => {
    setEvents((current) =>
      current.map((event) =>
        event.id === selected.id
          ? {
              ...event,
              landing_config: {
                ...event.landing_config,
                [key]: value,
              },
            }
          : event
      )
    );
  };

  const applyPreset = (key: EventTypeKey) => {
    const preset = eventTypePresetFromKey(key);
    setEvents((current) =>
      current.map((event) =>
        event.id === selected.id
          ? {
              ...event,
              event_type_key: key,
              title: preset.sampleTitle,
              subtitle: preset.sampleSubtitle,
              landing_config: {
                ...event.landing_config,
                heroEyebrow: preset.name,
                heroTitle: preset.sampleTitle,
                heroSubtitle: preset.sampleSubtitle,
                theme: {
                  ...event.landing_config.theme,
                  accent: preset.accent,
                  accentSoft: preset.accentSoft,
                  heroImage: preset.heroImage,
                },
              },
            }
          : event
      )
    );
  };

  return (
    <main className="section" style={styles.shell}>
      <div className="container" style={styles.page}>
        <aside className="card glass" style={styles.sidebar}>
          <div style={styles.sidebarHead}>
            <div>
              <span className="eyebrow">Admin</span>
              <h1 className="serif" style={styles.title}>
                {APP_NAME} events
              </h1>
            </div>
            <button className="btn btn-primary" onClick={createNew}>
              Crear evento
            </button>
          </div>
          <div style={styles.userBox}>
            <span className="muted">Sesión activa</span>
            <strong>{userEmail}</strong>
          </div>
          <div style={styles.list}>
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedId(event.id)}
                className="card"
                style={event.id === selected.id ? styles.eventActive : styles.eventItem}
              >
                <strong>{event.title || "Nuevo evento"}</strong>
                <span className="muted">{event.slug || "sin slug"}</span>
                <span className="pill" style={{ marginTop: 4 }}>
                  {eventTypePresetFromKey(event.event_type_key).name}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section style={styles.main}>
          <div className="card glass" style={styles.editor}>
            <div style={styles.editorHead}>
              <div>
                <span className="eyebrow">Constructor visual</span>
                <h2 className="serif" style={styles.h2}>
                  Edita la landing del evento
                </h2>
              </div>
              <div style={styles.editorActions}>
                <a className="btn btn-secondary" href={siteUrl(`/event/${selected.slug}`)} target="_blank">
                  Abrir landing
                </a>
                <button className="btn btn-primary" onClick={saveEvent} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>

            {notice ? <div style={styles.notice}>{notice}</div> : null}

            <div style={styles.editorGrid}>
              <div style={styles.form}>
                <label>
                  <span className="label">Tipo de evento</span>
                  <select
                    className="select"
                    value={selected.event_type_key}
                    onChange={(event) => applyPreset(event.target.value as EventTypeKey)}
                  >
                    {EVENT_TYPES.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="label">Título</span>
                  <input
                    className="input"
                    value={selected.title}
                    onChange={(event) => updateSelected("title", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Subtítulo</span>
                  <input
                    className="input"
                    value={selected.subtitle ?? ""}
                    onChange={(event) => updateSelected("subtitle", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Slug de la URL</span>
                  <input
                    className="input"
                    value={selected.slug}
                    onChange={(event) => updateSelected("slug", toSlug(event.target.value))}
                  />
                </label>

                <label>
                  <span className="label">Correo del dueño</span>
                  <input
                    className="input"
                    type="email"
                    value={selected.owner_email ?? userEmail}
                    onChange={(event) => updateSelected("owner_email", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Fecha del evento</span>
                  <input
                    className="input"
                    type="date"
                    value={selected.event_date ? selected.event_date.slice(0, 10) : ""}
                    onChange={(event) =>
                      updateSelected("event_date", event.target.value ? new Date(event.target.value).toISOString() : null)
                    }
                  />
                </label>

                <label>
                  <span className="label">Lugar</span>
                  <input
                    className="input"
                    value={selected.venue_name ?? ""}
                    onChange={(event) => updateSelected("venue_name", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Ciudad</span>
                  <input
                    className="input"
                    value={selected.venue_city ?? ""}
                    onChange={(event) => updateSelected("venue_city", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Moderación</span>
                  <select
                    className="select"
                    value={selected.moderation_mode}
                    onChange={(event) =>
                      updateSelected("moderation_mode", event.target.value as EventRecord["moderation_mode"])
                    }
                  >
                    <option value="auto">Automática</option>
                    <option value="manual">Manual</option>
                  </select>
                  <p className="muted" style={styles.helper}>
                    {MODERATION_COPY[selected.moderation_mode]}
                  </p>
                </label>

                <label>
                  <span className="label">Límite máximo por foto (MB)</span>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={40}
                    value={selected.max_upload_mb}
                    onChange={(event) => updateSelected("max_upload_mb", Number(event.target.value))}
                  />
                </label>

                <label style={styles.switchRow}>
                  <input
                    type="checkbox"
                    checked={selected.allow_guest_upload}
                    onChange={(event) => updateSelected("allow_guest_upload", event.target.checked)}
                  />
                  <span>Permitir subida de invitados</span>
                </label>

                <label>
                  <span className="label">Hero title</span>
                  <input
                    className="input"
                    value={selected.landing_config.heroTitle}
                    onChange={(event) => updateLanding("heroTitle", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Hero subtitle</span>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={selected.landing_config.heroSubtitle}
                    onChange={(event) => updateLanding("heroSubtitle", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Copy principal</span>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={selected.landing_config.introCopy}
                    onChange={(event) => updateLanding("introCopy", event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">Color acento</span>
                  <input
                    className="input"
                    type="color"
                    value={selected.landing_config.theme.accent}
                    onChange={(event) =>
                      updateLanding("theme", {
                        ...selected.landing_config.theme,
                        accent: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span className="label">Imagen hero</span>
                  <input
                    className="input"
                    value={selected.landing_config.theme.heroImage ?? ""}
                    onChange={(event) =>
                      updateLanding("theme", {
                        ...selected.landing_config.theme,
                        heroImage: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span className="label">Secciones visibles</span>
                  <div style={styles.sectionChips}>
                    {["hero", "ctas", "how-it-works", "gallery", "privacy", "event-info", "support"].map((section) => {
                      const active = selected.landing_config.sections.includes(section as never);
                      return (
                        <button
                          key={section}
                          type="button"
                          className="btn"
                          style={active ? styles.sectionChipActive : styles.sectionChip}
                          onClick={() =>
                            updateLanding(
                              "sections",
                              active
                                ? selected.landing_config.sections.filter((item) => item !== section)
                                : [...selected.landing_config.sections, section as never]
                            )
                          }
                        >
                          {section}
                        </button>
                      );
                    })}
                  </div>
                </label>
              </div>

              <div style={styles.preview}>
                <div className="card" style={styles.previewCard}>
                  <div style={styles.previewHeader}>
                    <span className="eyebrow">Vista previa</span>
                    <span className="pill">{siteUrl(`/event/${selected.slug}`)}</span>
                  </div>
                  <div style={styles.previewBody}>
                    <strong style={{ color: selected.landing_config.theme.accent }}>{selected.landing_config.heroEyebrow}</strong>
                    <h3 className="serif" style={styles.previewTitle}>
                      {selected.landing_config.heroTitle}
                    </h3>
                    <p className="muted" style={styles.previewText}>
                      {selected.landing_config.heroSubtitle}
                    </p>
                    <div style={styles.previewButtons}>
                      <button className="btn btn-primary">{selected.landing_config.primaryCta}</button>
                      <button className="btn btn-secondary">{selected.landing_config.tertiaryCta}</button>
                    </div>
                    <div style={styles.qrBox}>
                      {selected.slug ? (
                        <QRCodeCanvas
                          value={siteUrl(`/event/${selected.slug}`)}
                          size={176}
                          fgColor="#f8fafc"
                          bgColor="transparent"
                        />
                      ) : null}
                    </div>
                    <p className="muted" style={{ margin: 0 }}>
                      Usa esta URL para recortar el QR y compartirlo en tus invitaciones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "grid",
    gap: 24,
    gridTemplateColumns: "300px 1fr",
    alignItems: "start",
  },
  shell: {
    paddingTop: 44,
  },
  sidebar: {
    padding: 18,
    borderRadius: 24,
    position: "sticky",
    top: 18,
    background: "rgba(255,255,255,0.88)",
  },
  sidebarHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
  },
  title: {
    margin: "10px 0 0",
    fontSize: 28,
    lineHeight: 0.96,
    letterSpacing: "-0.04em",
  },
  userBox: {
    display: "grid",
    gap: 6,
    padding: 12,
    borderRadius: 18,
    background: "rgba(0,0,0,0.03)",
  },
  list: {
    display: "grid",
    gap: 8,
    marginTop: 8,
  },
  eventItem: {
    padding: 14,
    borderRadius: 18,
    textAlign: "left",
    border: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(255,255,255,0.9)",
    display: "grid",
    gap: 4,
    color: "var(--text)",
    cursor: "pointer",
  },
  eventActive: {
    padding: 14,
    borderRadius: 18,
    textAlign: "left",
    border: "1px solid rgba(0,0,0,0.14)",
    background: "rgba(0,0,0,0.04)",
    display: "grid",
    gap: 4,
    color: "var(--text)",
    cursor: "pointer",
  },
  main: {
    display: "grid",
    gap: 18,
  },
  editor: {
    padding: 20,
    borderRadius: 26,
    background: "rgba(255,255,255,0.9)",
  },
  editorHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "start",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  h2: {
    margin: "8px 0 0",
    fontSize: 34,
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
  },
  editorActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  notice: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
  editorGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 16,
  },
  form: {
    display: "grid",
    gap: 12,
    alignContent: "start",
  },
  helper: {
    margin: "8px 0 0",
    fontSize: 13,
    lineHeight: 1.5,
  },
  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "var(--muted)",
  },
  sectionChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  sectionChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: "var(--text)",
  },
  sectionChipActive: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.16)",
    color: "#111",
  },
  preview: {
    position: "sticky",
    top: 20,
    alignSelf: "start",
  },
  previewCard: {
    borderRadius: 24,
    padding: 18,
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.92))",
    border: "1px solid rgba(0,0,0,0.08)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  previewBody: {
    display: "grid",
    gap: 14,
    marginTop: 14,
  },
  previewTitle: {
    fontSize: 52,
    lineHeight: 0.92,
    margin: 0,
  },
  previewText: {
    margin: 0,
    lineHeight: 1.7,
  },
  previewButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  qrBox: {
    width: "fit-content",
    padding: 14,
    borderRadius: 24,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.08)",
  },
};
