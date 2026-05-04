"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { TrendPoint } from "@/lib/analyticsTypes";

interface Props {
    data: TrendPoint[];
    height?: number;
}

/**
 * Dual-line area chart (distributed vs. used) drawn as a single SVG.
 * Cinematic Skyline gradient + animated path stroke. No chart lib.
 */
export function TrendChart({ data, height = 220 }: Props) {
    const padding = { top: 20, right: 12, bottom: 28, left: 44 };
    const w = 720;
    const h = height;
    const innerW = w - padding.left - padding.right;
    const innerH = h - padding.top - padding.bottom;

    const { distPath, usedPath, distArea, usedArea, max, ticks, xLabels } = useMemo(() => {
        if (!data.length) {
            return { distPath: "", usedPath: "", distArea: "", usedArea: "", max: 0, ticks: [], xLabels: [] as { x: number; label: string }[] };
        }
        const max = Math.max(...data.map((p) => Math.max(p.distributed, p.used))) * 1.1 || 1;
        const stepX = innerW / Math.max(data.length - 1, 1);

        const xy = (i: number, v: number) => ({
            x: padding.left + i * stepX,
            y: padding.top + innerH - (v / max) * innerH,
        });

        const toPath = (key: "distributed" | "used") =>
            data
                .map((p, i) => {
                    const { x, y } = xy(i, p[key]);
                    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(" ");

        const toArea = (key: "distributed" | "used") => {
            const line = toPath(key);
            const last = xy(data.length - 1, data[data.length - 1][key]);
            const first = xy(0, data[0][key]);
            return `${line} L${last.x.toFixed(1)} ${(padding.top + innerH).toFixed(
                1
            )} L${first.x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;
        };

        const tickValues = [0, max * 0.25, max * 0.5, max * 0.75, max];
        const ticks = tickValues.map((v) => ({
            v,
            y: padding.top + innerH - (v / max) * innerH,
        }));

        const xLabels = data.map((p, i) => {
            const d = new Date(p.periodStart);
            return {
                x: padding.left + i * stepX,
                label:
                    i % Math.max(1, Math.floor(data.length / 6)) === 0
                        ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        : "",
            };
        });

        return {
            distPath: toPath("distributed"),
            usedPath: toPath("used"),
            distArea: toArea("distributed"),
            usedArea: toArea("used"),
            max,
            ticks,
            xLabels,
        };
    }, [data, innerH, innerW, padding.left, padding.top]);

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
            <defs>
                <linearGradient id="dist-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="used-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* gridlines + y-axis ticks */}
            {ticks.map((t, i) => (
                <g key={i}>
                    <line
                        x1={padding.left}
                        x2={w - padding.right}
                        y1={t.y}
                        y2={t.y}
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <text
                        x={padding.left - 6}
                        y={t.y + 3}
                        textAnchor="end"
                        fontSize={10}
                        fill="rgba(244,246,251,0.5)"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                    >
                        {Math.round(t.v / 1000)}k
                    </text>
                </g>
            ))}

            {/* areas */}
            <motion.path
                d={distArea}
                fill="url(#dist-grad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
            />
            <motion.path
                d={usedArea}
                fill="url(#used-grad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            />

            {/* lines */}
            <motion.path
                d={distPath}
                fill="none"
                stroke="#7C5CFF"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
            <motion.path
                d={usedPath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
            />

            {/* x labels */}
            {xLabels.map((t, i) =>
                t.label ? (
                    <text
                        key={i}
                        x={t.x}
                        y={h - 8}
                        textAnchor="middle"
                        fontSize={10}
                        fill="rgba(244,246,251,0.55)"
                    >
                        {t.label}
                    </text>
                ) : null
            )}
        </svg>
    );
}
