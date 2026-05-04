"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Plane, CheckCircle2, Wallet, ArrowRight, Download } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { nativeBridge } from "@/utils/nativeBridge";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import type { BookFlightResult } from "@/lib/flightTypes";

interface Props {
    result: BookFlightResult;
    onSearchAgain: () => void;
}

/**
 * High-end "Ticket Issued" screen — confetti, animated boarding-pass
 * stub, paid-from-balance / paid-from-card recap, and entry points to
 * the live wallet pass (consumed by Stage 11 endpoints once wired).
 */
export function TicketIssued({ result, onSearchAgain }: Props) {
    useEffect(() => {
        nativeBridge.haptic("success");
        nativeBridge.notify({
            id: `booking-${result.bookingId}`,
            title: "FlyGift — ההזמנה אושרה ✈װ",
            body: `${result.route} · ${result.flightNumber} · מושב ${result.seat}`,
            route: `/bookings/mine`,
        });
        const fire = (origin: { x: number; y: number }) =>
            confetti({
                particleCount: 90,
                spread: 75,
                startVelocity: 50,
                origin,
                ticks: 220,
                colors: ["#00E5FF", "#7C5CFF", "#D4AF7A", "#FFFFFF"],
            });
        const id = window.setTimeout(() => {
            fire({ x: 0.2, y: 0.4 });
            fire({ x: 0.8, y: 0.4 });
            window.setTimeout(() => fire({ x: 0.5, y: 0.3 }), 250);
        }, 80);
        return () => window.clearTimeout(id);
    }, []);

    const dep = new Date(result.departureUtc);

    return (
        <div className="mx-auto max-w-xl space-y-6 py-8" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="text-center space-y-3"
            >
                <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20 shadow-glow-success"
                >
                    <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={2.4} />
                </motion.div>
                <h1 className="font-display text-3xl font-semibold">
                    <span className="text-gradient-skyline">{t.flights.ticketIssued}</span>
                </h1>
                <p className="text-sm text-text-secondary">
                    {t.flights.bookingNo(result.bookingId)}
                </p>
            </motion.div>

            {/* Boarding pass */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
            >
                <GlassCard padding="none" tone="elevated" glow="cyan" className="overflow-hidden">
                    <div className="bg-gradient-to-br from-cyan-jet/15 via-transparent to-violet-aurora/10 p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-text-secondary">
                                {t.flights.boardingPass}
                            </p>
                            <Plane className="h-4 w-4 text-cyan-jet" />
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div>
                                <p className="font-mono text-3xl font-semibold tracking-wider tabular-nums">
                                    {result.route.split(" → ")[0]}
                                </p>
                            </div>
                            <div className="flex-1 border-t border-dashed border-white/20" />
                            <Plane className="h-4 w-4 -rotate-12 text-cyan-jet" />
                            <div className="flex-1 border-t border-dashed border-white/20" />
                            <div>
                                <p className="font-mono text-3xl font-semibold tracking-wider tabular-nums">
                                    {result.route.split(" → ")[1]}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                            <Cell label={t.flights.flight} value={result.flightNumber} />
                            <Cell label={t.flights.gate} value={result.gate} />
                            <Cell label={t.flights.seat} value={result.seat} />
                            <Cell
                                label={t.flights.depart2}
                                value={dep.toLocaleString("he-IL", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            />
                            <Cell
                                label={t.flights.total}
                                value={formatCurrencyDetailed(result.totalCharged, result.currency)}
                            />
                            <Cell label={t.flights.status} value={t.flights.confirmed} tone="success" />
                        </div>
                    </div>

                    {/* Stub punch line + barcode shimmer */}
                    <div className="relative h-12 bg-bg-base/50">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-bg-base" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-bg-base" />
                        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed border-white/15" />
                    </div>
                    <div className="p-5">
                        <div className="h-12 w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.85)_0,rgba(255,255,255,0.85)_2px,transparent_2px,transparent_5px)]" />
                    </div>
                </GlassCard>
            </motion.div>

            {/* Payment recap */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.45 }}
            >
                <GlassCard padding="md" className="space-y-2 text-sm">
                    <Row
                        label={t.flights.paidFromBalance}
                        value={`−${formatCurrencyDetailed(result.paidFromBalance, result.currency)}`}
                        tone="success"
                    />
                    {result.paidFromCard > 0 && (
                        <Row
                            label={`${t.flights.paidFromCard} · ${result.cardBrand?.toUpperCase() ?? ""} ····${result.cardLast4 ?? ""}`}
                            value={formatCurrencyDetailed(result.paidFromCard, result.currency)}
                        />
                    )}
                    <div className="border-t border-white/10" />
                    <Row
                        label={t.flights.remainingBalance}
                        value={formatCurrencyDetailed(
                            result.remainingBalance,
                            result.currency
                        )}
                        bold
                    />
                </GlassCard>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
            >
                {/*
                  * "Add to Wallet" routes to the user's bookings page —
                  * a flight booking is not a redeemable gift card, so
                  * /gifts/{bookingId} would 404. /bookings/mine renders
                  * the live wallet pass list keyed by bookingId.
                  */}
                <Link href="/bookings/mine" className="block">
                    <PrimaryButton type="button">
                        <span className="inline-flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            {t.flights.addToWallet}
                        </span>
                        <ArrowRight className="h-4 w-4 -scale-x-100" />
                    </PrimaryButton>
                </Link>
                <GhostButton
                    type="button"
                    onClick={() => downloadBoardingPass(result, dep)}
                    className="w-full"
                >
                    <span className="inline-flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {t.flights.downloadTicket}
                    </span>
                </GhostButton>
                <GhostButton type="button" onClick={onSearchAgain} className="w-full">
                    {t.flights.searchAnother}
                </GhostButton>
            </motion.div>
        </div>
    );
}

function Cell({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: "success";
}) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                {label}
            </p>
            <p
                className={`mt-0.5 font-mono text-sm font-semibold ${tone === "success" ? "text-success" : "text-text-primary"
                    }`}
            >
                {value}
            </p>
        </div>
    );
}

function Row({
    label,
    value,
    bold,
    tone,
}: {
    label: string;
    value: string;
    bold?: boolean;
    tone?: "success";
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-text-secondary">{label}</span>
            <span
                className={`font-mono tabular-nums ${bold ? "text-base font-semibold text-text-primary" : "text-sm"
                    } ${tone === "success" ? "text-success" : ""}`}
            >
                {value}
            </span>
        </div>
    );
}

/**
 * "PDF" download — opens a printable HTML boarding pass in a new
 * window and triggers the browser print dialog (user can save as PDF).
 * No native PDF library is required; the print stylesheet is inline.
 */
function downloadBoardingPass(result: BookFlightResult, dep: Date) {
    const w = window.open("", "_blank", "noopener,width=720,height=900");
    if (!w) return;
    const route = result.route;
    const departLabel = dep.toLocaleString("he-IL", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const totalLabel = formatCurrencyDetailed(
        result.totalCharged,
        result.currency
    );
    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>FlyGift · Boarding Pass · ${result.bookingId}</title>
<style>
  @page { size: auto; margin: 1cm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    background: #0F172A;
    color: #0F172A;
    padding: 24px;
  }
  .pass {
    max-width: 640px;
    margin: 0 auto;
    background: #fff;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,.25);
  }
  .head {
    background: linear-gradient(135deg, #00E5FF 0%, #0066FF 100%);
    color: #fff;
    padding: 24px;
  }
  .brand { font-size: 12px; letter-spacing: .25em; text-transform: uppercase; opacity: .85; }
  .title { font-size: 28px; font-weight: 700; margin-top: 8px; }
  .body { padding: 24px; }
  .route {
    display: flex; align-items: center; justify-content: space-between;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 36px; font-weight: 700; letter-spacing: .08em;
    margin: 8px 0 16px;
  }
  .route .arrow { font-size: 20px; opacity: .5; }
  .grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 16px;
  }
  .cell .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .15em; color: #64748b; }
  .cell .val { font-size: 16px; font-weight: 600; margin-top: 2px; font-family: ui-monospace, monospace; }
  .footer { padding: 16px 24px; background: #f1f5f9; font-size: 11px; color: #64748b; text-align: center; letter-spacing: .12em; text-transform: uppercase; }
  @media print {
    body { background: #fff; padding: 0; }
    .pass { box-shadow: none; }
  }
</style>
</head>
<body onload="window.focus(); window.print();">
  <div class="pass">
    <div class="head">
      <div class="brand">FlyGift · Boarding Pass</div>
      <div class="title">${escapeHtml(route)}</div>
    </div>
    <div class="body">
      <div class="route">
        <span>${escapeHtml(route.split(" → ")[0] ?? route.split(" ⇄ ")[0] ?? "")}</span>
        <span class="arrow">✈</span>
        <span>${escapeHtml(route.split(" → ")[1] ?? route.split(" ⇄ ")[1] ?? "")}</span>
      </div>
      <div class="grid">
        <div class="cell"><div class="lbl">Flight</div><div class="val">${escapeHtml(result.flightNumber)}</div></div>
        <div class="cell"><div class="lbl">Gate</div><div class="val">${escapeHtml(result.gate)}</div></div>
        <div class="cell"><div class="lbl">Seat</div><div class="val">${escapeHtml(result.seat)}</div></div>
        <div class="cell"><div class="lbl">Depart</div><div class="val">${escapeHtml(departLabel)}</div></div>
        <div class="cell"><div class="lbl">Total</div><div class="val">${escapeHtml(totalLabel)}</div></div>
        <div class="cell"><div class="lbl">Booking</div><div class="val">${escapeHtml(String(result.bookingId))}</div></div>
      </div>
    </div>
    <div class="footer">FlyGift · Confirmed · Keep this pass for boarding</div>
  </div>
</body>
</html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
}

function escapeHtml(s: string) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
