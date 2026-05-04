"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GiftCardCarousel } from "@/components/giftcard/GiftCardCarousel";
import { useAppStore } from "@/lib/appStore";
import { t } from "@/i18n/he";

export default function MyGiftsPage() {
    const router = useRouter();
    const cards = useAppStore((s) => s.cards);
    return (
        <div className="space-y-6 py-8" dir="rtl">
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <h1 className="font-display text-2xl font-semibold">
                    <span className="text-gradient-skyline">{t.nav.myGifts}</span>
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                    {t.dashboard.activeGifts}
                </p>
            </motion.header>

            <GiftCardCarousel
                cards={cards}
                onSelect={(c) => router.push(`/gifts/${c.id}`)}
            />
        </div>
    );
}
