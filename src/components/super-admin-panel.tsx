"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  is_active: boolean;
};

type ProfileWithStats = Profile & { event_count: number };

type EventWithCount = EventRecord & { photo_count: number };

type GlobalStats = {
  totalEvents: number;
  activeEvents: number;
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

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  super_admin: "Super admin",
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
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // Stats
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([]);
  const [topEvents, setTopEvents] = useState<EventWithCount[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Events
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<ProfileWithStats[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithStats | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);

  const flash = useCallback((text: string, ok: boolean) => {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 3500);
  }, []);

  // ── data loading ────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

      const [
        { count: totalEvents },
        { count: activeEvents },
        { count: totalPhotos },
        { count: photosToday },
        { count: photosThisWeek },
        { count: totalUsers },
        { data: recentRows },
        { data: allPhotosForCounting },
        { data: allEvents },
      ] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("photos").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("photos").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("photos").select("id, event_id, created_at, uploaded_by_name, moderation_status").order("created_at", { ascending: false }).limit(12),
        supabase.from("photos").select("event_id"),
        supabase.from("events").select("*").order("updated_at", { ascending: false }),
      ]);

      setStats({
        totalEvents: totalEvents ?? 0,
        activeEvents: activeEvents ?? 0,
        totalPhotos: totalPhotos ?? 0,
        photosToday: photosToday ?? 0,
        photosThisWeek: photosThisWeek ?? 0,
        totalUsers: totalUsers ?? 0,
      });

      const eventMap = new Map((allEvents ?? []).map((e: EventRecord) => [e.id, e.title]));
      setRecentPhotos(
        (recentRows ?? []).map((p) => ({ ...p, event_title: eventMap.get(p.event_id) ?? p.event_id }))
      );

      const countMap = new Map<string, number>();
      for (const p of allPhotosForCounting ?? []) {
        countMap.set(p.event_id, (countMap.get(p.event_id) ?? 0) + 1);
      }
      setTopEvents(
        (allEvents ?? [])
          .map((e: EventRecord) => ({ ...e, photo_count: countMap.get(e.id) ?? 0 }))
          .sort((a: EventWithCount, b: EventWithCount) => b.photo_count - a.photo_count)
          .slice(0, 8)
      );
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
      const { data: eventsData } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      setEvents((eventsData ?? []).map((e: EventRecord) => ({ ...e, photo_count: countMap.get(e.id) ?? 0 })));
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.ok) { flash(json.message, false); return; }

      const { data: eventsData } = await supabase.from("events").select("id, owner_email");
      const evtMap = new Map<string, number>();
      for (const e of eventsData ?? []) {
        if (e.owner_email) evtMap.set(e.owner_email, (evtMap.get(e.owner_email) ?? 0) + 1);
      }
      setUsers(json.users.map((u: Profile) => ({ ...u, event_count: evtMap.get(u.email) ?? 0 })));
    } finally {
      setUsersLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "events") loadEvents();
    else if (tab === "users") loadUsers();
  }, [tab, loadStats, loadEvents, loadUsers]);

  // ── event actions ───────────────────────────────────────────────────────────

  const toggleEvent = async (eventId: string, current: boolean) => {
    setTogglingEventId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, is_active: !current } : e));
      flash(`Evento ${!current ? "activado" : "desactivado"}`, true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setTogglingEventId(null);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      flash("Evento eliminado", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setDeletingEventId(null);
      setConfirmDeleteEventId(null);
    }
  };

  // ── user actions ────────────────────────────────────────────────────────────

  const patchUser = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    return res.json() as Promise<{ ok: boolean; message?: string }>;
  };

  const toggleUser = async (user: ProfileWithStats) => {
    setTogglingUserId(user.id);
    try {
      const json = await patchUser(user.id, { is_active: !user.is_active });
      if (!json.ok) throw new Error(json.message);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
      flash(`Usuario ${!user.is_active ? "activado" : "desactivado"}`, true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setTogglingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      flash("Usuario eliminado", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteUserId(null);
    }
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
            <button key={t} type="button" onClick={() => setTab(t)} style={tab === t ? p.tabActive : p.tab}>
              {t === "stats" ? "Estadísticas" : t === "events" ? "Eventos" : "Usuarios"}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div style={{ ...p.notice, background: notice.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", borderColor: notice.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)", color: notice.ok ? "#065f46" : "#991b1b" }}>
          {notice.text}
        </div>
      )}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <div style={p.content}>
          {statsLoading ? <p style={p.loading}>Cargando estadísticas…</p> : stats ? (
            <>
              <div style={p.metricGrid}>
                <MetricCard label="Eventos activos" value={stats.activeEvents} total={stats.totalEvents} icon="📅" accent />
                <MetricCard label="Fotos totales" value={stats.totalPhotos} icon="🖼" />
                <MetricCard label="Fotos hoy" value={stats.photosToday} icon="⚡" highlight />
                <MetricCard label="Esta semana" value={stats.photosThisWeek} icon="📈" />
                <MetricCard label="Usuarios" value={stats.totalUsers} icon="👤" />
              </div>
              <div style={p.section}>
                <h3 style={p.sectionTitle}>Top eventos por fotos</h3>
                <div style={p.tableWrap}>
                  <table style={p.table}>
                    <thead><tr>
                      <th style={p.th}>Evento</th>
                      <th style={p.th}>Responsable</th>
                      <th style={{ ...p.th, textAlign: "right" }}>Fotos</th>
                      <th style={p.th}>Estado</th>
                      <th style={p.th}>Acciones</th>
                    </tr></thead>
                    <tbody>
                      {topEvents.map((ev) => (
                        <tr key={ev.id} style={p.tr}>
                          <td style={p.td}><strong style={{ fontSize: 14 }}>{ev.title}</strong><br /><span style={p.tdMuted}>/{ev.slug}</span></td>
                          <td style={{ ...p.td, ...p.tdMuted }}>{ev.owner_email ?? "—"}</td>
                          <td style={{ ...p.td, textAlign: "right", fontWeight: 700 }}>{ev.photo_count}</td>
                          <td style={p.td}><ActivePill active={ev.is_active} /></td>
                          <td style={p.td}>
                            <button type="button" style={p.miniBtn} onClick={() => onSelectEvent(ev.id)}>Editar</button>
                            {ev.slug && <a href={siteUrl(`/event/${ev.slug}`)} target="_blank" rel="noopener noreferrer" style={p.miniLink}>Landing ↗</a>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={p.section}>
                <h3 style={p.sectionTitle}>Actividad reciente</h3>
                <div style={p.tableWrap}>
                  <table style={p.table}>
                    <thead><tr>
                      <th style={p.th}>Evento</th>
                      <th style={p.th}>Subida por</th>
                      <th style={p.th}>Estado</th>
                      <th style={p.th}>Fecha</th>
                    </tr></thead>
                    <tbody>
                      {recentPhotos.map((ph) => (
                        <tr key={ph.id} style={p.tr}>
                          <td style={{ ...p.td, ...p.tdMuted }}>{ph.event_title}</td>
                          <td style={p.td}>{ph.uploaded_by_name ?? <em style={{ opacity: 0.45 }}>Anónimo</em>}</td>
                          <td style={p.td}><StatusPill status={ph.moderation_status} /></td>
                          <td style={{ ...p.td, ...p.tdMuted }}>{fmtDate(ph.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <p style={p.loading}>Sin datos.</p>}
        </div>
      )}

      {/* ── EVENTS ── */}
      {tab === "events" && (
        <div style={p.content}>
          <div style={p.tableActions}>
            <span style={p.tableCount}>{events.length} eventos</span>
            <button type="button" style={p.refreshBtn} onClick={loadEvents} disabled={eventsLoading}>{eventsLoading ? "Cargando…" : "↺ Actualizar"}</button>
          </div>
          {eventsLoading ? <p style={p.loading}>Cargando…</p> : (
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead><tr>
                  <th style={p.th}>Evento</th>
                  <th style={p.th}>Responsable</th>
                  <th style={{ ...p.th, textAlign: "right" }}>Fotos</th>
                  <th style={p.th}>Fecha evento</th>
                  <th style={p.th}>Estado</th>
                  <th style={p.th}>Acciones</th>
                </tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} style={{ ...p.tr, opacity: ev.is_active ? 1 : 0.55 }}>
                      <td style={p.td}>
                        <strong style={{ fontSize: 14 }}>{ev.title}</strong>
                        <br /><span style={p.tdMuted}>/{ev.slug}</span>
                      </td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{ev.owner_email ?? "—"}</td>
                      <td style={{ ...p.td, textAlign: "right", fontWeight: 700 }}>{ev.photo_count}</td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{ev.event_date ? formatDate(ev.event_date) : "—"}</td>
                      <td style={p.td}><ActivePill active={ev.is_active} /></td>
                      <td style={p.td}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button type="button" style={p.miniBtn} onClick={() => onSelectEvent(ev.id)}>Editar</button>
                          {ev.slug && <a href={siteUrl(`/event/${ev.slug}`)} target="_blank" rel="noopener noreferrer" style={p.miniLink}>Landing ↗</a>}
                          <button
                            type="button"
                            style={{ ...p.miniBtn, color: ev.is_active ? "#78350f" : "#065f46" }}
                            disabled={togglingEventId === ev.id}
                            onClick={() => toggleEvent(ev.id, ev.is_active)}
                          >
                            {togglingEventId === ev.id ? "…" : ev.is_active ? "Desactivar" : "Activar"}
                          </button>
                          {confirmDeleteEventId === ev.id ? (
                            <>
                              <button type="button" style={{ ...p.miniBtn, color: "#dc2626", borderColor: "#dc262655" }} disabled={deletingEventId === ev.id} onClick={() => deleteEvent(ev.id)}>
                                {deletingEventId === ev.id ? "Eliminando…" : "¿Confirmar?"}
                              </button>
                              <button type="button" style={p.miniBtn} onClick={() => setConfirmDeleteEventId(null)}>Cancelar</button>
                            </>
                          ) : (
                            <button type="button" style={{ ...p.miniBtn, color: "#dc2626", borderColor: "#dc262655" }} onClick={() => setConfirmDeleteEventId(ev.id)}>Eliminar</button>
                          )}
                        </div>
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
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={{ ...p.refreshBtn, color: "#6d28d9", borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" }} onClick={() => setShowNewUser(true)}>
                + Nuevo usuario
              </button>
              <button type="button" style={p.refreshBtn} onClick={loadUsers} disabled={usersLoading}>{usersLoading ? "Cargando…" : "↺ Actualizar"}</button>
            </div>
          </div>

          {showNewUser && (
            <NewUserForm
              onSaved={() => { setShowNewUser(false); loadUsers(); flash("Invitación enviada", true); }}
              onCancel={() => setShowNewUser(false)}
              onError={(msg) => flash(msg, false)}
            />
          )}

          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSaved={(updated) => {
                setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
                setEditingUser(null);
                flash("Usuario actualizado", true);
              }}
              onCancel={() => setEditingUser(null)}
              onError={(msg) => flash(msg, false)}
            />
          )}

          {usersLoading ? <p style={p.loading}>Cargando…</p> : (
            <div style={p.tableWrap}>
              <table style={p.table}>
                <thead><tr>
                  <th style={p.th}>Email</th>
                  <th style={p.th}>Nombre</th>
                  <th style={p.th}>Rol</th>
                  <th style={{ ...p.th, textAlign: "right" }}>Eventos</th>
                  <th style={p.th}>Estado</th>
                  <th style={p.th}>Registro</th>
                  <th style={p.th}>Acciones</th>
                </tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ ...p.tr, opacity: user.is_active ? 1 : 0.55 }}>
                      <td style={p.td}>
                        <span style={{ fontWeight: user.email === userEmail ? 700 : 400 }}>{user.email}</span>
                        {user.email === userEmail && <span style={p.youPill}>tú</span>}
                      </td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{user.display_name || "—"}</td>
                      <td style={p.td}><RolePill role={user.role} /></td>
                      <td style={{ ...p.td, textAlign: "right", fontWeight: 600 }}>{user.event_count}</td>
                      <td style={p.td}><ActivePill active={user.is_active} /></td>
                      <td style={{ ...p.td, ...p.tdMuted }}>{fmtDate(user.created_at)}</td>
                      <td style={p.td}>
                        {user.email === userEmail ? (
                          <span style={{ fontSize: 12, opacity: 0.4 }}>—</span>
                        ) : (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            <button type="button" style={p.miniBtn} onClick={() => setEditingUser(user)}>Editar</button>
                            <button
                              type="button"
                              style={{ ...p.miniBtn, color: user.is_active ? "#78350f" : "#065f46" }}
                              disabled={togglingUserId === user.id}
                              onClick={() => toggleUser(user)}
                            >
                              {togglingUserId === user.id ? "…" : user.is_active ? "Desactivar" : "Activar"}
                            </button>
                            {confirmDeleteUserId === user.id ? (
                              <>
                                <button type="button" style={{ ...p.miniBtn, color: "#dc2626", borderColor: "#dc262655" }} disabled={deletingUserId === user.id} onClick={() => deleteUser(user.id)}>
                                  {deletingUserId === user.id ? "Eliminando…" : "¿Confirmar?"}
                                </button>
                                <button type="button" style={p.miniBtn} onClick={() => setConfirmDeleteUserId(null)}>Cancelar</button>
                              </>
                            ) : (
                              <button type="button" style={{ ...p.miniBtn, color: "#dc2626", borderColor: "#dc262655" }} onClick={() => setConfirmDeleteUserId(user.id)}>Eliminar</button>
                            )}
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

// ─── NewUserForm ─────────────────────────────────────────────────────────────

function NewUserForm({ onSaved, onCancel, onError }: {
  onSaved: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("owner");
  const [saving, setSaving] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, display_name: displayName, role }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={p.inlineForm}>
      <strong style={{ fontSize: 14, fontWeight: 700 }}>Nuevo usuario</strong>
      <div style={p.formRow}>
        <div style={p.formField}>
          <label style={p.formLabel}>Email *</label>
          <input ref={emailRef} className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" style={p.formInput} />
        </div>
        <div style={p.formField}>
          <label style={p.formLabel}>Nombre</label>
          <input className="input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre completo" style={p.formInput} />
        </div>
        <div style={p.formField}>
          <label style={p.formLabel}>Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)} style={p.formInput}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }} disabled={saving}>
          {saving ? "Enviando invitación…" : "Enviar invitación"}
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancelar</button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Se enviará un magic link al correo para que el usuario active su cuenta.</p>
    </form>
  );
}

// ─── EditUserForm ─────────────────────────────────────────────────────────────

function EditUserForm({ user, onSaved, onCancel, onError }: {
  user: ProfileWithStats;
  onSaved: (updated: Partial<ProfileWithStats> & { id: string }) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, display_name: displayName, role }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      onSaved({ id: user.id, display_name: displayName, role: role as Profile["role"] });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={p.inlineForm}>
      <strong style={{ fontSize: 14, fontWeight: 700 }}>Editar usuario — {user.email}</strong>
      <div style={p.formRow}>
        <div style={p.formField}>
          <label style={p.formLabel}>Nombre</label>
          <input className="input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre completo" style={p.formInput} />
        </div>
        <div style={p.formField}>
          <label style={p.formLabel}>Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Profile["role"])} style={p.formInput}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, total, icon, accent, highlight }: {
  label: string; value: number; total?: number; icon: string; accent?: boolean; highlight?: boolean;
}) {
  const bg = highlight ? "rgba(245,158,11,0.06)" : accent ? "rgba(124,58,237,0.06)" : "#fff";
  const border = highlight ? "rgba(245,158,11,0.2)" : accent ? "rgba(124,58,237,0.18)" : "rgba(0,0,0,0.07)";
  const color = highlight ? "#92400e" : accent ? "#6d28d9" : "#111";
  return (
    <div style={{ ...p.metricCard, background: bg, border: `1px solid ${border}` }}>
      <span style={p.metricIcon}>{icon}</span>
      <span style={{ ...p.metricValue, color }}>{value.toLocaleString()}</span>
      {total !== undefined && total !== value && (
        <span style={{ fontSize: 11, color: "var(--muted)", marginTop: -4 }}>de {total}</span>
      )}
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
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color }}>{ROLE_LABELS[role] ?? role}</span>;
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
      background: active ? "rgba(16,185,129,0.1)" : "rgba(156,163,175,0.15)",
      color: active ? "#065f46" : "#6b7280",
    }}>
      {active ? "Activo" : "Inactivo"}
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
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color }}>{c.label}</span>;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ─── styles ───────────────────────────────────────────────────────────────────

const p: Record<string, React.CSSProperties> = {
  shell: { display: "flex", flexDirection: "column", gap: 0, minHeight: 0, flex: 1 },
  panelHeader: {
    display: "flex", flexDirection: "column", gap: 16,
    padding: "24px 24px 0", borderBottom: "1px solid rgba(0,0,0,0.07)",
  },
  panelTitle: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#111" },
  panelSub: { fontSize: 13, color: "var(--muted)", marginTop: 2, display: "block" },
  tabBar: { display: "flex", gap: 0, marginTop: 8 },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 600, background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", color: "var(--muted)", borderRadius: 0 },
  tabActive: { padding: "10px 18px", fontSize: 14, fontWeight: 700, background: "none", border: "none", borderBottom: "2px solid #111", cursor: "pointer", color: "#111", borderRadius: 0 },
  content: { padding: "24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 },
  loading: { color: "var(--muted)", fontSize: 14, margin: 0 },
  notice: { margin: "12px 24px 0", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "1px solid" },

  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
  metricCard: { borderRadius: 20, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6 },
  metricIcon: { fontSize: 20 },
  metricValue: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 },
  metricLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" },

  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" },

  tableWrap: { overflowX: "auto", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.015)", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid rgba(0,0,0,0.05)" },
  td: { padding: "10px 14px", verticalAlign: "middle" },
  tdMuted: { color: "var(--muted)", fontSize: 12 },

  tableActions: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  tableCount: { fontSize: 13, color: "var(--muted)", fontWeight: 600 },
  refreshBtn: { padding: "6px 14px", borderRadius: 999, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--muted)" },
  miniBtn: { padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" },
  miniLink: { padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151", textDecoration: "none", display: "inline-block" },
  youPill: { marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: "rgba(124,58,237,0.1)", color: "#6d28d9", verticalAlign: "middle" },

  inlineForm: {
    display: "flex", flexDirection: "column", gap: 14,
    background: "#fff", border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: 20, padding: "18px 20px",
  },
  formRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  formField: { display: "flex", flexDirection: "column", gap: 6, flex: "1 1 180px" },
  formLabel: { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  formInput: { fontSize: 14 },
};
