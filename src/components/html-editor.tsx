"use client";

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { emailLayout } from "@/lib/email-layout";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e1e", color: "#858585", fontSize: 13 }}>
      Cargando editor…
    </div>
  ),
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
};

export function HtmlEditor({ value, onChange, height = 320, placeholder }: Props) {
  const [mode, setMode] = useState<"code" | "preview">("code");

  const handleChange = useCallback(
    (val: string | undefined) => onChange(val ?? ""),
    [onChange]
  );

  const previewHtml = emailLayout(value || placeholder || "");

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        background: "#1e1e1e",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 12, color: "#858585", fontFamily: "monospace" }}>HTML</span>
        <div style={{ display: "flex", gap: 2 }}>
          {(["code", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: "3px 12px",
                borderRadius: 6,
                border: "none",
                background: mode === m ? "rgba(255,255,255,0.12)" : "transparent",
                color: mode === m ? "#ffffff" : "#858585",
                fontSize: 12,
                fontWeight: mode === m ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {m === "code" ? "Código" : "Vista previa"}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {mode === "code" && (
        <div style={{ height }}>
          <Suspense>
            <MonacoEditor
              height={height}
              defaultLanguage="html"
              value={value}
              onChange={handleChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                renderWhitespace: "none",
                padding: { top: 12, bottom: 12 },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollbar: { vertical: "auto", horizontal: "hidden" },
                folding: true,
                tabSize: 2,
                formatOnPaste: true,
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Preview */}
      {mode === "preview" && (
        <div style={{ height, background: "#f5f5f7", overflow: "auto" }}>
          {value || placeholder ? (
            <iframe
              srcDoc={previewHtml}
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-same-origin"
              title="Vista previa del email"
            />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "#999" }}>El cuerpo está vacío — se usará la plantilla por defecto del sistema.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
