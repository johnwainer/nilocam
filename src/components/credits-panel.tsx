"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreditTransaction } from "@/types";

// ─── types ───────────────────────────────────────────────────────────────────

type UserBalance = { email: string; display_name: string; credits: number };

type TxFilter = "all" | "income" | "expense";

// ─── helpers ─────────────────────────────────────────────────────────────────

const TX_META: Record<string, { icon: string; label: string }> = {
  event_creation: { icon: "📅", label: "Creación de evento" },
  photos_100:     { icon: "🖼", label: "Pack 100 fotos" },
  photos_200:     { icon: "🖼", label: "Pack 200 fotos" },
  photos_500:     { icon: "🖼", label: "Pack 500 fotos" },
  manual_grant:   { icon: "✅", label: "Créditos otorgados" },
  manual_deduct:  { icon: "↩", label: "Créditos descontados" },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function TxRow({ t, showUser }: { t: CreditTransaction & { user_email?: string }; showUser?: boolean }) {
  const meta = TX_META[t.type] ?? { icon: "◈", label: t.type };
  const isCredit = t.amount > 0;
  return (
    <div style={r.txRow}>
      <div style={r.txIcon}>{meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={r.txDesc}>{t.description || meta.label}</div>
        {showUser && t.user_email && (
          <div style={r.txMeta}>{t.user_email}</div>
        )}
        {t.event_slug && (
          <div style={r.txMeta}>Evento: /{t.event_slug}</div>
        )}
        <div style={r.txDate}>{fmtDate(t.created_at)}</div>
      </div>
      <div style={{ ...r.txAmount, color: isCredit ? "#059669" : "#374151" }}>
        {isCredit ? "+" : ""}{t.amount} ◈
      </div>
    </div>
  );
}

// ─── Own credits panel (owner/admin) ─────────────────────────────────────────

export function CreditsPanel({
  userEmail,
  initialCredits,
  initialTransactions,
}: {
  userEmail: string;
  initialCredits: number;
  initialTransactions: CreditTransaction[];
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TxFilter>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credits");
      const json = await res.json();
      if (json.ok) { setCredits(json.credits); setTransactions(json.transactions ?? []); }
    } finally { setLoading(false); }
  }, []);

  // Derived
  const totalSpent  = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalEarned = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const filtered = transactions.filter((t) => {
    if (filter === "income")  return t.amount > 0;
    if (filter === "expense") return t.amount < 0;
    return true;
  });

  return (
    <div style={r.shell}>
      <div style={r.header}>
        <div>
          <h2 style={r.title}>Mis créditos</h2>
          <span style={r.sub}>{userEmail}</span>
        </div>
        <button type="button" style={r.refreshBtn} onClick={refresh} disabled={loading}>
          {loading ? "Cargando…" : "↺ Actualizar"}
        </button>
      </div>

      {/* Balance cards */}
      <div style={r.balanceGrid}>
        <div style={{ ...r.balanceCard, background: "rgba(109,40,217,0.07)", border: "1px solid rgba(109,40,217,0.18)" }}>
          <span style={r.balanceIcon}>◈</span>
          <span style={{ ...r.balanceValue, color: "#6d28d9" }}>{credits}</span>
          <span style={r.balanceLabel}>Saldo disponible</span>
        </div>
        <div style={r.balanceCard}>
          <span style={r.balanceIcon}>📤</span>
          <span style={r.balanceValue}>{totalSpent}</span>
          <span style={r.balanceLabel}>Gastados</span>
        </div>
        <div style={r.balanceCard}>
          <span style={r.balanceIcon}>📥</span>
          <span style={{ ...r.balanceValue, color: "#059669" }}>{totalEarned}</span>
          <span style={r.balanceLabel}>Recibidos</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={r.filterBar}>
        {(["all", "income", "expense"] as TxFilter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={filter === f ? r.filterBtnActive : r.filterBtn}>
            {f === "all" ? `Todos (${transactions.length})` : f === "income" ? `Entradas (${transactions.filter(t => t.amount > 0).length})` : `Salidas (${transactions.filter(t => t.amount < 0).length})`}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div style={r.txList}>
        {filtered.length === 0 ? (
          <div style={r.empty}>
            <span style={{ fontSize: 32 }}>◈</span>
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14 }}>Sin transacciones en esta categoría.</p>
          </div>
        ) : (
          filtered.map((t) => <TxRow key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

// ─── Global credits panel (super admin) ──────────────────────────────────────

export function SuperCreditsPanel({ userEmail }: { userEmail: string }) {
  const [transactions, setTransactions] = useState<(CreditTransaction & { user_email: string })[]>([]);
  const [profiles, setProfiles] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEmail, setFilterEmail] = useState("");
  const [adjusting, setAdjusting] = useState<UserBalance | null>(null);
  const [adjAmount, setAdjAmount] = useState(10);
  const [adjDesc, setAdjDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async (emailFilter?: string) => {
    setLoading(true);
    try {
      const url = emailFilter
        ? `/api/credits?all=1&user=${encodeURIComponent(emailFilter)}`
        : "/api/credits?all=1";
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setTransactions(json.transactions ?? []);
        if (json.profiles) setProfiles(json.profiles);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyFilter = () => load(filterEmail.trim() || undefined);

  const flash = (text: string, ok: boolean) => {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 3000);
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: adjusting.email, user_email: adjusting.email, amount: adjAmount, description: adjDesc }),
      });
      // user_id isn't available here — we need to re-fetch the profile id
      // Use a different approach: pass email and look up id server-side
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setProfiles((prev) => prev.map((p) => p.email === adjusting.email ? { ...p, credits: json.credits } : p));
      flash(`Créditos actualizados: ${json.credits} ◈`, true);
      setAdjusting(null);
      load(filterEmail.trim() || undefined);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", false);
    } finally { setSaving(false); }
  };

  const totalTx = transactions.length;
  const totalDebits = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCredits = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div style={r.shell}>
      <div style={r.header}>
        <div>
          <h2 style={r.title}>Créditos del sistema</h2>
          <span style={r.sub}>Vista global · Super admin</span>
        </div>
      </div>

      {notice && (
        <div style={{ ...r.notice, background: notice.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", borderColor: notice.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)", color: notice.ok ? "#065f46" : "#991b1b" }}>
          {notice.text}
        </div>
      )}

      {/* Summary cards */}
      <div style={r.balanceGrid}>
        <div style={r.balanceCard}>
          <span style={r.balanceIcon}>👥</span>
          <span style={r.balanceValue}>{profiles.length}</span>
          <span style={r.balanceLabel}>Usuarios</span>
        </div>
        <div style={r.balanceCard}>
          <span style={r.balanceIcon}>🔄</span>
          <span style={r.balanceValue}>{totalTx}</span>
          <span style={r.balanceLabel}>Transacciones</span>
        </div>
        <div style={{ ...r.balanceCard, background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.15)" }}>
          <span style={r.balanceIcon}>📥</span>
          <span style={{ ...r.balanceValue, color: "#059669" }}>{totalCredits}</span>
          <span style={r.balanceLabel}>◈ otorgados</span>
        </div>
        <div style={r.balanceCard}>
          <span style={r.balanceIcon}>📤</span>
          <span style={r.balanceValue}>{totalDebits}</span>
          <span style={r.balanceLabel}>◈ gastados</span>
        </div>
      </div>

      {/* User balances */}
      <div style={r.section}>
        <h3 style={r.sectionTitle}>Saldos por usuario</h3>
        <div style={r.userBalanceGrid}>
          {profiles.map((pr) => (
            <div key={pr.email} style={r.userBalanceCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.display_name || pr.email}</div>
                {pr.display_name && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.email}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: pr.credits > 0 ? "#6d28d9" : "#9ca3af" }}>◈ {pr.credits}</span>
                {pr.email !== userEmail && (
                  <button
                    type="button"
                    style={{ ...r.adjBtn, color: "#6d28d9", borderColor: "rgba(109,40,217,0.3)", background: "rgba(109,40,217,0.06)" }}
                    onClick={() => { setAdjusting(pr); setAdjAmount(10); setAdjDesc(""); }}
                  >
                    + Agregar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adjust credits inline form */}
      {adjusting && (
        <div style={r.adjustForm}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Ajustar créditos</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>→ {adjusting.email}</span>
            <span style={{ marginLeft: "auto", fontWeight: 800, color: "#6d28d9", fontSize: 14 }}>◈ {adjusting.credits}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={r.adjLabel}>Cantidad (+ otorgar / − descontar)</label>
              <input className="input" type="number" value={adjAmount} onChange={(e) => setAdjAmount(parseInt(e.target.value) || 0)} style={{ width: 110, fontSize: 15, fontWeight: 700, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 200px" }}>
              <label style={r.adjLabel}>Descripción</label>
              <input className="input" type="text" value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} placeholder="ej. Créditos de bienvenida" />
            </div>
            <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "10px 18px" }} disabled={saving} onClick={submitAdjust}>
              {saving ? "Guardando…" : "Aplicar"}
            </button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setAdjusting(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Transaction log */}
      <div style={r.section}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ ...r.sectionTitle, flex: 1 }}>Log de transacciones</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              type="text"
              placeholder="Filtrar por email…"
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilter()}
              style={{ fontSize: 13, padding: "6px 12px", width: 200 }}
            />
            <button type="button" style={r.refreshBtn} onClick={applyFilter} disabled={loading}>
              {loading ? "…" : "Filtrar"}
            </button>
            {filterEmail && (
              <button type="button" style={r.refreshBtn} onClick={() => { setFilterEmail(""); load(); }}>
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
        <div style={r.txList}>
          {loading ? (
            <div style={r.empty}><p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Cargando…</p></div>
          ) : transactions.length === 0 ? (
            <div style={r.empty}><p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Sin transacciones.</p></div>
          ) : (
            transactions.map((t) => <TxRow key={t.id} t={t} showUser />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const r: Record<string, React.CSSProperties> = {
  shell: { display: "flex", flexDirection: "column", gap: 24, padding: "24px", overflowY: "auto", flex: 1 },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#111" },
  sub: { display: "block", fontSize: 13, color: "var(--muted)", marginTop: 2 },
  notice: { padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "1px solid" },
  refreshBtn: {
    padding: "6px 14px", borderRadius: 999, background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", color: "var(--muted)",
  },

  // Balance cards
  balanceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
  balanceCard: {
    borderRadius: 20, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 6,
    background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
  },
  balanceIcon: { fontSize: 22 },
  balanceValue: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#111" },
  balanceLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" },

  // Filter bar
  filterBar: { display: "flex", gap: 6, flexWrap: "wrap" },
  filterBtn: {
    padding: "7px 14px", borderRadius: 999, background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 600,
    cursor: "pointer", color: "var(--muted)",
  },
  filterBtnActive: {
    padding: "7px 14px", borderRadius: 999, background: "rgba(0,0,0,0.1)",
    border: "1px solid rgba(0,0,0,0.18)", fontSize: 13, fontWeight: 700,
    cursor: "pointer", color: "#111",
  },

  // Transaction list
  txList: {
    display: "flex", flexDirection: "column",
    background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,0.07)",
    overflow: "hidden",
  },
  txRow: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  txIcon: { fontSize: 20, flexShrink: 0, marginTop: 1 },
  txDesc: { fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.4 },
  txMeta: { fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 },
  txDate: { fontSize: 11, color: "var(--muted)", marginTop: 4 },
  txAmount: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", flexShrink: 0, paddingTop: 2 },
  empty: {
    padding: "40px 24px", display: "flex", flexDirection: "column",
    alignItems: "center", color: "var(--muted)", textAlign: "center",
  },

  // Sections
  section: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" },

  // User balance list
  userBalanceGrid: {
    display: "flex", flexDirection: "column",
    background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden",
  },
  userBalanceCard: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)",
  },

  // Adjust form
  adjustForm: {
    background: "rgba(109,40,217,0.05)", border: "1px solid rgba(109,40,217,0.2)",
    borderRadius: 20, padding: "18px 20px",
  },
  adjLabel: { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  adjBtn: {
    padding: "5px 12px", borderRadius: 999, background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 700,
    cursor: "pointer", color: "#374151",
  },
};
