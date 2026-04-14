"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatDate, siteUrl } from "@/lib/utils";
import type { EventRecord } from "@/types";

const supabase = createSupabaseBrowserClient();

// ─── types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "super_admin";
  created_at: string;
};

type ProfileWithStats = Profile & { event_count: number };

type EventWithCount = EventRecord & { photo_count: number };

type GlobalStats = {
  totalEvents: number;
  totalPhotos: number;
  photosToday: number;
  photosThisWeek: number;
  totalUsers: number;
};

type RecentPhoto = {
  id: string;
  event_id: string;
  event_title?: string;
  created_at: string;
  uploaded_by_name: string | null;
  moderation_status: string;
};

type SATab = "stats" | "events" | "users";

// ─── role labels ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  super_admin: "Super admin",
};

const ROLE_NEXT: Record<string, { label: string; value: string; color: string }[]> = {
  owner: [{ label: "→ Admin", value: "admin", color: "#1d4ed8" }, { label: "→ Super", value: "super_admin", color: "#7c3aed" }],
  admin: [{ label: "→ Owner", value: "owner", color: "#6b7280" }, { label: "→ Super", value: "super_admin", color: "#7c3aed" }],
  super_admin: [{ label: "→ Admin", value: "admin", color: "#1d4ed8" }, { label: "→ Owner", value: "owner", color: "#6b7280" }],
};

// ─── component ───────────────────────────────────────────────────────────────

export function SuperAdminPanel({
  userEmail,
  onSelectEvent,
}: {
  userEmail: string;
  onSelectEvent: (eventId: string) => void;
}) {
  const [tab, setTab] = useState<SATab>("stats");

  // Stats
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [topEvents, setTopEvents] = useState<EventWithCount[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Events
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Users
  const [users, setUsers] = useState<ProfileWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // ── data loading ────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

      const [
        { count: totalEvents },
        { count: totalPhotos },
        { count: photosToday },
        { count: photosThisWeek },
        { count: totalUsers },
        { data: recentRows },
        { data: eventsData },
      ] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("photos").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("id, event_id, created_at, uploaded_by_name, moderation_status").order("created_at", { ascending: false }).limit(12),
        supabase.from("events").select("id, title").order("created_at", { ascending: false }),
      ]);

      setStats({
        totalEvents: totalEvents ?? 0,
        totalPhotos: totalPhotos ?? 0,
        photosToday: photosToday ?? 0,
        photosThisWeek: photosThisWeek ?? 0,
        totalUsers: totalUsers ?? 0,
      });

      // Enrich recent photos with event title
      const eventMap = new Map((eventsData ?? []).map((e: { id: string; title: string }) => [e.id, e.title]));
      setRecentPhotos(
        (recentRows ?? []).map((p) => ({ ...p, event_title: eventMap.get(p.event_id) ?? p.event_id }))
      );

      // Top events by photo count (client-side grouping from recentPhotos is biased — do a separate fetch)
      const { data: allPhotosForCounting } = await supabase
        .from("photos")
        .select("event_id");

      const countMap = new Map<string, number>();
      for (const p of allPhotosForCounting ?? []) {
        countMap.set(p.event_id, (countMap.get(p.event_id) ?? 0) + 1);
      }

      const { data: allEvents } = await supabase
        .from("events")
        .select("*")
        .order("updated_at", { ascending: false });

      const enriched = (allEvents ?? [])
        .map((e: EventRecord) => ({ ...e, photo_count: countMap.get(e.id) ?? 0 }))
        .sort((a: EventWithCount, b: EventWithCount) => b.photo_count - a.photo_count)
        .slice(0, 8);

      setTopEvents(enriched);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data: allPhotos } = await supabase.from("photos").select("event_id");
      const countMap = new Map<string, number>();
      for (const p of allPhotos ?? []) {
        countMap.set(p.event_id, (countMap.get(p.event_id) ?? 0) + 1);
      }

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      setEvents(
        (eventsData ?? []).map((e: EventRecord) => ({ ...e, photo_count: countMap.get(e.id) ?? 0 }))
      );
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: eventsData } = await supabase.from("events").select("id, owner_email");
      const evtMap = new Map<string, number>();
      for (const e of eventsData ?? []) {
        if (e.owner_email) {
          evtMap.set(e.owner_email, (evtMap.get(e.owner_email) ?? 0) + 1);
        }
      }

      setUsers(
        (profiles ?? []).map((p: Profile) => ({ ...p, event_count: evtMap.get(p.email) ?? 0 }))
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "events") loadEvents();
    else if (tab === "users") loadUsers();
  }, [tab, loadStats, loadEvents, loadUsers]);

  // ── role change ─────────────────────────────────────────────────────────────

  const changeRole = async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, role: newRole as Profile["role"] } : u)
      );
      flash("Rol actualizado", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setRoleChanging(null);
    }
  };

  const flash = (text: string, ok: boolean) => {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 3000);
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={p.shell}>
      {/* Header */}
      <div style={p.panelHeader}>
        <div>
          <h2 style={p.panelTitle}>Panel de sistema</h2>
          <span style={p.panelSub}>Sesión como {userEmail}</span>
        </div>
        <div style={p.tabBar}>
          {(["stats", "events", "users"] as SATab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={tab === t ? p.tabActive : p.tab}
            >
              {t === "stats" ? "Estadísticas" : t === "events" ? "Eventos" : "Usuarios"}
            </button>
          ))}
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{ ...p.notice, background: notice.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", borderColor: notice.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)", color: notice.ok ? "#065f46" : "#991b1b" }}>
          {notice.text}
        </div>
      )}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <div style={p.content}>
          {statsLoading ? (
            <p style={p.loading}>Cargando estadísticas…</p>
          ) : stats ? (
            <>
              {/* Metric cards */}
              <div style={p.metricGrid}>
                <MetricCard label="Eventos" value={stats.totalEvents} icon="📅" />
                <MetricCard label="Fotos totales" value={stats.totalPhotos} icon="🖼" />
                <MetricCard label="Fotos hoy" value={stats.photosToday} icon="⚡" accent />
                <MetricCard label="Esta semana" value={stats.photosThisWeek} icon="📈" />
                <MetricCard label="Usuarios" value={stats.totalUsers} icon="👤" />
              </div>

              {/* Top events */}
              <div style={p.section}>
                <h3 style={p.sectionTitle}>Top eventos por fotos</h3>
                <div style={p.tableWrap}>
                  <table style={p.table}>
                    <thead>
                      <tr>
                        <th style={p.th}>Evento</th>
                        <th style={p.th}>Responsable</th>
                        <th style={{ ...p.th, textAlign: "right" }}>Fotos</th>
                        <th style={p.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topEvents.map((ev) => (
                        <tr key={ev.id} style={p.tr}>
                          <td style={p.td}>
                            <strong style={{ fontSize: 14 }}>{ev.title}</strong>
                            <span style={p.tdMuted}>/{ev.slug}</span>
                          </td>
                          <td style={{ ...p.td, ...p.tdMuted }}>{ev.owner_email ?? "—"}</td>
                          <td style={{ ...p.td, textAlign: "right", fontWeight: 700 }}>{ev.photo_count}</td>
                          <td style={p.td}>
                            <button type="button" style={p.miniBtn} onClick={() => onSelectEvent(ev.id)}>
                              Editar
                            </button>
                            {ev.slug && (
                              <a href={siteUrl(`/event/${ev.slug}`)} target="_blank" rel="noopener noreferrer" style={p.miniLink}>
                                Landing ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent activity */}
              <div style={p.section}>
                <h3 style={p.sectionTitle}>Actividad reciente</h3>
                <div style={p.tableWrap}>
                  <table style={p.table}>
                    <thead>
                      <tr>
                        <th style={p.th}>Evento</th>
                        <th style={p.th}>Subida por</th>
                        <th style={p.th}>Estado</th>
                        <th style={p.th}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPhotos.map((ph) => (
                        <tr key={ph.id} style={p.tr}>
                          <td style={{ ...p.td, ...p.tdMuted }}>{ph.event_title}</td>
                          <td style={p.td}>{ph.uploaded_by_name ?? <em style={{ opacity: 0.45 }}>Anónimo</em>}</td>
                          <td style={p.td}>
                            <StatusPill status={ph.moderation_status} />
                          </td>
                          <td style={{ ...p.td, ...p.tdMuted }}>{fmtTime(ph.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p style={p.loading}>Sin datos.</p>
          )}
        </div>
      )}

      {/* ── EVENTS ── */}
      {tab === "events" && (
        <div style={p.content}>
          <div style={p.tableActions}>
            <span style={p.tableCount}>{events.length} eventos</span>
            <button type="button" style={p.refreshBtn} onClick={loadEvents} disabled={eventsLoading}>
              {eventsLoading ? "Cargando…" : "↺ Actualizar"}
            </button>
          </div>
          {eventsLoading ? (
            <p style={p.loading}>Cargando eventos…</p>
          ) : (
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead>
                  <tr>
                    <th style={p.th}>Evento</th>
                    <th style={p.th}>Responsable</th>
                    <th style={p.th}>Tipo</th>
                    <th style={{ ...p.th, textAlign: "right" }}>Fotos</th>
                    <th style={p.th}>Fecha evento</th>
                    <th style={p.th}>Creado</th>
                    <th style={p.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} style={p.tr}>
                      <td style={p.td}>
                        <strong style={{ fontSize: 14 }}>{ev.title}</strong>
                        <span style={p.tdMuted}>/{ev.slug}</span>
                      </td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{ev.owner_email ?? "—"}</td>
                      <td style={p.td}>{ev.event_type_key}</td>
                      <td style={{ ...p.td, textAlign: "right", fontWeight: 700 }}>{ev.photo_count}</td>
                      <td style={{ ...p.td, ...p.tdMuted }}>
                        {ev.event_date ? formatDate(ev.event_date) : "—"}
                      </td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{fmtTime(ev.created_at)}</td>
                      <td style={p.td}>
                        <button type="button" style={p.miniBtn} onClick={() => onSelectEvent(ev.id)}>
                          Editar
                        </button>
                        {ev.slug && (
                          <>
                            <a href={siteUrl(`/event/${ev.slug}`)} target="_blank" rel="noopener noreferrer" style={p.miniLink}>
                              Landing ↗
                            </a>
                            <a href={siteUrl(`/event/${ev.slug}/display`)} target="_blank" rel="noopener noreferrer" style={p.miniLink}>
                              Pantalla ↗
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div style={p.content}>
          <div style={p.tableActions}>
            <span style={p.tableCount}>{users.length} usuarios</span>
            <button type="button" style={p.refreshBtn} onClick={loadUsers} disabled={usersLoading}>
              {usersLoading ? "Cargando…" : "↺ Actualizar"}
            </button>
          </div>
          {usersLoading ? (
            <p style={p.loading}>Cargando usuarios…</p>
          ) : (
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead>
                  <tr>
                    <th style={p.th}>Email</th>
                    <th style={p.th}>Nombre</th>
                    <th style={p.th}>Rol actual</th>
                    <th style={{ ...p.th, textAlign: "right" }}>Eventos</th>
                    <th style={p.th}>Registro</th>
                    <th style={p.th}>Cambiar rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={user.email === userEmail ? { ...p.tr, background: "rgba(124,58,237,0.04)" } : p.tr}>
                      <td style={p.td}>
                        <span style={{ fontWeight: user.email === userEmail ? 700 : 400 }}>
                          {user.email}
                        </span>
                        {user.email === userEmail && (
                          <span style={p.youPill}>tú</span>
                        )}
                      </td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{user.display_name || "—"}</td>
                      <td style={p.td}>
                        <RolePill role={user.role} />
                      </td>
                      <td style={{ ...p.td, textAlign: "right", fontWeight: 600 }}>{user.event_count}</td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{fmtTime(user.created_at)}</td>
                      <td style={p.td}>
                        {user.email === userEmail ? (
                          <span style={{ fontSize: 12, opacity: 0.4 }}>—</span>
                        ) : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {ROLE_NEXT[user.role]?.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={roleChanging === user.id}
                                style={{
                                  ...p.miniBtn,
                                  color: opt.color,
                                  borderColor: opt.color + "55",
                                  opacity: roleChanging === user.id ? 0.5 : 1,
                                }}
                                onClick={() => changeRole(user.id, opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div style={{
      ...p.metricCard,
      background: accent ? "rgba(124,58,237,0.06)" : "#fff",
      border: `1px solid ${accent ? "rgba(124,58,237,0.18)" : "rgba(0,0,0,0.07)"}`,
    }}>
      <span style={p.metricIcon}>{icon}</span>
      <span style={{ ...p.metricValue, color: accent ? "#6d28d9" : "#111" }}>{value.toLocaleString()}</span>
      <span style={p.metricLabel}>{label}</span>
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    super_admin: { bg: "rgba(124,58,237,0.1)", color: "#6d28d9" },
    admin: { bg: "rgba(29,78,216,0.08)", color: "#1d4ed8" },
    owner: { bg: "rgba(0,0,0,0.05)", color: "#374151" },
  };
  const c = cfg[role] ?? cfg.owner;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    approved: { bg: "rgba(16,185,129,0.1)", color: "#065f46", label: "Aprobada" },
    pending: { bg: "rgba(245,158,11,0.1)", color: "#78350f", label: "Pendiente" },
    rejected: { bg: "rgba(239,68,68,0.1)", color: "#991b1b", label: "Rechazada" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// ─── styles ───────────────────────────────────────────────────────────────────

const p: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    minHeight: 0,
    flex: 1,
  },
  panelHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "24px 24px 0",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    paddingBottom: 0,
  },
  panelTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#111",
  },
  panelSub: {
    fontSize: 13,
    color: "var(--muted)",
    marginTop: 2,
    display: "block",
  },
  tabBar: {
    display: "flex",
    gap: 0,
    borderBottom: "none",
    marginTop: 8,
  },
  tab: {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    color: "var(--muted)",
    borderRadius: 0,
  },
  tabActive: {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    background: "none",
    border: "none",
    borderBottom: "2px solid #111",
    cursor: "pointer",
    color: "#111",
    borderRadius: 0,
  },
  content: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    overflowY: "auto",
    flex: 1,
  },
  loading: {
    color: "var(--muted)",
    fontSize: 14,
    margin: 0,
  },
  notice: {
    margin: "12px 24px 0",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid",
  },

  // Metrics
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 12,
  },
  metricCard: {
    borderRadius: 20,
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  metricIcon: { fontSize: 20 },
  metricValue: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  // Sections
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.02em",
  },

  // Table
  tableWrap: {
    overflowX: "auto",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.07)",
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    background: "rgba(0,0,0,0.015)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  td: {
    padding: "10px 14px",
    verticalAlign: "middle",
  },
  tdMuted: {
    color: "var(--muted)",
    fontSize: 12,
  },

  // Actions
  tableActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tableCount: {
    fontSize: 13,
    color: "var(--muted)",
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "6px 14px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    color: "var(--muted)",
  },
  miniBtn: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.1)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
    marginRight: 4,
  },
  miniLink: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.1)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: "#374151",
    marginRight: 4,
    textDecoration: "none",
    display: "inline-block",
  },

  // Users
  youPill: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 7px",
    borderRadius: 999,
    background: "rgba(124,58,237,0.1)",
    color: "#6d28d9",
    verticalAlign: "middle",
  },
};
