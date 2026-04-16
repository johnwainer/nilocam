"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatDate, siteUrl } from "@/lib/utils";
import type { CreditPricing, CreditPurchase, EmailSettings, EventRecord, PaymentSettings } from "@/types";
import { SuperCreditsPanel } from "@/components/credits-panel";
import { PasswordInput } from "@/components/password-input";
import { HtmlEditor } from "@/components/html-editor";

const supabase = createSupabaseBrowserClient();

// ─── types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "super_admin";
  created_at: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
};

type ProfileWithStats = Profile & { event_count: number; credits: number };

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

type SATab = "stats" | "events" | "users" | "credits" | "payments" | "email";

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
  const [adjustingCreditsFor, setAdjustingCreditsFor] = useState<ProfileWithStats | null>(null);
  const [regeneratingLinkFor, setRegeneratingLinkFor] = useState<string | null>(null);
  const [regeneratedLink, setRegeneratedLink] = useState<{ email: string; link: string } | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<ProfileWithStats | null>(null);

  // Events search / filter / sort
  const [eventsSearch, setEventsSearch] = useState("");
  const [eventsStatus, setEventsStatus] = useState<"all" | "active" | "inactive">("all");
  const [eventsSort, setEventsSort] = useState("created_desc");

  // Users search / filter / sort
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRole, setUsersRole] = useState<"all" | "owner" | "admin" | "super_admin">("all");
  const [usersStatus, setUsersStatus] = useState<"all" | "active" | "inactive">("all");
  const [usersSort, setUsersSort] = useState("created_desc");

  // Pricing
  const [pricingList, setPricingList] = useState<CreditPricing[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [savingPriceKey, setSavingPriceKey] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});

  // Payments
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySaving, setPaySaving] = useState(false);
  const [paySubTab, setPaySubTab] = useState<"config" | "purchases">("config");
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseFilter, setPurchaseFilter] = useState<"all" | "pending" | "completed" | "rejected">("pending");
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Email
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [creditsSubTab, setCreditsSubTab] = useState<"saldos" | "precios">("saldos");

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
      setUsers(json.users.map((u: Profile & { credits?: number }) => ({ ...u, event_count: evtMap.get(u.email) ?? 0, credits: u.credits ?? 0 })));
    } finally {
      setUsersLoading(false);
    }
  }, [flash]);

  const loadPricing = useCallback(async () => {
    setPricingLoading(true);
    try {
      const res = await fetch("/api/admin/pricing");
      const json = await res.json();
      if (json.ok) {
        setPricingList(json.pricing);
        const initial: Record<string, number> = {};
        for (const pr of json.pricing) initial[pr.key] = pr.credits;
        setEditingPrices(initial);
      }
    } finally {
      setPricingLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPayLoading(true);
    setPayError(null);
    try {
      const res = await fetch("/api/admin/payment-settings");
      const json = await res.json();
      if (json.ok) {
        setPaySettings(json.settings);
      } else {
        setPayError(json.message ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setPayLoading(false);
    }
  }, []);

  const loadPurchases = useCallback(async (status: string) => {
    setPurchasesLoading(true);
    try {
      const res = await fetch(`/api/admin/purchases?status=${status}`);
      const json = await res.json();
      if (json.ok) setPurchases(json.purchases);
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  const loadEmailSettings = useCallback(async () => {
    setEmailLoading(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/admin/email-settings");
      const json = await res.json();
      if (json.ok) {
        setEmailSettings(json.settings);
      } else {
        setEmailError(json.message ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setEmailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "events") loadEvents();
    else if (tab === "users") loadUsers();
    else if (tab === "payments") loadPayments();
    else if (tab === "email") loadEmailSettings();
  }, [tab, loadStats, loadEvents, loadUsers, loadPayments, loadEmailSettings]);

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

  const resetPassword = async (user: ProfileWithStats, newPassword: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", id: user.id, new_password: newPassword }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      flash(`Contraseña actualizada para ${user.email}`, true);
      setResettingPasswordFor(null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    }
  };

  const regenerateLink = async (user: ProfileWithStats) => {
    setRegeneratingLinkFor(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate_link", email: user.email }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setRegeneratedLink({ email: user.email, link: json.magic_link });
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setRegeneratingLinkFor(null);
    }
  };

  // ── pricing actions ────────────────────────────────────────────────────────

  const savePrice = async (key: string) => {
    const credits = editingPrices[key];
    if (credits === undefined) return;
    setSavingPriceKey(key);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, credits }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setPricingList((prev) => prev.map((pr) => pr.key === key ? { ...pr, credits } : pr));
      flash("Precio actualizado", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally {
      setSavingPriceKey(null);
    }
  };

  const adjustCredits = async (user: ProfileWithStats, amount: number, description: string) => {
    try {
      const res = await fetch("/api/admin/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, user_email: user.email, amount, description }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, credits: json.credits } : u));
      flash(`Créditos actualizados: ${json.credits} ◈`, true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    }
  };

  // ── derived filtered/sorted lists ───────────────────────────────────────────

  const filteredEvents = events
    .filter((ev) => {
      const q = eventsSearch.toLowerCase();
      if (q && !ev.title.toLowerCase().includes(q) && !ev.slug.toLowerCase().includes(q) && !(ev.owner_email ?? "").toLowerCase().includes(q)) return false;
      if (eventsStatus === "active" && !ev.is_active) return false;
      if (eventsStatus === "inactive" && ev.is_active) return false;
      return true;
    })
    .sort((a, b) => {
      switch (eventsSort) {
        case "title_asc":    return a.title.localeCompare(b.title);
        case "title_desc":   return b.title.localeCompare(a.title);
        case "photos_desc":  return b.photo_count - a.photo_count;
        case "date_asc":     return (a.event_date ?? "").localeCompare(b.event_date ?? "");
        case "date_desc":    return (b.event_date ?? "").localeCompare(a.event_date ?? "");
        case "created_asc":  return a.created_at.localeCompare(b.created_at);
        default:             return b.created_at.localeCompare(a.created_at); // created_desc
      }
    });

  const filteredUsers = users
    .filter((u) => {
      const q = usersSearch.toLowerCase();
      if (q && !u.email.toLowerCase().includes(q) && !(u.display_name ?? "").toLowerCase().includes(q)) return false;
      if (usersRole !== "all" && u.role !== usersRole) return false;
      if (usersStatus === "active" && !u.is_active) return false;
      if (usersStatus === "inactive" && u.is_active) return false;
      return true;
    })
    .sort((a, b) => {
      switch (usersSort) {
        case "email_asc":    return a.email.localeCompare(b.email);
        case "credits_desc": return b.credits - a.credits;
        case "events_desc":  return b.event_count - a.event_count;
        case "created_asc":  return a.created_at.localeCompare(b.created_at);
        default:             return b.created_at.localeCompare(a.created_at); // created_desc
      }
    });

  // ── render ──────────────────────────────────────────────────────────────────

  const NAV_ITEMS: Array<{ tab: SATab; icon: string; label: string; sub: string }> = [
    { tab: "stats",    icon: "▦",  label: "Dashboard",  sub: "Visión general" },
    { tab: "events",   icon: "📅", label: "Eventos",    sub: "Gestión de eventos" },
    { tab: "users",    icon: "👤", label: "Usuarios",   sub: "Cuentas y roles" },
    { tab: "credits",  icon: "◈",  label: "Créditos",   sub: "Saldos y precios" },
    { tab: "payments", icon: "💳", label: "Pagos",      sub: "Métodos y compras" },
    { tab: "email",    icon: "✉",  label: "Email",      sub: "Config. y plantillas" },
  ];

  return (
    <div style={p.shell}>
      <div style={p.layout}>

        {/* ── Sidebar ── */}
        <aside style={p.sidebar}>
          <div style={p.sidebarBrand}>
            <span style={{ fontSize: 24, lineHeight: 1, color: "#6d28d9" }}>◈</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>Sistema</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
            </div>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 10px" }}>
            {NAV_ITEMS.map(({ tab: t, icon, label, sub }) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 10, border: "none",
                  background: tab === t ? "rgba(109,40,217,0.1)" : "transparent",
                  cursor: "pointer", textAlign: "left", width: "100%",
                }}
              >
                <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: tab === t ? 700 : 600, color: tab === t ? "#6d28d9" : "#374151", lineHeight: 1.2 }}>{label}</span>
                  <span style={{ fontSize: 11, color: tab === t ? "rgba(109,40,217,0.55)" : "var(--muted)", lineHeight: 1.2 }}>{sub}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ── */}
        <div style={p.main}>
          {notice && (
            <div style={{ ...p.notice, background: notice.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", borderColor: notice.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)", color: notice.ok ? "#065f46" : "#991b1b" }}>
              {notice.text}
            </div>
          )}

          {/* ── STATS ── */}
          {tab === "stats" && (
            <div style={p.content}>
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Dashboard</h2>
                  <p style={p.pageDesc}>Resumen en tiempo real de toda la plataforma.</p>
                </div>
                <button type="button" style={p.refreshBtn} onClick={loadStats} disabled={statsLoading}>{statsLoading ? "Actualizando…" : "↺ Actualizar"}</button>
              </div>
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
                              {ev.slug && <a href={siteUrl(`/event/${ev.slug}`)} target="_blank" rel="noopener noreferrer" style={{ ...p.miniLink, marginLeft: 5 }}>Landing ↗</a>}
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
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Eventos</h2>
                  <p style={p.pageDesc}>Todos los eventos del sistema. Actívalos, desactívalos o elimínalos.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={p.tableCount}>{filteredEvents.length} de {events.length}</span>
                  <button type="button" style={p.refreshBtn} onClick={loadEvents} disabled={eventsLoading}>{eventsLoading ? "Actualizando…" : "↺ Actualizar"}</button>
                </div>
              </div>
              <div style={p.filterBar}>
            <div style={p.searchWrap}>
              <svg style={p.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="6"/><path d="M15 15l-3.5-3.5"/></svg>
              <input
                placeholder="Buscar título, slug o responsable…"
                value={eventsSearch}
                onChange={(e) => setEventsSearch(e.target.value)}
                style={p.searchInput}
              />
              {eventsSearch && <button type="button" onClick={() => setEventsSearch("")} style={p.searchClear}>✕</button>}
            </div>
            <div style={p.filterGroup}>
              <select style={p.filterSel} value={eventsStatus} onChange={(e) => setEventsStatus(e.target.value as typeof eventsStatus)}>
                <option value="all">Estado: todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <select style={p.filterSel} value={eventsSort} onChange={(e) => setEventsSort(e.target.value)}>
                <option value="created_desc">↓ Más reciente</option>
                <option value="created_asc">↑ Más antiguo</option>
                <option value="title_asc">A → Z</option>
                <option value="title_desc">Z → A</option>
                <option value="photos_desc">Más fotos</option>
                <option value="date_asc">Fecha próxima</option>
                <option value="date_desc">Fecha lejana</option>
              </select>
            </div>
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
                      {filteredEvents.length === 0 && (
                        <tr><td colSpan={6} style={{ ...p.td, textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>Sin resultados</td></tr>
                      )}
                      {filteredEvents.map((ev) => (
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
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Usuarios</h2>
                  <p style={p.pageDesc}>Gestiona cuentas, roles, créditos y acceso al sistema.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ ...p.tableCount, alignSelf: "center" }}>{filteredUsers.length} de {users.length}</span>
                  <button type="button" style={{ ...p.refreshBtn, color: "#6d28d9", borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" }} onClick={() => setShowNewUser(true)}>
                    + Nuevo usuario
                  </button>
                  <button type="button" style={p.refreshBtn} onClick={loadUsers} disabled={usersLoading}>{usersLoading ? "Actualizando…" : "↺ Actualizar"}</button>
                </div>
              </div>
              <div style={p.filterBar}>
            <div style={p.searchWrap}>
              <svg style={p.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="6"/><path d="M15 15l-3.5-3.5"/></svg>
              <input
                placeholder="Buscar email o nombre…"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                style={p.searchInput}
              />
              {usersSearch && <button type="button" onClick={() => setUsersSearch("")} style={p.searchClear}>✕</button>}
            </div>
            <div style={p.filterGroup}>
              <select style={p.filterSel} value={usersRole} onChange={(e) => setUsersRole(e.target.value as typeof usersRole)}>
                <option value="all">Rol: todos</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
              <select style={p.filterSel} value={usersStatus} onChange={(e) => setUsersStatus(e.target.value as typeof usersStatus)}>
                <option value="all">Estado: todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <select style={p.filterSel} value={usersSort} onChange={(e) => setUsersSort(e.target.value)}>
                <option value="created_desc">↓ Más reciente</option>
                <option value="created_asc">↑ Más antiguo</option>
                <option value="email_asc">Email A → Z</option>
                <option value="credits_desc">Más créditos</option>
                <option value="events_desc">Más eventos</option>
              </select>
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

          {adjustingCreditsFor && (
            <AdjustCreditsForm
              user={adjustingCreditsFor}
              onSaved={(amount, desc) => { adjustCredits(adjustingCreditsFor, amount, desc); setAdjustingCreditsFor(null); }}
              onCancel={() => setAdjustingCreditsFor(null)}
            />
          )}

          {regeneratedLink && (
            <RegeneratedLinkBox
              email={regeneratedLink.email}
              link={regeneratedLink.link}
              onClose={() => setRegeneratedLink(null)}
            />
          )}

          {resettingPasswordFor && (
            <ResetPasswordForm
              user={resettingPasswordFor}
              onSaved={(pwd) => resetPassword(resettingPasswordFor, pwd)}
              onCancel={() => setResettingPasswordFor(null)}
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
                      <th style={{ ...p.th, textAlign: "right" }}>Créditos</th>
                      <th style={p.th}>Estado</th>
                      <th style={p.th}>Registro</th>
                      <th style={p.th}>Acciones</th>
                    </tr></thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={8} style={{ ...p.td, textAlign: "center", color: "var(--muted)", padding: "24px 0" }}>Sin resultados</td></tr>
                      )}
                      {filteredUsers.map((user) => (
                        <tr key={user.id} style={{ ...p.tr, opacity: user.is_active ? 1 : 0.55 }}>
                          <td style={p.td}>
                            <span style={{ fontWeight: user.email === userEmail ? 700 : 400 }}>{user.email}</span>
                            {user.email === userEmail && <span style={p.youPill}>tú</span>}
                          </td>
                          <td style={{ ...p.td, ...p.tdMuted }}>{user.display_name || "—"}</td>
                          <td style={p.td}><RolePill role={user.role} /></td>
                          <td style={{ ...p.td, textAlign: "right", fontWeight: 600 }}>{user.event_count}</td>
                          <td style={{ ...p.td, textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <span style={{ fontWeight: 700, color: "#6d28d9" }}>◈ {user.credits}</span>
                              <button type="button" style={{ ...p.miniBtn, fontSize: 10 }} onClick={() => setAdjustingCreditsFor(user)}>±</button>
                            </div>
                          </td>
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
                                <button
                                  type="button"
                                  style={{ ...p.miniBtn, color: "#374151" }}
                                  onClick={() => { setResettingPasswordFor(user); setRegeneratedLink(null); }}
                                >
                                  Contraseña
                                </button>
                                {!user.last_sign_in_at && (
                                  <button
                                    type="button"
                                    style={{ ...p.miniBtn, color: "#1d4ed8", borderColor: "rgba(29,78,216,0.3)" }}
                                    disabled={regeneratingLinkFor === user.id}
                                    onClick={() => { setRegeneratedLink(null); setResettingPasswordFor(null); regenerateLink(user); }}
                                  >
                                    {regeneratingLinkFor === user.id ? "…" : "↻ Link"}
                                  </button>
                                )}
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

          {/* ── CREDITS ── */}
          {tab === "credits" && (
            <div style={p.content}>
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Créditos</h2>
                  <p style={p.pageDesc}>Consulta saldos de usuarios y configura el costo de cada operación.</p>
                </div>
              </div>
              <div style={p.subTabBar}>
                {(["saldos", "precios"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => { setCreditsSubTab(st); if (st === "precios" && pricingList.length === 0) loadPricing(); }}
                    style={creditsSubTab === st ? p.subTabActive : p.subTab}
                  >
                    {st === "saldos" ? "Saldos por usuario" : "Tabla de precios"}
                  </button>
                ))}
              </div>
              {creditsSubTab === "saldos" && <SuperCreditsPanel userEmail={userEmail} />}
              {creditsSubTab === "precios" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                      Cuántos créditos cuesta cada operación. Los cambios aplican a la siguiente transacción.
                    </p>
                    <button type="button" style={p.refreshBtn} onClick={loadPricing} disabled={pricingLoading}>{pricingLoading ? "Actualizando…" : "↺ Actualizar"}</button>
                  </div>
                  {pricingLoading ? <p style={p.loading}>Cargando…</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[...pricingList].sort((a, b) => a.key === "initial_credits" ? -1 : b.key === "initial_credits" ? 1 : 0).map((pr) => {
                        const isInitial = pr.key === "initial_credits";
                        return (
                          <div key={pr.key} style={isInitial ? p.pricingRowHighlight : p.pricingRow}>
                            <div style={{ flex: 1 }}>
                              {isInitial && <span style={p.pricingBadge}>Bienvenida</span>}
                              <strong style={{ fontSize: 14, color: "#111", display: "block" }}>{pr.label}</strong>
                              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>{pr.description}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, color: "#6d28d9", fontWeight: 700 }}>◈</span>
                              <input
                                className="input"
                                type="number"
                                min={0}
                                style={{ width: 72, fontSize: 15, fontWeight: 700, textAlign: "center", padding: "7px 8px" }}
                                value={editingPrices[pr.key] ?? pr.credits}
                                onChange={(e) => setEditingPrices((prev) => ({ ...prev, [pr.key]: parseInt(e.target.value) || 0 }))}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: 13, padding: "8px 16px" }}
                                disabled={savingPriceKey === pr.key || editingPrices[pr.key] === pr.credits}
                                onClick={() => savePrice(pr.key)}
                              >
                                {savingPriceKey === pr.key ? "Guardando…" : "Guardar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === "payments" && (
            <div style={p.content}>
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Pagos</h2>
                  <p style={p.pageDesc}>Configura los métodos de pago aceptados y revisa las compras de créditos.</p>
                </div>
              </div>
              <div style={p.subTabBar}>
                {(["config", "purchases"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setPaySubTab(st);
                      if (st === "config" && !paySettings) loadPayments();
                      if (st === "purchases") loadPurchases(purchaseFilter);
                    }}
                    style={paySubTab === st ? p.subTabActive : p.subTab}
                  >
                    {st === "config" ? "Métodos de pago" : "Compras de créditos"}
                  </button>
                ))}
              </div>

              {paySubTab === "config" && (
                payLoading ? <p style={p.loading}>Cargando configuración…</p> : paySettings ? (
                  <PaymentsTab
                    settings={paySettings}
                    saving={paySaving}
                    onSave={async (patch) => {
                      setPaySaving(true);
                      try {
                        const res = await fetch("/api/admin/payment-settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(patch),
                        });
                        const json = await res.json();
                        if (!json.ok) throw new Error(json.message);
                        setPaySettings((prev) => prev ? { ...prev, ...patch } : prev);
                        flash("Configuración de pagos guardada", true);
                      } catch (e) {
                        flash(e instanceof Error ? e.message : "Error", false);
                      } finally {
                        setPaySaving(false);
                      }
                    }}
                  />
                ) : (
                  <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "14px 18px" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Error cargando configuración de pagos</p>
                    {payError && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#b91c1c", fontFamily: "monospace" }}>{payError}</p>}
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Ejecuta el archivo <strong>supabase/setup-payments-complete.sql</strong> en Supabase SQL Editor y luego reintenta.
                    </p>
                    <button type="button" style={{ ...p.refreshBtn, marginTop: 10 }} onClick={loadPayments}>↺ Reintentar</button>
                  </div>
                )
              )}

              {paySubTab === "purchases" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                    {(["pending", "completed", "rejected", "all"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        style={purchaseFilter === f ? { ...p.miniBtn, background: "rgba(0,0,0,0.1)", fontWeight: 700, color: "#111" } : p.miniBtn}
                        onClick={() => { setPurchaseFilter(f); loadPurchases(f); }}
                      >
                        {f === "pending" ? "Pendientes" : f === "completed" ? "Aprobadas" : f === "rejected" ? "Rechazadas" : "Todas"}
                      </button>
                    ))}
                    <button type="button" style={p.miniBtn} onClick={() => loadPurchases(purchaseFilter)} disabled={purchasesLoading}>
                      {purchasesLoading ? "…" : "↺"}
                    </button>
                  </div>

                  {purchasesLoading ? (
                    <p style={p.loading}>Cargando…</p>
                  ) : purchases.length === 0 ? (
                    <p style={p.loading}>No hay compras {purchaseFilter === "pending" ? "pendientes" : ""}.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {purchases.map((pur) => (
                        <div key={pur.id} style={p.purchaseRow}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                              <strong style={{ fontSize: 14, color: "#111" }}>{pur.user_email}</strong>
                              <PurchaseStatusPill status={pur.status} />
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                {pur.payment_method === "stripe" ? "💳 Tarjeta" : pur.payment_method === "paypal" ? "🅿 PayPal" : "🏦 Transferencia"}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: "#374151", marginTop: 3 }}>
                              <strong style={{ color: "#6d28d9" }}>{pur.credits} créditos</strong>
                              {" · "}
                              <span>${pur.amount_usd} USD</span>
                              {" · "}
                              <span style={{ color: "var(--muted)" }}>{fmtDate(pur.created_at)}</span>
                            </div>
                            {pur.proof_url && (
                              <a href={pur.proof_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563eb", marginTop: 4, display: "inline-block" }}>
                                📎 Ver comprobante
                              </a>
                            )}
                            {pur.admin_notes && (
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>Nota: {pur.admin_notes}</p>
                            )}
                            {pur.status === "pending" && (
                              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
                                <input
                                  className="input"
                                  type="text"
                                  placeholder="Nota opcional…"
                                  value={adminNotes[pur.id] ?? ""}
                                  onChange={(e) => setAdminNotes((prev) => ({ ...prev, [pur.id]: e.target.value }))}
                                  style={{ fontSize: 13, flex: "1 1 200px" }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ fontSize: 12, padding: "6px 14px", background: "#059669", borderColor: "#059669" }}
                                  disabled={processingPurchaseId === pur.id}
                                  onClick={async () => {
                                    setProcessingPurchaseId(pur.id);
                                    try {
                                      const res = await fetch(`/api/admin/purchases/${pur.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ action: "approve", admin_notes: adminNotes[pur.id] }),
                                      });
                                      const json = await res.json();
                                      if (!json.ok) throw new Error(json.message);
                                      flash(`Compra aprobada — ${pur.credits} créditos otorgados a ${pur.user_email}`, true);
                                      loadPurchases(purchaseFilter);
                                    } catch (e) { flash(e instanceof Error ? e.message : "Error", false); }
                                    finally { setProcessingPurchaseId(null); }
                                  }}
                                >
                                  ✓ Aprobar
                                </button>
                                <button
                                  type="button"
                                  style={{ ...p.miniBtn, color: "#b91c1c", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}
                                  disabled={processingPurchaseId === pur.id}
                                  onClick={async () => {
                                    setProcessingPurchaseId(pur.id);
                                    try {
                                      const res = await fetch(`/api/admin/purchases/${pur.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ action: "reject", admin_notes: adminNotes[pur.id] }),
                                      });
                                      const json = await res.json();
                                      if (!json.ok) throw new Error(json.message);
                                      flash("Compra rechazada.", true);
                                      loadPurchases(purchaseFilter);
                                    } catch (e) { flash(e instanceof Error ? e.message : "Error", false); }
                                    finally { setProcessingPurchaseId(null); }
                                  }}
                                >
                                  ✗ Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EMAIL ── */}
          {tab === "email" && (
            <div style={p.content}>
              <div style={p.pageHead}>
                <div>
                  <h2 style={p.pageTitle}>Email</h2>
                  <p style={p.pageDesc}>Configura el proveedor de envío y personaliza las plantillas de notificación automática.</p>
                </div>
              </div>
              {emailLoading ? (
                <p style={p.loading}>Cargando configuración de email…</p>
              ) : emailError ? (
                <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "14px 18px" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Error cargando configuración</p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#b91c1c", fontFamily: "monospace" }}>{emailError}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
                    Ejecuta el archivo <strong>supabase/setup-email-settings.sql</strong> en Supabase SQL Editor y luego reintenta.
                  </p>
                  <button type="button" style={{ ...p.refreshBtn, marginTop: 10 }} onClick={loadEmailSettings}>↺ Reintentar</button>
                </div>
              ) : emailSettings ? (
                <EmailTab
                  settings={emailSettings}
                  saving={emailSaving}
                  testSending={emailTestSending}
                  onSave={async (draft) => {
                    setEmailSaving(true);
                    try {
                      const res = await fetch("/api/admin/email-settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(draft),
                      });
                      const json = await res.json();
                      if (!json.ok) throw new Error(json.message);
                      setEmailSettings(draft);
                      flash("Configuración de email guardada", true);
                    } catch (e) {
                      flash(e instanceof Error ? e.message : "Error", false);
                    } finally {
                      setEmailSaving(false);
                    }
                  }}
                  onTest={async (draft) => {
                    setEmailTestSending(true);
                    try {
                      const res = await fetch("/api/admin/email-settings/test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ settings: draft }),
                      });
                      const json = await res.json();
                      if (!json.ok) throw new Error(json.message);
                      flash(json.message ?? "Email de prueba enviado", true);
                    } catch (e) {
                      flash(e instanceof Error ? e.message : "Error enviando email de prueba", false);
                    } finally {
                      setEmailTestSending(false);
                    }
                  }}
                />
              ) : null}
            </div>
          )}

        </div>{/* /main */}
      </div>{/* /layout */}
    </div>
  );
}

// ─── PaymentsTab ──────────────────────────────────────────────────────────────

function PaymentsTab({
  settings,
  saving,
  onSave,
}: {
  settings: PaymentSettings;
  saving: boolean;
  onSave: (patch: Partial<PaymentSettings>) => void;
}) {
  const [draft, setDraft] = useState<PaymentSettings>({
    ...settings,
    stripe_webhook_secret: settings.stripe_webhook_secret ?? "",
    paypal_sandbox: settings.paypal_sandbox ?? false,
  });

  const set = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setBankInfo = (key: string, value: string) =>
    setDraft((prev) => ({
      ...prev,
      bank_transfer_info: { ...prev.bank_transfer_info, [key]: value },
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Credit price */}
      <div style={p.paySection}>
        <div style={p.paySectionHead}>
          <span style={p.paySectionTitle}>💰 Valor del crédito</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>1 crédito =</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>$</span>
            <input
              className="input"
              type="number"
              min={0.01}
              step={0.01}
              value={draft.credit_price_usd}
              onChange={(e) => set("credit_price_usd", parseFloat(e.target.value) || 0)}
              style={{ width: 100, fontSize: 15, fontWeight: 700, textAlign: "center" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>USD</span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Define cuánto cuesta un crédito en USD. Se aplica a todas las compras nuevas.
        </p>
      </div>

      {/* Stripe */}
      <div style={p.paySection}>
        <div style={p.paySectionHead}>
          <span style={p.paySectionTitle}>💳 Stripe</span>
          <label style={p.toggleLabel}>
            <input
              type="checkbox"
              checked={draft.stripe_enabled}
              onChange={(e) => set("stripe_enabled", e.target.checked)}
              style={{ marginRight: 6 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: draft.stripe_enabled ? "#059669" : "var(--muted)" }}>
              {draft.stripe_enabled ? "Activo" : "Inactivo"}
            </span>
          </label>
        </div>
        <div style={p.payFieldRow}>
          <div style={p.payField}>
            <label style={p.formLabel}>Clave pública (pk_live_… / pk_test_…)</label>
            <input
              className="input"
              type="text"
              value={draft.stripe_public_key}
              onChange={(e) => set("stripe_public_key", e.target.value)}
              placeholder="pk_live_…"
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>Clave secreta (sk_live_… / sk_test_…)</label>
            <PasswordInput
              className="input"
              value={draft.stripe_secret_key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("stripe_secret_key", e.target.value)}
              placeholder="sk_live_…"
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>Webhook Signing Secret (whsec_…)</label>
            <PasswordInput
              className="input"
              value={draft.stripe_webhook_secret}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("stripe_webhook_secret", e.target.value)}
              placeholder="whsec_…"
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.025)", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            <strong>Claves API:</strong> dashboard.stripe.com → Developers → API keys<br />
            <strong>Webhook:</strong> dashboard.stripe.com → Developers → Webhooks → Add endpoint<br />
            URL a registrar: <code style={{ fontSize: 11, background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4 }}>https://tudominio.com/api/payments/stripe/webhook</code> · Evento: <code style={{ fontSize: 11, background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4 }}>payment_intent.succeeded</code>
          </p>
        </div>
      </div>

      {/* PayPal */}
      <div style={p.paySection}>
        <div style={p.paySectionHead}>
          <span style={p.paySectionTitle}>🅿 PayPal</span>
          <label style={p.toggleLabel}>
            <input
              type="checkbox"
              checked={draft.paypal_enabled}
              onChange={(e) => set("paypal_enabled", e.target.checked)}
              style={{ marginRight: 6 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: draft.paypal_enabled ? "#059669" : "var(--muted)" }}>
              {draft.paypal_enabled ? "Activo" : "Inactivo"}
            </span>
          </label>
        </div>
        <div style={p.payFieldRow}>
          <div style={p.payField}>
            <label style={p.formLabel}>Client ID</label>
            <input
              className="input"
              type="text"
              value={draft.paypal_client_id}
              onChange={(e) => set("paypal_client_id", e.target.value)}
              placeholder="AYz..."
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>Secret</label>
            <PasswordInput
              className="input"
              value={draft.paypal_secret}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("paypal_secret", e.target.value)}
              placeholder="Secret"
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
        </div>
        <label style={{ ...p.toggleLabel, gap: 8 }}>
          <input
            type="checkbox"
            checked={draft.paypal_sandbox}
            onChange={(e) => set("paypal_sandbox", e.target.checked)}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: draft.paypal_sandbox ? "#92400e" : "#059669" }}>
            {draft.paypal_sandbox ? "🧪 Modo sandbox (pruebas)" : "🚀 Modo producción (Live)"}
          </span>
        </label>
        <div style={{ background: "rgba(0,0,0,0.025)", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            <strong>Credenciales:</strong> developer.paypal.com → My Apps & Credentials<br />
            Usa credenciales <strong>Sandbox</strong> para pruebas y <strong>Live</strong> para producción. El toggle de arriba controla a qué entorno se conecta.
          </p>
        </div>
      </div>

      {/* Bank Transfer */}
      <div style={p.paySection}>
        <div style={p.paySectionHead}>
          <span style={p.paySectionTitle}>🏦 Transferencia bancaria</span>
          <label style={p.toggleLabel}>
            <input
              type="checkbox"
              checked={draft.bank_transfer_enabled}
              onChange={(e) => set("bank_transfer_enabled", e.target.checked)}
              style={{ marginRight: 6 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: draft.bank_transfer_enabled ? "#059669" : "var(--muted)" }}>
              {draft.bank_transfer_enabled ? "Activo" : "Inactivo"}
            </span>
          </label>
        </div>
        <div style={p.payFieldRow}>
          <div style={p.payField}>
            <label style={p.formLabel}>Banco</label>
            <input className="input" type="text" value={draft.bank_transfer_info.bank_name ?? ""} onChange={(e) => setBankInfo("bank_name", e.target.value)} placeholder="ej. Banco Nacional" style={{ fontSize: 13 }} />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>Titular de la cuenta</label>
            <input className="input" type="text" value={draft.bank_transfer_info.account_holder ?? ""} onChange={(e) => setBankInfo("account_holder", e.target.value)} placeholder="Nombre completo" style={{ fontSize: 13 }} />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>Número de cuenta / CLABE</label>
            <input className="input" type="text" value={draft.bank_transfer_info.account_number ?? ""} onChange={(e) => setBankInfo("account_number", e.target.value)} placeholder="XXXXXXXXXXXXXXXXXXXX" style={{ fontSize: 13 }} />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>ABA / Routing (opcional)</label>
            <input className="input" type="text" value={draft.bank_transfer_info.routing_number ?? ""} onChange={(e) => setBankInfo("routing_number", e.target.value)} placeholder="XXXXXXXXX" style={{ fontSize: 13 }} />
          </div>
          <div style={p.payField}>
            <label style={p.formLabel}>SWIFT / IBAN (opcional)</label>
            <input className="input" type="text" value={draft.bank_transfer_info.swift_code ?? ""} onChange={(e) => setBankInfo("swift_code", e.target.value)} placeholder="XXXXXXXXXX" style={{ fontSize: 13 }} />
          </div>
          <div style={{ ...p.payField, flex: "2 1 360px" }}>
            <label style={p.formLabel}>Instrucciones adicionales</label>
            <textarea
              className="input"
              value={draft.bank_transfer_info.instructions ?? ""}
              onChange={(e) => setBankInfo("instructions", e.target.value)}
              placeholder="ej. Incluye tu email en el concepto de la transferencia"
              rows={2}
              style={{ fontSize: 13, resize: "vertical" as const }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ alignSelf: "flex-start", padding: "10px 28px" }}
        disabled={saving}
        onClick={() => onSave(draft)}
      >
        {saving ? "Guardando…" : "Guardar configuración de pagos"}
      </button>
    </div>
  );
}

// ─── PurchaseStatusPill ───────────────────────────────────────────────────────

function PurchaseStatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: "rgba(245,158,11,0.1)",  color: "#78350f", label: "Pendiente" },
    approved:  { bg: "rgba(16,185,129,0.1)",  color: "#065f46", label: "Aprobada" },
    completed: { bg: "rgba(16,185,129,0.1)",  color: "#065f46", label: "Completada" },
    rejected:  { bg: "rgba(239,68,68,0.1)",   color: "#991b1b", label: "Rechazada" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ─── AdjustCreditsForm ────────────────────────────────────────────────────────

function AdjustCreditsForm({ user, onSaved, onCancel }: {
  user: ProfileWithStats;
  onSaved: (amount: number, description: string) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(10);
  const [description, setDescription] = useState("");

  return (
    <div style={p.inlineForm}>
      <strong style={{ fontSize: 14, fontWeight: 700 }}>Ajustar créditos — {user.email}</strong>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Saldo actual: <strong style={{ color: "#6d28d9" }}>◈ {user.credits}</strong></p>
      <div style={p.formRow}>
        <div style={p.formField}>
          <label style={p.formLabel}>Cantidad (positivo = otorgar, negativo = descontar)</label>
          <input className="input" type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} style={p.formInput} />
        </div>
        <div style={{ ...p.formField, flex: "2 1 260px" }}>
          <label style={p.formLabel}>Descripción (opcional)</label>
          <input className="input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ej. Créditos de bienvenida" style={p.formInput} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }} onClick={() => onSaved(amount, description)}>
          Aplicar
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── NewUserForm ─────────────────────────────────────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, { label: string; desc: string; color: string }> = {
  owner: {
    label: "Owner",
    desc: "Puede crear y gestionar sus propios eventos desde el panel. No ve eventos de otros usuarios.",
    color: "#374151",
  },
  admin: {
    label: "Admin",
    desc: "Igual que Owner pero con acceso a funciones avanzadas de administración de sus eventos.",
    color: "#1d4ed8",
  },
  super_admin: {
    label: "Super admin",
    desc: "Acceso total al sistema: ve y edita todos los eventos, gestiona usuarios y estadísticas.",
    color: "#6d28d9",
  },
};

function NewUserForm({ onSaved, onCancel, onError }: {
  onSaved: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("owner");
  const [saving, setSaving] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      if (json.magic_link) {
        setMagicLink(json.magic_link);
      } else {
        onSaved();
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!magicLink) return;
    await navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const roleCfg = ROLE_DESCRIPTIONS[role];

  // ── Magic link success state ──
  if (magicLink) {
    return (
      <div style={p.inlineForm}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <strong style={{ fontSize: 14, fontWeight: 700, display: "block" }}>Usuario creado</strong>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{email} · <RolePill role={role} /></span>
          </div>
        </div>
        <div style={p.magicLinkBox}>
          <div style={p.magicLinkLabel}>Enlace de registro</div>
          <div style={p.magicLinkRow}>
            <code style={p.magicLinkCode}>{magicLink}</code>
            <button
              type="button"
              style={{ ...p.miniBtn, minWidth: 76, color: copied ? "#065f46" : "#374151", borderColor: copied ? "rgba(16,185,129,0.4)" : undefined, background: copied ? "rgba(16,185,129,0.08)" : undefined }}
              onClick={copyLink}
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            El usuario llegará a la pantalla de registro con su email pre-llenado. Compártelo por WhatsApp, email u otro medio.
          </p>
        </div>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px", alignSelf: "flex-start" }} onClick={onSaved}>
          Listo
        </button>
      </div>
    );
  }

  // ── Form state ──
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

      {/* Role description */}
      <div style={{ ...p.roleDesc, borderColor: roleCfg.color + "33", background: roleCfg.color + "08" }}>
        <span style={{ ...p.roleDescTitle, color: roleCfg.color }}>{roleCfg.label}</span>
        <span style={p.roleDescText}>{roleCfg.desc}</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }} disabled={saving}>
          {saving ? "Generando enlace…" : "Generar magic link"}
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancelar</button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
        Se generará un enlace de activación único. Podrás copiarlo y enviarlo por el medio que prefieras.
      </p>
    </form>
  );
}

// ─── ResetPasswordForm ────────────────────────────────────────────────────────

function ResetPasswordForm({ user, onSaved, onCancel }: {
  user: ProfileWithStats;
  onSaved: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= 8 && password === confirm;

  return (
    <div style={p.inlineForm}>
      <strong style={{ fontSize: 14, fontWeight: 700 }}>Restablecer contraseña — {user.email}</strong>
      <div style={p.formRow}>
        <div style={p.formField}>
          <label style={p.formLabel}>Nueva contraseña (mín. 8 caracteres)</label>
          <PasswordInput
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña"
            style={p.formInput}
            autoComplete="new-password"
          />
        </div>
        <div style={p.formField}>
          <label style={p.formLabel}>Confirmar contraseña</label>
          <PasswordInput
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetir contraseña"
            style={{ ...p.formInput, borderColor: mismatch ? "#dc2626" : undefined }}
            autoComplete="new-password"
          />
          {mismatch && <span style={{ fontSize: 12, color: "#dc2626" }}>Las contraseñas no coinciden</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 13, padding: "8px 18px" }}
          disabled={!valid}
          onClick={() => onSaved(password)}
        >
          Guardar contraseña
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── RegeneratedLinkBox ───────────────────────────────────────────────────────

function RegeneratedLinkBox({ email, link, onClose }: { email: string; link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div style={p.inlineForm}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🔗</span>
        <div>
          <strong style={{ fontSize: 14, fontWeight: 700, display: "block" }}>Enlace de registro generado</strong>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{email}</span>
        </div>
      </div>
      <div style={p.magicLinkBox}>
        <div style={p.magicLinkLabel}>Enlace de registro</div>
        <div style={p.magicLinkRow}>
          <code style={p.magicLinkCode}>{link}</code>
          <button
            type="button"
            style={{ ...p.miniBtn, minWidth: 76, color: copied ? "#065f46" : "#374151", borderColor: copied ? "rgba(16,185,129,0.4)" : undefined, background: copied ? "rgba(16,185,129,0.08)" : undefined }}
            onClick={copyLink}
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          El usuario llegará a la pantalla de registro con su email pre-llenado. Compártelo por WhatsApp, email u otro medio.
        </p>
      </div>
      <button type="button" className="btn btn-ghost" style={{ fontSize: 13, alignSelf: "flex-start" }} onClick={onClose}>
        Cerrar
      </button>
    </div>
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

// ─── EmailTab ────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECTS: Record<string, string> = {
  tpl_welcome_subject:                   "Bienvenido a {{app_name}}, {{name}}",
  tpl_payment_confirmed_subject:         "Pago confirmado — {{credits}} créditos",
  tpl_bank_approved_subject:             "Transferencia aprobada — {{credits}} créditos acreditados",
  tpl_bank_rejected_subject:             "Transferencia bancaria — revisión requerida",
  tpl_credits_adjusted_subject:          "Ajuste de créditos en tu cuenta",
  tpl_bank_transfer_received_subject:    "Comprobante recibido — {{credits}} créditos en revisión",
};

const TEMPLATE_VARS: Record<string, string> = {
  tpl_welcome:                 "{{name}}, {{email}}, {{credits}}, {{app_name}}",
  tpl_payment_confirmed:       "{{email}}, {{credits}}, {{amount}}, {{method}}, {{balance}}",
  tpl_bank_approved:           "{{email}}, {{credits}}, {{amount}}, {{balance}}",
  tpl_bank_rejected:           "{{email}}, {{credits}}, {{amount}}, {{notes}}",
  tpl_credits_adjusted:        "{{email}}, {{amount}}, {{balance}}, {{description}}",
  tpl_bank_transfer_received:  "{{email}}, {{credits}}, {{amount}}",
};

function EmailTab({
  settings,
  saving,
  testSending,
  onSave,
  onTest,
}: {
  settings: EmailSettings;
  saving: boolean;
  testSending: boolean;
  onSave: (draft: EmailSettings) => void;
  onTest: (draft: EmailSettings) => void;
}) {
  const [draft, setDraft] = useState<EmailSettings>({ ...settings });
  const set = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const templates: Array<{ key: string; label: string }> = [
    { key: "welcome",                 label: "Bienvenida (registro nuevo)" },
    { key: "payment_confirmed",       label: "Pago confirmado (Stripe / PayPal)" },
    { key: "credits_adjusted",        label: "Ajuste manual de créditos (admin)" },
    { key: "bank_transfer_received",  label: "Transferencia bancaria recibida (confirmación al usuario)" },
    { key: "bank_approved",           label: "Transferencia bancaria aprobada" },
    { key: "bank_rejected",           label: "Transferencia bancaria rechazada" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Provider */}
      <div style={p.paySection}>
        <div style={p.paySectionHead}>
          <span style={p.paySectionTitle}>Proveedor de email</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {(["disabled", "resend", "smtp"] as const).map((prov) => (
            <button
              key={prov}
              type="button"
              onClick={() => set("provider", prov)}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "1.5px solid",
                borderColor: draft.provider === prov ? "#6d28d9" : "rgba(0,0,0,0.12)",
                background: draft.provider === prov ? "rgba(109,40,217,0.08)" : "transparent",
                color: draft.provider === prov ? "#6d28d9" : "#555",
                fontWeight: draft.provider === prov ? 700 : 400,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {prov === "disabled" ? "Desactivado" : prov === "resend" ? "Resend" : "SMTP"}
            </button>
          ))}
        </div>
        {draft.provider === "disabled" && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Los emails transaccionales están desactivados. Los pagos y registros seguirán funcionando, pero sin notificaciones por correo.
          </p>
        )}
      </div>

      {/* Resend credentials */}
      {draft.provider === "resend" && (
        <div style={p.paySection}>
          <span style={p.paySectionTitle}>Resend</span>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)" }}>
            Crea tu cuenta y clave en <strong>resend.com</strong>. Plan gratuito: 3,000 emails/mes.
          </p>
          <div style={p.payField}>
            <label style={p.formLabel}>API Key</label>
            <PasswordInput
              className="input"
              value={draft.resend_api_key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("resend_api_key", e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
              style={{ fontSize: 13, fontFamily: "monospace" }}
            />
          </div>
        </div>
      )}

      {/* SMTP credentials */}
      {draft.provider === "smtp" && (
        <div style={p.paySection}>
          <span style={p.paySectionTitle}>SMTP</span>
          <div style={p.payFieldRow}>
            <div style={p.payField}>
              <label style={p.formLabel}>Servidor (host)</label>
              <input className="input" type="text" value={draft.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} placeholder="smtp.ejemplo.com" style={{ fontSize: 13 }} />
            </div>
            <div style={{ ...p.payField, flex: "0 0 120px" }}>
              <label style={p.formLabel}>Puerto</label>
              <input className="input" type="number" value={draft.smtp_port} onChange={(e) => set("smtp_port", parseInt(e.target.value) || 587)} placeholder="587" style={{ fontSize: 13 }} />
            </div>
            <div style={p.payField}>
              <label style={p.formLabel}>Usuario</label>
              <input className="input" type="text" value={draft.smtp_user} onChange={(e) => set("smtp_user", e.target.value)} placeholder="usuario@ejemplo.com" style={{ fontSize: 13 }} />
            </div>
            <div style={p.payField}>
              <label style={p.formLabel}>Contraseña</label>
              <PasswordInput
                className="input"
                value={draft.smtp_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("smtp_password", e.target.value)}
                placeholder="••••••••"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
          <label style={{ ...p.toggleLabel, gap: 8 }}>
            <input type="checkbox" checked={draft.smtp_secure} onChange={(e) => set("smtp_secure", e.target.checked)} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {draft.smtp_secure ? "TLS (puerto 465)" : "STARTTLS (puerto 587)"}
            </span>
          </label>
        </div>
      )}

      {/* From */}
      {draft.provider !== "disabled" && (
        <div style={p.paySection}>
          <span style={p.paySectionTitle}>Remitente</span>
          <div style={p.payFieldRow}>
            <div style={p.payField}>
              <label style={p.formLabel}>Nombre del remitente</label>
              <input className="input" type="text" value={draft.from_name} onChange={(e) => set("from_name", e.target.value)} placeholder="Nilo Cam" style={{ fontSize: 13 }} />
            </div>
            <div style={{ ...p.payField, flex: "2 1 280px" }}>
              <label style={p.formLabel}>Email del remitente</label>
              <input className="input" type="email" value={draft.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="hola@tudominio.com" style={{ fontSize: 13 }} />
            </div>
          </div>
          {draft.provider === "resend" && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              En el plan gratuito de Resend solo puedes usar <code style={{ fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4 }}>onboarding@resend.dev</code> hasta verificar un dominio propio.
            </p>
          )}
        </div>
      )}

      {/* Templates */}
      {draft.provider !== "disabled" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={p.sectionTitle}>Plantillas de email</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            El asunto y cuerpo de cada email. Usa variables entre dobles llaves. Si el cuerpo está vacío se usa el diseño por defecto del sistema.
          </p>
          {templates.map(({ key, label }) => {
            const subjectKey = `tpl_${key}_subject` as keyof EmailSettings;
            const bodyKey    = `tpl_${key}_body`    as keyof EmailSettings;
            return (
              <div key={key} style={p.paySection}>
                <strong style={{ fontSize: 14, color: "#111" }}>{label}</strong>
                <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--muted)" }}>
                  Variables disponibles: <code style={{ fontSize: 11, background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4 }}>{TEMPLATE_VARS[`tpl_${key}`]}</code>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={p.formLabel}>Asunto</label>
                    <input
                      className="input"
                      type="text"
                      value={draft[subjectKey] as string}
                      onChange={(e) => set(subjectKey, e.target.value)}
                      placeholder={DEFAULT_SUBJECTS[subjectKey as string] ?? ""}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={p.formLabel}>Cuerpo HTML</label>
                    <HtmlEditor
                      value={draft[bodyKey] as string}
                      onChange={(val) => set(bodyKey, val)}
                      height={300}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "10px 28px" }}
          disabled={saving}
          onClick={() => onSave(draft)}
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        {draft.provider !== "disabled" && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "10px 20px" }}
            disabled={testSending}
            onClick={() => onTest(draft)}
          >
            {testSending ? "Enviando…" : "✉ Enviar email de prueba"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const p: Record<string, React.CSSProperties> = {
  shell: { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 },
  layout: { display: "flex", flex: 1, minHeight: 0 },

  // Sidebar
  sidebar: {
    width: 220, flexShrink: 0,
    display: "flex", flexDirection: "column",
    background: "#fafafa",
    borderRight: "1px solid rgba(0,0,0,0.07)",
    overflowY: "auto",
  },
  sidebarBrand: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "20px 16px 16px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  // Main area
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 },
  content: { padding: "24px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 },
  notice: { margin: "12px 24px 0", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "1px solid" },

  // Page header (title + description + optional action)
  pageHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const },
  pageTitle: { margin: "0 0 4px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "#111" },
  pageDesc: { margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 },

  // Sub-tab bar (used within pages)
  subTabBar: { display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", marginBottom: 4 },
  subTab: { padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "none", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", color: "var(--muted)", borderRadius: 0, marginBottom: -1 },
  subTabActive: { padding: "8px 16px", fontSize: 13, fontWeight: 700, background: "none", border: "none", borderBottom: "2px solid #6d28d9", cursor: "pointer", color: "#6d28d9", borderRadius: 0, marginBottom: -1 },

  loading: { color: "var(--muted)", fontSize: 14, margin: 0 },

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
  filterBar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const },
  searchWrap: {
    flex: "1 1 200px",
    display: "flex", alignItems: "center", gap: 0,
    background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
    padding: "0 10px", height: 36, minWidth: 0,
  },
  searchIcon: { width: 15, height: 15, flexShrink: 0, color: "var(--muted)", marginRight: 7 } as React.CSSProperties,
  searchInput: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    fontSize: 13, color: "var(--text)", minWidth: 0, padding: 0,
  },
  searchClear: {
    background: "none", border: "none", cursor: "pointer", padding: "0 0 0 6px",
    fontSize: 12, color: "var(--muted)", lineHeight: 1, flexShrink: 0,
  },
  filterGroup: { display: "flex", gap: 6, flexShrink: 0 },
  filterSel: {
    height: 36, padding: "0 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
    background: "#fff", fontSize: 13, color: "var(--text)", cursor: "pointer", outline: "none",
    appearance: "auto" as const,
  },
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

  roleDesc: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid",
  },
  roleDescTitle: { fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  roleDescText: { fontSize: 13, color: "var(--muted)", lineHeight: 1.5 },

  magicLinkBox: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    background: "rgba(0,0,0,0.025)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
  },
  magicLinkLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--muted)" },
  magicLinkRow: { display: "flex", gap: 10, alignItems: "center" },
  pricingRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    flexWrap: "wrap" as const,
  },
  pricingRowHighlight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "18px 20px",
    borderRadius: 16,
    background: "linear-gradient(135deg, rgba(109,40,217,0.06) 0%, rgba(109,40,217,0.02) 100%)",
    border: "1.5px solid rgba(109,40,217,0.22)",
    flexWrap: "wrap" as const,
  },
  pricingBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#6d28d9",
    background: "rgba(109,40,217,0.1)",
    border: "1px solid rgba(109,40,217,0.2)",
    borderRadius: 999,
    padding: "2px 9px",
    marginBottom: 5,
  },
  magicLinkCode: {
    flex: 1,
    fontSize: 11,
    fontFamily: "monospace",
    color: "#374151",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    padding: "6px 10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    display: "block",
    minWidth: 0,
  },

  // Payments tab
  paySection: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 20,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  },
  paySectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paySectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.02em",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none" as const,
  },
  payFieldRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
  },
  payField: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    flex: "1 1 220px",
  },

  // Purchase rows
  purchaseRow: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    gap: 12,
  },
};
