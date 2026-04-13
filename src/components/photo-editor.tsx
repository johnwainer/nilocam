"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/button";
import type { PhotoFilter, PhotoTemplate } from "@/lib/types";
import { cx } from "@/lib/utils";
import { Check, ImageUp, Sparkles, X } from "lucide-react";

const filters: Array<{ id: PhotoFilter; label: string; style: string }> = [
  { id: "none", label: "Natural", style: "none" },
  { id: "vivid", label: "Vivo", style: "saturate(1.28) contrast(1.08)" },
  { id: "warm", label: "Cálido", style: "sepia(0.22) saturate(1.18) hue-rotate(-8deg)" },
  { id: "cool", label: "Frío", style: "saturate(1.02) hue-rotate(14deg) brightness(1.03)" },
  { id: "mono", label: "Mono", style: "grayscale(1) contrast(1.08)" },
  { id: "golden", label: "Dorado", style: "sepia(0.42) saturate(1.5) contrast(1.04)" },
  { id: "noir", label: "Noir", style: "grayscale(1) contrast(1.35) brightness(0.9)" },
];

const templates: Array<{ id: PhotoTemplate; label: string }> = [
  { id: "full-bleed", label: "Full bleed" },
  { id: "polaroid", label: "Polaroid" },
  { id: "film", label: "Film" },
  { id: "spotlight", label: "Spotlight" },
  { id: "postcard", label: "Postcard" },
];

type Props = {
  file: File;
  onCancel: () => void;
  onSave: (payload: {
    previewUrl: string;
    filter: PhotoFilter;
    template: PhotoTemplate;
  }) => void;
};

export function PhotoEditor({ file, onCancel, onSave }: Props) {
  const [filter, setFilter] = useState<PhotoFilter>("none");
  const [template, setTemplate] = useState<PhotoTemplate>("full-bleed");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedFilter = useMemo(
    () => filters.find((item) => item.id === filter) ?? filters[0],
    [filter],
  );

  async function handleSave() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo cargar la foto"));
    });

    const canvas = canvasRef.current ?? document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1400;
    const ratio = img.height / img.width;
    const height = Math.max(1400, Math.round(width * ratio));

    canvas.width = width;
    canvas.height = height;

    ctx.save();
    ctx.filter = selectedFilter.style;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();

    if (template !== "full-bleed") {
      const padding = template === "film" ? 84 : 52;
      ctx.fillStyle = "rgba(7, 10, 18, 0.72)";
      ctx.fillRect(0, 0, width, padding);
      ctx.fillRect(0, height - padding, width, padding);
      ctx.strokeStyle = "rgba(255,255,255,0.88)";
      ctx.lineWidth = template === "polaroid" ? 20 : 14;
      ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("Nilo Cam", 36, 58);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );

    if (!blob) return;
    const finalUrl = URL.createObjectURL(blob);
    onSave({
      previewUrl: finalUrl,
      filter,
      template,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm">
      <div className="panel w-full max-w-5xl overflow-hidden rounded-[32px]">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-black">Editar foto</p>
            <p className="text-xs text-[var(--app-muted)]">Aplica filtro o plantilla antes de publicar</p>
          </div>
          <Button tone="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cerrar
          </Button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-black/3 p-4">
            <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-white">
              <img
                src={previewUrl}
                alt="Vista previa"
                className="h-[58vh] w-full object-cover"
                style={{ filter: selectedFilter.style }}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                <Sparkles className="h-3.5 w-3.5" />
                Filtros
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    className={cx(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition",
                      item.id === filter
                        ? "border-black bg-black text-white"
                        : "border-[var(--app-border)] bg-white text-black hover:bg-black/5",
                    )}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                <ImageUp className="h-3.5 w-3.5" />
                Plantillas
              </div>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((item) => (
                  <button
                    key={item.id}
                    className={cx(
                      "rounded-2xl border px-3 py-3 text-left text-sm transition",
                      item.id === template
                        ? "border-black bg-black text-white"
                        : "border-[var(--app-border)] bg-white text-black hover:bg-black/5",
                    )}
                    onClick={() => setTemplate(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--app-border)] bg-black/3 p-4">
              <p className="text-sm font-semibold text-black">Resultado</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Filtro: {selectedFilter.label}. Plantilla: {template}.
              </p>
            </div>

            <div className="flex gap-3">
              <Button tone="secondary" className="flex-1" onClick={onCancel}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                <Check className="h-4 w-4" />
                Guardar edición
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
