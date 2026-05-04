"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { nativeBridge } from "@/utils/nativeBridge";

export interface QuickActionProps {
    href: string;
    label: string;
    icon: LucideIcon;
    tone?: "cyan" | "gold" | "violet";
}

const TONE = {
    cyan: {
        iconBg: "bg-cyan-jet/15",
        iconColor: "text-cyan-jet",
        glow: "group-hover:shadow-glow-cyan",
    },
    gold: {
        iconBg: "bg-gold-champagne/15",
        iconColor: "text-gold-champagne",
        glow: "group-hover:shadow-glow-gold",
    },
    violet: {
        iconBg: "bg-violet-aurora/15",
        iconColor: "text-violet-aurora",
        glow: "",
    },
} as const;

export function QuickAction({
    href,
    label,
    icon: Icon,
    tone = "cyan",
}: QuickActionProps) {
    const t = TONE[tone];
    return (
        <Link
            href={href}
            onClick={() => nativeBridge.haptic("light")}
            className="ring-focus group flex flex-col items-center gap-2"
        >
            <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl glass transition-shadow",
                    t.glow
                )}
            >
                <span
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        t.iconBg
                    )}
                >
                    <Icon className={cn("h-5 w-5", t.iconColor)} strokeWidth={2} />
                </span>
            </motion.div>
            <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                {label}
            </span>
        </Link>
    );
}
