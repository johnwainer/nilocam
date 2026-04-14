"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EVENT_BUCKET } from "@/lib/constants";
import type { PublicPaymentSettings } from "@/types";

// ─── types ───────────────────────────────────────────────────────────────────

type Step = "select" | "stripe" | "paypal" | "bank" | "success" | "error";

type StripeElements = {
  getElement: (type: string) => unknown;
  create: (type: string, options?: object) => StripeElement;
};
type StripeElement = {
  mount: (selector: string | HTMLElement) => void;
  destroy: () => void;
  on: (event: string, handler: () => void) => void;
};
type StripeInstance = {
  elements: (opts?: object) => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data: object
  ) => Promise<{ error?: { message: string }; paymentIntent?: { id: string; status: string } }>;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: object) => { render: (el: string | HTMLElement) => void };
    };
    Stripe?: (key: string) => StripeInstance;
  }
}

const supabase = createSupabaseBrowserClient();

// ─── helpers ─────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  stripe: "Tarjeta de crédito / débito",
  paypal: "PayPal",
  bank_transfer: "Transferencia bancaria",
};

const METHOD_ICONS: Record<string, string> = {
  stripe: "💳",
  paypal: "🅿",
  bank_transfer: "🏦",
};

const CREDIT_PRESETS = [5, 10, 20, 50, 100];

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ─── component ───────────────────────────────────────────────────────────────

export function BuyCreditsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}) {
  const [settings, setSettings] = useState<PublicPaymentSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [step, setStep] = useState<Step>("select");
  const [credits, setCredits] = useState(10);
  const [customCredits, setCustomCredits] = useState("");
  const [method, setMethod] = useState<string>("");

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Bank transfer state
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Stripe state
  const stripeRef = useRef<StripeInstance | null>(null);
  const stripeElementRef = useRef<StripeElement | null>(null);
  const stripeContainerRef = useRef<HTMLDivElement>(null);

  // PayPal state
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);
  const effectiveCreditsRef = useRef(10);

  // ── load settings ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/payment-settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setSettings(j.settings);
          // Default to first enabled method
          if (j.settings.stripe_enabled) setMethod("stripe");
          else if (j.settings.paypal_enabled) setMethod("paypal");
          else if (j.settings.bank_transfer_enabled) setMethod("bank_transfer");
        }
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  const effectiveCredits = customCredits !== "" ? Math.max(1, parseInt(customCredits) || 0) : credits;
  const amountUsd = settings ? effectiveCredits * settings.credit_price_usd : 0;

  // Keep ref in sync so PayPal/Stripe closures always read the latest value
  effectiveCreditsRef.current = effectiveCredits;

  const activeMethods = settings
    ? [
        settings.stripe_enabled && "stripe",
        settings.paypal_enabled && "paypal",
        settings.bank_transfer_enabled && "bank_transfer",
      ].filter(Boolean) as string[]
    : [];

  // ── stripe ─────────────────────────────────────────────────────────────────

  const initStripe = useCallback(async () => {
    if (!settings?.stripe_public_key) return;

    // Load Stripe.js if not already loaded
    if (!window.Stripe) {
      await new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/";
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    const stripe = window.Stripe!(settings.stripe_public_key);
    stripeRef.current = stripe;

    const elements = stripe.elements();
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#111",
          fontFamily: "system-ui, sans-serif",
          "::placeholder": { color: "#9ca3af" },
        },
      },
    });

    // Mount after a tick so the DOM is ready
    requestAnimationFrame(() => {
      if (stripeContainerRef.current) {
        card.mount(stripeContainerRef.current);
        stripeElementRef.current = card;
      }
    });
  }, [settings]);

  const destroyStripe = useCallback(() => {
    stripeElementRef.current?.destroy();
    stripeElementRef.current = null;
  }, []);

  // ── paypal ─────────────────────────────────────────────────────────────────

  const initPayPal = useCallback(async () => {
    if (!settings?.paypal_client_id || !paypalContainerRef.current) return;

    // Load PayPal SDK if not already loaded
    if (!window.paypal) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${settings.paypal_client_id}&currency=USD`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar PayPal SDK."));
        document.head.appendChild(script);
      });
    }

    if (!window.paypal || paypalRendered.current) return;
    paypalRendered.current = true;

    const container = paypalContainerRef.current;
    if (!container) return;

    window.paypal.Buttons({
      createOrder: async () => {
        const res = await fetch("/api/payments/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credits: effectiveCreditsRef.current }),
        });
        const json = await res.json() as { ok: boolean; orderId: string; purchaseId: string; message?: string };
        if (!json.ok) throw new Error(json.message ?? "Error creando orden.");
        container.dataset.purchaseId = json.purchaseId;
        return json.orderId;
      },
      onApprove: async (data: { orderID: string }) => {
        const purchaseId = container.dataset.purchaseId ?? "";
        setProcessing(true);
        try {
          const res = await fetch("/api/payments/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID, purchaseId }),
          });
          const json = await res.json() as { ok: boolean; credits?: number; purchased?: number; message?: string };
          if (!json.ok) throw new Error(json.message ?? "Error capturando pago.");
          setSuccessMsg(`¡Pago con PayPal exitoso! Se acreditaron ${json.purchased} créditos.`);
          setStep("success");
          onSuccess(json.credits ?? 0);
        } catch (e) {
          setErrorMsg(e instanceof Error ? e.message : "Error procesando pago.");
          setStep("error");
        } finally {
          setProcessing(false);
        }
      },
      onError: (err: Error) => {
        setErrorMsg(err?.message ?? "Error en PayPal.");
        setStep("error");
      },
    }).render(container);
  }, [settings, onSuccess]);

  // ── step transitions ───────────────────────────────────────────────────────

  const goToPayment = () => {
    if (!method || effectiveCredits < 1) return;
    setErrorMsg("");
    if (method === "stripe") {
      setStep("stripe");
      // Init stripe after render
      setTimeout(initStripe, 100);
    } else if (method === "paypal") {
      setStep("paypal");
      paypalRendered.current = false;
      setTimeout(initPayPal, 100);
    } else {
      setStep("bank");
    }
  };

  const goBack = () => {
    destroyStripe();
    setStep("select");
  };

  // ── stripe pay ─────────────────────────────────────────────────────────────

  const handleStripePay = async () => {
    if (!stripeRef.current || !stripeElementRef.current) return;
    setProcessing(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/payments/stripe/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: effectiveCredits }),
      });
      const json = await res.json() as { ok: boolean; clientSecret?: string; purchaseId?: string; message?: string };
      if (!json.ok || !json.clientSecret) throw new Error(json.message ?? "Error creando pago.");

      const result = await stripeRef.current.confirmCardPayment(json.clientSecret, {
        payment_method: { card: stripeElementRef.current },
      });

      if (result.error) throw new Error(result.error.message);

      // Verify server-side and grant credits
      const confirmRes = await fetch("/api/payments/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: json.purchaseId, paymentIntentId: result.paymentIntent!.id }),
      });
      const confirmJson = await confirmRes.json() as { ok: boolean; credits?: number; purchased?: number; message?: string };
      if (!confirmJson.ok) throw new Error(confirmJson.message ?? "Error confirmando pago.");

      destroyStripe();
      setSuccessMsg(`¡Pago exitoso! Se acreditaron ${confirmJson.purchased} créditos.`);
      setStep("success");
      onSuccess(confirmJson.credits ?? 0);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error procesando pago.");
    } finally {
      setProcessing(false);
    }
  };

  // ── bank transfer ─────────────────────────────────────────────────────────

  const handleBankSubmit = async () => {
    if (!proofFile) {
      setErrorMsg("Por favor adjunta el comprobante de transferencia.");
      return;
    }
    setUploadingProof(true);
    setErrorMsg("");
    try {
      // Upload proof to Supabase Storage
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `transfer-proofs/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(EVENT_BUCKET)
        .upload(path, proofFile, { contentType: proofFile.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(path);

      const res = await fetch("/api/payments/bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: effectiveCredits, proofUrl: urlData.publicUrl }),
      });
      const json = await res.json() as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Error enviando comprobante.");

      setSuccessMsg(json.message ?? "Comprobante enviado. Tu solicitud será revisada en breve.");
      setStep("success");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error subiendo comprobante.");
    } finally {
      setUploadingProof(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={m.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        {/* Header */}
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Comprar créditos</h2>
            <span style={m.sub}>1 crédito = {settings ? fmtUsd(settings.credit_price_usd) : "…"} USD</span>
          </div>
          <button type="button" style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {loadingSettings ? (
            <div style={m.center}>Cargando…</div>
          ) : activeMethods.length === 0 ? (
            <div style={m.center}>
              <p style={{ color: "var(--muted)", textAlign: "center" }}>
                No hay métodos de pago disponibles en este momento. Contacta al administrador.
              </p>
            </div>
          ) : (
            <>
              {/* ── SELECT step ── */}
              {step === "select" && (
                <div style={m.section}>
                  {/* Credit amount */}
                  <div style={m.fieldGroup}>
                    <label style={m.label}>Cantidad de créditos</label>
                    <div style={m.presetGrid}>
                      {CREDIT_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setCredits(p); setCustomCredits(""); }}
                          style={credits === p && customCredits === "" ? m.presetBtnActive : m.presetBtn}
                        >
                          {p} ◈
                        </button>
                      ))}
                    </div>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={9999}
                      placeholder="Otra cantidad…"
                      value={customCredits}
                      onChange={(e) => setCustomCredits(e.target.value)}
                      style={{ marginTop: 8 }}
                    />
                  </div>

                  {/* Price display */}
                  <div style={m.priceBox}>
                    <span style={m.priceLarge}>{effectiveCredits} ◈</span>
                    <span style={m.priceUsd}>{fmtUsd(amountUsd)} USD</span>
                  </div>

                  {/* Payment method */}
                  <div style={m.fieldGroup}>
                    <label style={m.label}>Método de pago</label>
                    <div style={m.methodList}>
                      {activeMethods.map((meth) => (
                        <button
                          key={meth}
                          type="button"
                          onClick={() => setMethod(meth)}
                          style={method === meth ? m.methodBtnActive : m.methodBtn}
                        >
                          <span style={{ fontSize: 22 }}>{METHOD_ICONS[meth]}</span>
                          <span style={m.methodLabel}>{METHOD_LABELS[meth]}</span>
                          {method === meth && <span style={m.methodCheck}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: 4 }}
                    disabled={!method || effectiveCredits < 1}
                    onClick={goToPayment}
                  >
                    Continuar →
                  </button>
                </div>
              )}

              {/* ── STRIPE step ── */}
              {step === "stripe" && (
                <div style={m.section}>
                  <div style={m.orderSummary}>
                    <span>{effectiveCredits} créditos</span>
                    <span style={{ fontWeight: 700 }}>{fmtUsd(amountUsd)}</span>
                  </div>

                  <div style={m.fieldGroup}>
                    <label style={m.label}>Datos de tarjeta</label>
                    <div
                      ref={stripeContainerRef}
                      style={m.stripeBox}
                    />
                  </div>

                  {errorMsg && <div style={m.errorBox}>{errorMsg}</div>}

                  <div style={m.btnRow}>
                    <button type="button" style={m.backBtn} onClick={goBack} disabled={processing}>
                      ← Volver
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={processing}
                      onClick={handleStripePay}
                    >
                      {processing ? "Procesando…" : `Pagar ${fmtUsd(amountUsd)}`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAYPAL step ── */}
              {step === "paypal" && (
                <div style={m.section}>
                  <div style={m.orderSummary}>
                    <span>{effectiveCredits} créditos</span>
                    <span style={{ fontWeight: 700 }}>{fmtUsd(amountUsd)}</span>
                  </div>

                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 12px" }}>
                    Serás redirigido a PayPal para completar el pago de {fmtUsd(amountUsd)}.
                  </p>

                  <div ref={paypalContainerRef} id="paypal-button-container" style={{ minHeight: 50 }} />

                  {errorMsg && <div style={m.errorBox}>{errorMsg}</div>}
                  {processing && <div style={m.center}>Procesando…</div>}

                  <button type="button" style={{ ...m.backBtn, marginTop: 12 }} onClick={goBack}>
                    ← Volver
                  </button>
                </div>
              )}

              {/* ── BANK TRANSFER step ── */}
              {step === "bank" && settings?.bank_transfer_info && (
                <div style={m.section}>
                  <div style={m.orderSummary}>
                    <span>{effectiveCredits} créditos</span>
                    <span style={{ fontWeight: 700 }}>{fmtUsd(amountUsd)}</span>
                  </div>

                  {/* Bank details */}
                  <div style={m.bankBox}>
                    <p style={m.bankTitle}>Datos bancarios</p>
                    {settings.bank_transfer_info.bank_name && (
                      <BankRow label="Banco" value={settings.bank_transfer_info.bank_name} />
                    )}
                    {settings.bank_transfer_info.account_holder && (
                      <BankRow label="Titular" value={settings.bank_transfer_info.account_holder} />
                    )}
                    {settings.bank_transfer_info.account_number && (
                      <BankRow label="Número de cuenta" value={settings.bank_transfer_info.account_number} copyable />
                    )}
                    {settings.bank_transfer_info.routing_number && (
                      <BankRow label="ABA / Routing" value={settings.bank_transfer_info.routing_number} copyable />
                    )}
                    {settings.bank_transfer_info.swift_code && (
                      <BankRow label="SWIFT / IBAN" value={settings.bank_transfer_info.swift_code} copyable />
                    )}
                    {settings.bank_transfer_info.instructions && (
                      <p style={m.bankInstructions}>{settings.bank_transfer_info.instructions}</p>
                    )}
                  </div>

                  {/* Proof upload */}
                  <div style={m.fieldGroup}>
                    <label style={m.label}>Adjuntar comprobante de transferencia *</label>
                    <input
                      ref={proofInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      style={m.uploadBtn}
                    >
                      {proofFile ? `✓ ${proofFile.name}` : "Seleccionar archivo…"}
                    </button>
                    <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      JPEG, PNG o PDF · Máx. 10 MB
                    </span>
                  </div>

                  {errorMsg && <div style={m.errorBox}>{errorMsg}</div>}

                  <div style={m.btnRow}>
                    <button type="button" style={m.backBtn} onClick={goBack} disabled={uploadingProof}>
                      ← Volver
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={uploadingProof || !proofFile}
                      onClick={handleBankSubmit}
                    >
                      {uploadingProof ? "Enviando…" : "Enviar comprobante"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SUCCESS step ── */}
              {step === "success" && (
                <div style={m.resultBox}>
                  <span style={m.resultIcon}>✅</span>
                  <p style={m.resultText}>{successMsg}</p>
                  {method === "bank_transfer" && (
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0", textAlign: "center" }}>
                      Los créditos se acreditarán una vez que el administrador apruebe tu comprobante.
                    </p>
                  )}
                  <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
                    Cerrar
                  </button>
                </div>
              )}

              {/* ── ERROR step ── */}
              {step === "error" && (
                <div style={m.resultBox}>
                  <span style={m.resultIcon}>❌</span>
                  <p style={m.resultText}>{errorMsg}</p>
                  <div style={m.btnRow}>
                    <button type="button" style={m.backBtn} onClick={() => setStep("select")}>
                      ← Reintentar
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BankRow helper ───────────────────────────────────────────────────────────

function BankRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={m.bankRow}>
      <span style={m.bankLabel}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={m.bankValue}>{value}</span>
        {copyable && (
          <button type="button" onClick={copy} style={m.copyBtn}>
            {copied ? "✓" : "Copiar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 24,
    width: "100%", maxWidth: 480,
    maxHeight: "90dvh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
  },
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "22px 24px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "#111" },
  sub: { display: "block", fontSize: 13, color: "var(--muted)", marginTop: 2 },
  closeBtn: {
    background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 999,
    width: 32, height: 32, cursor: "pointer", fontSize: 14, fontWeight: 700,
    color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  body: { overflowY: "auto", flex: 1, padding: "20px 24px 24px" },

  section: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  center: { textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 14 },

  // Credit presets
  presetGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  presetBtn: {
    padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", color: "#374151",
  },
  presetBtnActive: {
    padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(109,40,217,0.4)",
    background: "rgba(109,40,217,0.08)", fontSize: 14, fontWeight: 700,
    cursor: "pointer", color: "#6d28d9",
  },

  // Price box
  priceBox: {
    background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.15)",
    borderRadius: 16, padding: "14px 18px",
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
  },
  priceLarge: { fontSize: 28, fontWeight: 800, color: "#6d28d9", letterSpacing: "-0.04em" },
  priceUsd: { fontSize: 18, fontWeight: 700, color: "#374151" },

  // Method selection
  methodList: { display: "flex", flexDirection: "column", gap: 8 },
  methodBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.02)", cursor: "pointer", textAlign: "left",
  },
  methodBtnActive: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 14, border: "2px solid rgba(109,40,217,0.5)",
    background: "rgba(109,40,217,0.06)", cursor: "pointer", textAlign: "left",
  },
  methodLabel: { flex: 1, fontSize: 14, fontWeight: 600, color: "#111" },
  methodCheck: { fontSize: 16, color: "#6d28d9", fontWeight: 800 },

  // Order summary bar
  orderSummary: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#f5f5f7", borderRadius: 12, padding: "10px 14px",
    fontSize: 14, color: "#374151",
  },

  // Stripe
  stripeBox: {
    padding: "14px 16px", borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
    minHeight: 44,
  },

  // Bank
  bankBox: {
    background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16, padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  bankTitle: { margin: 0, fontSize: 13, fontWeight: 700, color: "#111" },
  bankRow: { display: "flex", flexDirection: "column", gap: 2 },
  bankLabel: { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  bankValue: { fontSize: 14, fontWeight: 600, color: "#111", wordBreak: "break-all" },
  bankInstructions: { margin: "4px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.5 },

  copyBtn: {
    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
    background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.2)",
    color: "#6d28d9", cursor: "pointer", flexShrink: 0,
  },

  // Upload
  uploadBtn: {
    padding: "10px 16px", borderRadius: 10,
    border: "1px dashed rgba(0,0,0,0.2)", background: "#fafafa",
    fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#374151",
    textAlign: "left",
  },

  // Result (success/error)
  resultBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    padding: "12px 0",
  },
  resultIcon: { fontSize: 48 },
  resultText: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111", textAlign: "center" },

  // Buttons
  btnRow: { display: "flex", gap: 10 },
  backBtn: {
    padding: "10px 18px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.03)",
    fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--muted)",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#b91c1c", fontWeight: 500,
  },
};
