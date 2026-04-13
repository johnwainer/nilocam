import { FILTERS, TEMPLATES } from "@/lib/constants";
import type { WatermarkPosition } from "@/types";

export type TemplateKey = (typeof TEMPLATES)[number]["key"];
export type FilterKey = (typeof FILTERS)[number]["key"];

export type WatermarkConfig = {
  url: string;
  position: WatermarkPosition;
  size: number;    // 5–40 (% of output image width)
  opacity: number; // 0.1–1.0
};

export async function fileToImageBitmap(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fitContain(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen editada."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function renderEditedImage(
  source: File,
  options: {
    filter: FilterKey;
    template: TemplateKey;
    title?: string;
    subtitle?: string;
    watermark?: WatermarkConfig;
  }
) {
  const img = await fileToImageBitmap(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no soporta canvas.");

  const outputWidth = 1600;
  const outputHeight = 2000;
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const bg = ctx.createLinearGradient(0, 0, 0, outputHeight);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(1, "#10192d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  const drawArea = fitContain(img.naturalWidth, img.naturalHeight, outputWidth - 120, outputHeight - 320);
  const x = Math.round((outputWidth - drawArea.width) / 2);
  const y = 120;

  ctx.save();
  switch (options.filter) {
    case "warm":     ctx.filter = "sepia(0.2) saturate(1.22) contrast(1.05) brightness(1.03)"; break;
    case "golden":   ctx.filter = "sepia(0.45) saturate(1.4) brightness(1.05) contrast(1.08)"; break;
    case "rose":     ctx.filter = "sepia(0.15) saturate(1.3) hue-rotate(-15deg) brightness(1.06)"; break;
    case "vintage":  ctx.filter = "sepia(0.55) saturate(0.85) contrast(0.9) brightness(1.1)"; break;
    case "dream":    ctx.filter = "saturate(1.05) contrast(0.96) brightness(1.1)"; break;
    case "soft":     ctx.filter = "brightness(1.14) saturate(0.8) contrast(0.9)"; break;
    case "fade":     ctx.filter = "contrast(0.84) brightness(1.14) saturate(0.7)"; break;
    case "matte":    ctx.filter = "contrast(0.86) saturate(0.78) brightness(1.08) sepia(0.08)"; break;
    case "cool":     ctx.filter = "saturate(0.88) hue-rotate(18deg) brightness(1.05) contrast(1.06)"; break;
    case "mono":     ctx.filter = "grayscale(1) contrast(1.08)"; break;
    case "noir":     ctx.filter = "grayscale(1) contrast(1.45) brightness(0.88)"; break;
    case "pop":      ctx.filter = "saturate(1.5) contrast(1.14) brightness(1.04)"; break;
    case "vivid":    ctx.filter = "saturate(1.8) contrast(1.18) brightness(1.02)"; break;
    case "dramatic": ctx.filter = "contrast(1.4) brightness(0.86) saturate(1.1)"; break;
    default:         ctx.filter = "none"; break;
  }
  ctx.drawImage(img, x, y, drawArea.width, drawArea.height);
  ctx.restore();

  const radius = 36;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, x - 4, y - 4, drawArea.width + 8, drawArea.height + 8, radius);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (options.template === "film") {
    ctx.fillStyle = "rgba(8, 12, 23, 0.68)";
    ctx.fillRect(0, outputHeight - 240, outputWidth, 240);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 56px Manrope, system-ui, sans-serif";
    ctx.fillText(options.title || "Nilo Cam", 72, outputHeight - 154);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 28px Manrope, system-ui, sans-serif";
    ctx.fillText(options.subtitle || "Tu momento, en tiempo real", 72, outputHeight - 102);
  } else if (options.template === "frame") {
    ctx.strokeStyle = "rgba(212,163,115,0.9)";
    ctx.lineWidth = 18;
    roundRect(ctx, 26, 26, outputWidth - 52, outputHeight - 52, 52);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "800 44px Manrope, system-ui, sans-serif";
    ctx.fillText(options.title || "Nilo Cam", 66, 94);
  }

  // ── Watermark overlay ──────────────────────────────────────────────────
  if (options.watermark?.url) {
    try {
      const wm = options.watermark;
      const wmImg = await loadImage(wm.url);
      const margin = 40;
      const wmW = Math.round(outputWidth * (wm.size / 100));
      const wmH = Math.round(wmW * (wmImg.naturalHeight / wmImg.naturalWidth));
      let wx = margin;
      let wy = margin;
      if (wm.position === "top-right") wx = outputWidth - wmW - margin;
      if (wm.position === "bottom-left") wy = outputHeight - wmH - margin;
      if (wm.position === "bottom-right") {
        wx = outputWidth - wmW - margin;
        wy = outputHeight - wmH - margin;
      }
      ctx.save();
      ctx.globalAlpha = wm.opacity;
      ctx.drawImage(wmImg, wx, wy, wmW, wmH);
      ctx.restore();
    } catch {
      // If watermark fails to load, continue without it
    }
  }

  const qualitySequence = [0.92, 0.82, 0.72];
  for (const quality of qualitySequence) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size < 14 * 1024 * 1024 || quality === qualitySequence.at(-1)) {
      return blob;
    }
  }

  throw new Error("No se pudo comprimir la imagen.");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
