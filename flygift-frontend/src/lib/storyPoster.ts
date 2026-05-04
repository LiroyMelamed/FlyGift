/**
 * Stage 18 — Viral Social Sharing.
 *
 * Pure-browser Canvas 2D renderer that turns a gift card into a
 * 1080×1920 (9:16) "Instagram Story" poster — looks like a premium
 * travel ad, with the 3D card centered, "A Gift from {Company}" up top,
 * and "FlyGift.com" footer. Returns a base64 PNG ready to ship across
 * the native bridge (or download in the browser).
 *
 * No external deps: works inside the WebView shell with zero install.
 */

import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";
import { formatCurrencyDetailed } from "@/utils/format";

export interface StoryPosterOptions {
    card: MockGiftCard;
    /** Override the "A Gift from X" line. Defaults to `card.senderName`. */
    companyName?: string;
    /** Defaults to "flygift.com". */
    brandFooter?: string;
    /** Output resolution. Instagram Story = 1080×1920. */
    width?: number;
    height?: number;
    /** Progress callback (0..1) so the UI can drive a progress bar. */
    onProgress?: (pct: number) => void;
}

export interface StoryPosterResult {
    /** Raw base64 (no data: prefix) — ideal for native share payloads. */
    base64: string;
    /** Full data URL — usable directly in <img src> / download links. */
    dataUrl: string;
    width: number;
    height: number;
}

/* ------------------------------------------------------------------ */
/* Variant palettes (mirrors GiftCard3D so the poster looks like the   */
/* very same card the user sees on screen).                            */
/* ------------------------------------------------------------------ */

interface VariantPalette {
    cardStops: [string, string, string, string];
    glow: string;
    accent: string;
}

const VARIANT_PALETTES: Record<GiftCardVariant, VariantPalette> = {
    "cyan-jet": {
        cardStops: ["#021024", "#0066FF", "#00E5FF", "#5BF0FF"],
        glow: "rgba(0,229,255,0.55)",
        accent: "#5BF0FF",
    },
    "gold-champagne": {
        cardStops: ["#1A0F02", "#4A2E0A", "#B7894C", "#D4AF7A"],
        glow: "rgba(212,175,122,0.55)",
        accent: "#D4AF7A",
    },
    "violet-aurora": {
        cardStops: ["#0A0524", "#3A1E8A", "#7C5CFF", "#B89CFF"],
        glow: "rgba(124,92,255,0.55)",
        accent: "#B89CFF",
    },
};

const CATEGORY_GLYPH: Record<MockGiftCard["category"], string> = {
    Flights: "✈",
    Hotels: "⌂",
    Travel: "✦",
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function generateStoryPoster(
    opts: StoryPosterOptions
): Promise<StoryPosterResult> {
    const W = opts.width ?? 1080;
    const H = opts.height ?? 1920;
    const { card } = opts;
    const palette = VARIANT_PALETTES[card.variant];
    const company = opts.companyName ?? card.senderName ?? "FlyGift";
    const footer = opts.brandFooter ?? "flygift.com";
    const tick = (p: number) => opts.onProgress?.(Math.min(1, Math.max(0, p)));

    // Yield to the event loop so the UI can paint the loading state.
    tick(0.05);
    await raf();

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // 1) Background — deep midnight sky with aurora glows.
    paintBackground(ctx, W, H, palette);
    tick(0.25);
    await raf();

    // 2) "A Gift from {Company}" header block.
    paintHeader(ctx, W, H, company, palette);
    tick(0.4);
    await raf();

    // 3) The 3D-style card centerpiece.
    paintCard(ctx, W, H, card, palette);
    tick(0.75);
    await raf();

    // 4) Footer — brand mark & call-to-action.
    paintFooter(ctx, W, H, footer);
    tick(0.92);
    await raf();

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] ?? "";
    tick(1);

    return { base64, dataUrl, width: W, height: H };
}

/** Trigger a browser download of the poster (web fallback). */
export function downloadStoryPoster(
    dataUrl: string,
    filename = "flygift-story.png"
): void {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/* ------------------------------------------------------------------ */
/* Painters                                                            */
/* ------------------------------------------------------------------ */

function paintBackground(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    palette: VariantPalette
): void {
    // Base gradient — midnight to ink black.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#02061A");
    bg.addColorStop(0.55, "#040A1F");
    bg.addColorStop(1, "#000208");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Aurora glow #1 — top-left, accent-tinted.
    radialGlow(ctx, W * 0.22, H * 0.18, W * 0.7, palette.glow, 0.55);
    // Aurora glow #2 — bottom-right, magenta/violet.
    radialGlow(ctx, W * 0.85, H * 0.82, W * 0.65, "rgba(124,92,255,0.35)", 0.6);
    // Soft core highlight behind the card.
    radialGlow(ctx, W / 2, H / 2, W * 0.6, "rgba(255,255,255,0.05)", 0.7);

    // Star-field — adds depth/premium feel.
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    // Deterministic pseudo-random so renders are stable across calls.
    let seed = 1337;
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    for (let i = 0; i < 90; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const r = rand() * 1.6 + 0.4;
        ctx.globalAlpha = 0.25 + rand() * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function paintHeader(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    company: string,
    palette: VariantPalette
): void {
    const cx = W / 2;

    // Eyebrow pill: "A GIFT FROM"
    ctx.save();
    ctx.font =
        "600 30px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const eyebrow = "A  G I F T   F R O M";
    const ew = ctx.measureText(eyebrow).width + 60;
    const eh = 56;
    const ey = H * 0.13;
    roundRect(ctx, cx - ew / 2, ey - eh / 2, ew, eh, eh / 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.accent + "66";
    ctx.stroke();
    ctx.fillStyle = palette.accent;
    ctx.fillText(eyebrow, cx, ey);
    ctx.restore();

    // Company name — display headline.
    ctx.save();
    ctx.font =
        "700 96px ui-serif, 'Times New Roman', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Soft shadow for legibility against the aurora.
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    // Gradient fill for premium feel.
    const headlineGrad = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.28);
    headlineGrad.addColorStop(0, "#FFFFFF");
    headlineGrad.addColorStop(1, palette.accent);
    ctx.fillStyle = headlineGrad;
    const trimmed = truncate(ctx, company, W * 0.86, 96);
    ctx.fillText(trimmed, cx, H * 0.22);
    ctx.restore();

    // Tagline
    ctx.save();
    ctx.font =
        "400 36px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText("The world is yours to explore", cx, H * 0.27);
    ctx.restore();
}

function paintCard(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    card: MockGiftCard,
    palette: VariantPalette
): void {
    // Card geometry — 1.586:1 (credit-card ratio), centered.
    const cardW = W * 0.82;
    const cardH = cardW / 1.586;
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2 + 30;
    const r = 60;

    // Outer glow — colored shadow that matches the variant.
    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 90;
    ctx.shadowOffsetY = 30;
    ctx.fillStyle = "#000";
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
    ctx.restore();

    // Card body — diagonal brand gradient.
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.clip();
    const bodyGrad = ctx.createLinearGradient(
        cardX,
        cardY,
        cardX + cardW,
        cardY + cardH
    );
    const stops = palette.cardStops;
    bodyGrad.addColorStop(0, stops[0]);
    bodyGrad.addColorStop(0.35, stops[1]);
    bodyGrad.addColorStop(0.75, stops[2]);
    bodyGrad.addColorStop(1, stops[3]);
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Holographic shimmer streak.
    const shimmer = ctx.createLinearGradient(
        cardX,
        cardY,
        cardX + cardW,
        cardY + cardH
    );
    shimmer.addColorStop(0, "rgba(255,255,255,0)");
    shimmer.addColorStop(0.45, "rgba(255,255,255,0.15)");
    shimmer.addColorStop(0.55, "rgba(255,255,255,0.28)");
    shimmer.addColorStop(0.75, "rgba(255,255,255,0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Subtle grid for depth.
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
        const yy = cardY + (cardH / 6) * i;
        ctx.beginPath();
        ctx.moveTo(cardX, yy);
        ctx.lineTo(cardX + cardW, yy);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Glass border.
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    roundRect(ctx, cardX + 1, cardY + 1, cardW - 2, cardH - 2, r - 1);
    ctx.stroke();
    ctx.restore();

    // ---- Card content -------------------------------------------------
    const padX = cardX + 56;
    const padY = cardY + 56;

    // Top row — category glyph + brand
    ctx.save();
    ctx.font =
        "700 30px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${CATEGORY_GLYPH[card.category]}  FLYGIFT`, padX, padY);
    ctx.restore();

    // Top-right — category badge
    ctx.save();
    ctx.font =
        "600 22px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const cat = card.category.toUpperCase();
    const cw = ctx.measureText(cat).width + 36;
    const ch = 40;
    const cbx = cardX + cardW - 56 - cw;
    roundRect(ctx, cbx, padY - 4, cw, ch, ch / 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(cat, cbx + cw - 18, padY + 5);
    ctx.restore();

    // Embossed amount — the hero number.
    ctx.save();
    ctx.font =
        "800 148px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#FFFFFF";
    const amount = formatCurrencyDetailed(card.amount, card.currency);
    ctx.fillText(amount, padX, cardY + cardH * 0.7);
    ctx.restore();

    // Recipient line.
    ctx.save();
    ctx.font =
        "500 26px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
        `For ${card.recipientName.toUpperCase()}`,
        padX,
        cardY + cardH - 56
    );
    ctx.restore();
}

function paintFooter(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    brandFooter: string
): void {
    const cx = W / 2;
    const fy = H * 0.92;

    // Divider
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.32, fy - 60);
    ctx.lineTo(W * 0.68, fy - 60);
    ctx.stroke();
    ctx.restore();

    // CTA
    ctx.save();
    ctx.font =
        "700 56px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const grad = ctx.createLinearGradient(0, fy - 20, 0, fy + 20);
    grad.addColorStop(0, "#5BF0FF");
    grad.addColorStop(1, "#B89CFF");
    ctx.fillStyle = grad;
    ctx.fillText(brandFooter.toUpperCase(), cx, fy);
    ctx.restore();

    // Subline
    ctx.save();
    ctx.font =
        "500 24px ui-sans-serif, -apple-system, 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Premium travel, gifted.", cx, fy + 50);
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function radialGlow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
    alpha: number
): void {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

function truncate(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    fontSize: number
): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const candidate = text.slice(0, mid) + "…";
        if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
        else hi = mid - 1;
    }
    void fontSize; // referenced for future per-size tuning
    return text.slice(0, lo) + "…";
}

function raf(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 16);
        }
    });
}
