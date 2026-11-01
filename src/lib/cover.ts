import type { CoverTemplateId } from "./constants";

export interface CoverOptions {
  template: CoverTemplateId;
  title: string;
  author: string;
  genre: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: "serif" | "sans";
  titleScale: number;
  tracking: number;
  align: "left" | "center";
  titleY: number;
  image: HTMLImageElement | null;
  imageOpacity: number;
}

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 1800;

function fontStack(kind: "serif" | "sans"): string {
  return kind === "serif"
    ? '"Cormorant Garamond", Georgia, "Times New Roman", serif'
    : '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
}

function measureTracked(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  let width = 0;
  for (const char of text) width += ctx.measureText(char).width + tracking;
  return width - (text.length > 0 ? tracking : 0);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "center"
) {
  const total = measureTracked(ctx, text, tracking);
  let cursor = align === "center" ? x - total / 2 : x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
}

function wrapTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  tracking: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTracked(ctx, candidate, tracking) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  opacity: number
) {
  const scale = Math.max(COVER_WIDTH / img.width, COVER_HEIGHT / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, (COVER_WIDTH - w) / 2, (COVER_HEIGHT - h) / 2, w, h);
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, strength = 0.85) {
  const grad = ctx.createRadialGradient(
    COVER_WIDTH / 2,
    COVER_HEIGHT * 0.45,
    COVER_WIDTH * 0.15,
    COVER_WIDTH / 2,
    COVER_HEIGHT * 0.5,
    COVER_WIDTH * 0.85
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
}

export function renderCover(canvas: HTMLCanvasElement, options: CoverOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const {
    template,
    title,
    author,
    genre,
    bgColor,
    accentColor,
    textColor,
    fontFamily,
    titleScale,
    tracking,
    align,
    titleY,
    image,
    imageOpacity,
  } = options;

  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;

  ctx.clearRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  if (image) drawImageCover(ctx, image, imageOpacity);

  // base tint so text stays readable over images
  const tint = ctx.createLinearGradient(0, 0, 0, COVER_HEIGHT);
  tint.addColorStop(0, "rgba(0,0,0,0.32)");
  tint.addColorStop(0.45, "rgba(0,0,0,0.12)");
  tint.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);

  const pad = 86;
  const centerX = COVER_WIDTH / 2;
  const anchorX = align === "center" ? centerX : pad;

  /* ——— Template decorations ——— */
  if (template === "gothic") {
    ctx.strokeStyle = "rgba(232,220,200,0.30)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, COVER_WIDTH - pad * 2, COVER_HEIGHT - pad * 2);
    ctx.strokeStyle = "rgba(232,220,200,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 16, pad + 16, COVER_WIDTH - (pad + 16) * 2, COVER_HEIGHT - (pad + 16) * 2);
  }

  if (template === "supernatural") {
    const glow = ctx.createRadialGradient(
      centerX,
      COVER_HEIGHT * 0.3,
      40,
      centerX,
      COVER_HEIGHT * 0.3,
      COVER_WIDTH * 0.7
    );
    glow.addColorStop(0, "rgba(232,220,200,0.13)");
    glow.addColorStop(1, "rgba(232,220,200,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
    vignette(ctx, 0.9);

    ctx.strokeStyle = "rgba(232,220,200,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, COVER_HEIGHT * 0.74);
    ctx.lineTo(COVER_WIDTH - pad, COVER_HEIGHT * 0.74);
    ctx.stroke();
  }

  if (template === "psychological") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, COVER_HEIGHT * 0.22, 3, COVER_HEIGHT * 0.34);
  }

  if (template === "folklore") {
    ctx.strokeStyle = "rgba(214,185,138,0.42)";
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, COVER_WIDTH - pad * 2, COVER_HEIGHT - pad * 2);
    ctx.strokeStyle = "rgba(214,185,138,0.20)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 22, pad + 22, COVER_WIDTH - (pad + 22) * 2, COVER_HEIGHT - (pad + 22) * 2);

    const corners = [
      [pad + 22, pad + 22],
      [COVER_WIDTH - pad - 22, pad + 22],
      [pad + 22, COVER_HEIGHT - pad - 22],
      [COVER_WIDTH - pad - 22, COVER_HEIGHT - pad - 22],
    ];
    ctx.fillStyle = "rgba(214,185,138,0.5)";
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 7);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();
    }
    vignette(ctx, 0.55);
  }

  if (template === "minimal") {
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, COVER_HEIGHT - pad - 120, 54, 3);
  }

  /* ——— Genre eyebrow ——— */
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(232,220,200,0.55)";
  ctx.font = `500 24px ${fontStack("sans")}`;
  const genreText = genre.toUpperCase();
  drawTracked(ctx, genreText, align === "center" ? centerX : anchorX, pad + 84, 8, align);

  /* ——— Title ——— */
  const baseSize = template === "minimal" ? 92 : 108;
  const fontSize = Math.round(baseSize * titleScale);
  ctx.font = `${fontFamily === "serif" ? "400" : "600"} ${fontSize}px ${fontStack(fontFamily)}`;
  ctx.fillStyle = textColor;

  const maxWidth = COVER_WIDTH - pad * 2;
  const lines = wrapTitle(ctx, title || "Tanpa Judul", maxWidth, tracking);
  const lineHeight = fontSize * 1.14;
  const totalHeight = lines.length * lineHeight;
  const startY = Math.max(pad + 240, COVER_HEIGHT * titleY - totalHeight / 2) + fontSize * 0.78;

  lines.forEach((line, index) => {
    drawTracked(ctx, line, anchorX, startY + index * lineHeight, tracking, align);
  });

  /* ——— Divider + author ——— */
  const afterTitleY = startY + (lines.length - 1) * lineHeight + fontSize * 0.62;

  if (template === "gothic" || template === "folklore") {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    const w = 64;
    const x = align === "center" ? centerX - w / 2 : anchorX;
    ctx.beginPath();
    ctx.moveTo(x, afterTitleY + 26);
    ctx.lineTo(x + w, afterTitleY + 26);
    ctx.stroke();
  }

  ctx.font = `italic 400 38px ${fontStack("serif")}`;
  ctx.fillStyle = "rgba(232,220,200,0.82)";
  const authorY = afterTitleY + 118;
  drawTracked(
    ctx,
    author || "Tanpa Nama",
    align === "center" ? centerX : anchorX,
    authorY,
    2,
    align
  );

  if (template === "minimal") {
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(COVER_WIDTH - pad - 6, COVER_HEIGHT - pad - 26, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (template === "supernatural") {
    ctx.fillStyle = "rgba(232,220,200,0.28)";
    ctx.font = `400 20px ${fontStack("sans")}`;
    drawTracked(ctx, "TEROR MISTIK", centerX, COVER_HEIGHT - pad - 20, 10, "center");
  }

  // subtle grain
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * COVER_WIDTH;
    const y = Math.random() * COVER_HEIGHT;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  roundRect(ctx, x, y, w, h, r);
}
