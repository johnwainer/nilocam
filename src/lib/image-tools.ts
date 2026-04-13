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
  x: number, y: number, w: number, h: number, r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Draw img to cover the given area (clipped to that area) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  ax: number, ay: number, aw: number, ah: number
) {
  const scale = Math.max(aw / img.naturalWidth, ah / img.naturalHeight);
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  const dx = ax + Math.round((aw - dw) / 2);
  const dy = ay + Math.round((ah - dh) / 2);
  ctx.drawImage(img, dx, dy, dw, dh);
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
  const H = 1350; // 4:5 portrait
  canvas.width = W;
  canvas.height = H;

  // ── CSS filter string ────────────────────────────────────────────────
  const filterStr = (() => {
    switch (options.filter) {
      case "warm":     return "sepia(0.2) saturate(1.22) contrast(1.05) brightness(1.03)";
      case "golden":   return "sepia(0.45) saturate(1.4) brightness(1.05) contrast(1.08)";
      case "rose":     return "sepia(0.15) saturate(1.3) hue-rotate(-15deg) brightness(1.06)";
      case "vintage":  return "sepia(0.55) saturate(0.85) contrast(0.9) brightness(1.1)";
      case "dream":    return "saturate(1.05) contrast(0.96) brightness(1.1)";
      case "soft":     return "brightness(1.14) saturate(0.8) contrast(0.9)";
      case "fade":     return "contrast(0.84) brightness(1.14) saturate(0.7)";
      case "matte":    return "contrast(0.86) saturate(0.78) brightness(1.08) sepia(0.08)";
      case "cool":     return "saturate(0.88) hue-rotate(18deg) brightness(1.05) contrast(1.06)";
      case "mono":     return "grayscale(1) contrast(1.08)";
      case "noir":     return "grayscale(1) contrast(1.45) brightness(0.88)";
      case "pop":      return "saturate(1.5) contrast(1.14) brightness(1.04)";
      case "vivid":    return "saturate(1.8) contrast(1.18) brightness(1.02)";
      case "dramatic": return "contrast(1.4) brightness(0.86) saturate(1.1)";
      default:         return "none";
    }
  })();

  // ── 1. Draw photo ────────────────────────────────────────────────────
  if (options.template === "polaroid") {
    // White background, then photo in bordered area
    ctx.fillStyle = "#fafaf8";
    ctx.fillRect(0, 0, W, H);

    const pad = 40;
    const bot = 150;
    ctx.save();
    ctx.filter = filterStr;
    // clip photo to inner area
    roundRect(ctx, pad, pad, W - pad * 2, H - pad - bot, 4);
    ctx.clip();
    drawCover(ctx, img, pad, pad, W - pad * 2, H - pad - bot);
    ctx.restore();
  } else {
    // All other templates: photo covers full canvas
    ctx.save();
    ctx.filter = filterStr;
    drawCover(ctx, img, 0, 0, W, H);
    ctx.restore();
  }

  // ── 2. Template decoration ───────────────────────────────────────────
  switch (options.template) {

    case "film": {
      // Cinematic letterbox gradient bars
      const barH = 110;
      const topG = ctx.createLinearGradient(0, 0, 0, barH);
      topG.addColorStop(0, "rgba(0,0,0,0.85)");
      topG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topG; ctx.fillRect(0, 0, W, barH);

      const btmG = ctx.createLinearGradient(0, H - barH, 0, H);
      btmG.addColorStop(0, "rgba(0,0,0,0)");
      btmG.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = btmG; ctx.fillRect(0, H - barH, W, barH);

      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, barH); ctx.lineTo(W, barH);
      ctx.moveTo(0, H - barH); ctx.lineTo(W, H - barH);
      ctx.stroke();
      break;
    }

    case "frame": {
      // Double border + L-corner ornaments
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      roundRect(ctx, 28, 28, W - 56, H - 56, 10); ctx.stroke();

      ctx.strokeStyle = "rgba(212,163,115,0.88)";
      ctx.lineWidth = 3;
      roundRect(ctx, 44, 44, W - 88, H - 88, 6); ctx.stroke();

      const cOff = 58; const cLen = 64;
      ctx.strokeStyle = "rgba(212,163,115,0.9)";
      ctx.lineWidth = 5; ctx.lineCap = "square";
      for (const [cx, cy, dx, dy] of [
        [cOff, cOff, 1, 1], [W - cOff, cOff, -1, 1],
        [cOff, H - cOff, 1, -1], [W - cOff, H - cOff, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cLen);
        ctx.stroke();
      }
      break;
    }

    case "polaroid": {
      // Shadow under polaroid body
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, W, H);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // Bottom white mat line separator
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, H - 150); ctx.lineTo(W - 40, H - 150);
      ctx.stroke();
      break;
    }

    case "vignette": {
      // Radial dark gradient from corners
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(0.65, "rgba(0,0,0,0.18)");
      vg.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      break;
    }

    case "minimal": {
      // Single thin white border near edges
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2.5;
      roundRect(ctx, 22, 22, W - 44, H - 44, 6); ctx.stroke();
      break;
    }

    case "double": {
      // Two concentric white lines
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 18, 18, W - 36, H - 36, 8); ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.60)";
      ctx.lineWidth = 2;
      roundRect(ctx, 32, 32, W - 64, H - 64, 5); ctx.stroke();
      break;
    }

    case "corner": {
      // White L-shaped corner marks only
      const cOff = 28; const cLen = 70;
      ctx.strokeStyle = "rgba(255,255,255,0.82)";
      ctx.lineWidth = 4; ctx.lineCap = "square";
      for (const [cx, cy, dx, dy] of [
        [cOff, cOff, 1, 1], [W - cOff, cOff, -1, 1],
        [cOff, H - cOff, 1, -1], [W - cOff, H - cOff, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cLen);
        ctx.stroke();
      }
      break;
    }

    default: break; // clean — no decoration
  }

  // ── 3. Watermark (always on top of everything) ───────────────────────
  if (options.watermark?.url) {
    try {
      const wm = options.watermark;
      const wmImg = await loadImage(wm.url);
      const margin = 32;
      const wmW = Math.round(W * (wm.size / 100));
      const wmH = Math.round(wmW * (wmImg.naturalHeight / wmImg.naturalWidth));
      let wx = margin, wy = margin;
      if (wm.position === "top-right")    wx = W - wmW - margin;
      if (wm.position === "bottom-left")  wy = H - wmH - margin;
      if (wm.position === "bottom-right") { wx = W - wmW - margin; wy = H - wmH - margin; }
      ctx.save();
      ctx.globalAlpha = wm.opacity;
      ctx.drawImage(wmImg, wx, wy, wmW, wmH);
      ctx.restore();
    } catch { /* skip if watermark fails */ }
  }

  // ── 4. Compress ──────────────────────────────────────────────────────
  for (const quality of [0.92, 0.82, 0.72]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size < 14 * 1024 * 1024 || quality === 0.72) return blob;
  }
  throw new Error("No se pudo comprimir la imagen.");
}
