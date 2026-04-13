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

function fitCover(imgW: number, imgH: number, canvasW: number, canvasH: number) {
  const scale = Math.max(canvasW / imgW, canvasH / imgH);
  const w = Math.round(imgW * scale);
  const h = Math.round(imgH * scale);
  return {
    x: Math.round((canvasW - w) / 2),
    y: Math.round((canvasH - h) / 2),
    width: w,
    height: h,
  };
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("No se pudo generar la imagen editada.")); return; }
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, radius: number
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

  const W = 1080;
  const H = 1350; // 4:5 — Instagram-friendly portrait
  canvas.width = W;
  canvas.height = H;

  // ── 1. Draw photo (cover-fill) with filter ──────────────────────────────
  const { x, y, width, height } = fitCover(img.naturalWidth, img.naturalHeight, W, H);
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
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();

  // ── 2. Template decorations (purely visual, no text) ───────────────────
  if (options.template === "film") {
    // Cinematic letterbox: dark gradient bars at top and bottom
    const barH = 110;

    const topGrad = ctx.createLinearGradient(0, 0, 0, barH);
    topGrad.addColorStop(0, "rgba(0,0,0,0.82)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, barH);

    const btmGrad = ctx.createLinearGradient(0, H - barH, 0, H);
    btmGrad.addColorStop(0, "rgba(0,0,0,0)");
    btmGrad.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, H - barH, W, barH);

    // Thin separator lines
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, barH); ctx.lineTo(W, barH);
    ctx.moveTo(0, H - barH); ctx.lineTo(W, H - barH);
    ctx.stroke();

  } else if (options.template === "frame") {
    // Elegant double frame + corner ornaments — no text
    const m1 = 28; // outer frame margin
    const m2 = 44; // inner frame margin

    // outer thin white line
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    roundRect(ctx, m1, m1, W - m1 * 2, H - m1 * 2, 10);
    ctx.stroke();

    // inner golden line
    ctx.strokeStyle = "rgba(212,163,115,0.85)";
    ctx.lineWidth = 3;
    roundRect(ctx, m2, m2, W - m2 * 2, H - m2 * 2, 6);
    ctx.stroke();

    // Corner ornaments — L-shaped gold strokes
    const cOff = m2 + 14;
    const cLen = 60;
    ctx.strokeStyle = "rgba(212,163,115,0.9)";
    ctx.lineWidth = 5;
    ctx.lineCap = "square";
    const corners: [number, number, number, number][] = [
      [cOff, cOff, 1, 1],
      [W - cOff, cOff, -1, 1],
      [cOff, H - cOff, 1, -1],
      [W - cOff, H - cOff, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cLen, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * cLen);
      ctx.stroke();
    }
  }

  // ── 3. Watermark ────────────────────────────────────────────────────────
  if (options.watermark?.url) {
    try {
      const wm = options.watermark;
      const wmImg = await loadImage(wm.url);
      const margin = 32;
      const wmW = Math.round(W * (wm.size / 100));
      const wmH = Math.round(wmW * (wmImg.naturalHeight / wmImg.naturalWidth));
      let wx = margin;
      let wy = margin;
      if (wm.position === "top-right")    wx = W - wmW - margin;
      if (wm.position === "bottom-left")  wy = H - wmH - margin;
      if (wm.position === "bottom-right") { wx = W - wmW - margin; wy = H - wmH - margin; }
      ctx.save();
      ctx.globalAlpha = wm.opacity;
      ctx.drawImage(wmImg, wx, wy, wmW, wmH);
      ctx.restore();
    } catch {
      // watermark load failure — skip silently
    }
  }

  // ── 4. Compress ─────────────────────────────────────────────────────────
  const qualitySequence = [0.92, 0.82, 0.72];
  for (const quality of qualitySequence) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size < 14 * 1024 * 1024 || quality === qualitySequence.at(-1)) return blob;
  }

  throw new Error("No se pudo comprimir la imagen.");
}
