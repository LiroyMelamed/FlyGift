"use client";

import { motion } from "framer-motion";
import { TransactionHistoryView } from "@/components/trips/TransactionHistoryView";
import { t } from "@/i18n/he";

export default function TransactionsPage() {
    return (
        <div className="space-y-6 py-8" dir="rtl">
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <h1 className="font-display text-2xl font-semibold">
                    <span className="text-gradient-skyline">{t.nav.history}</span>
                </h1>
            </motion.header>

            <TransactionHistoryView />
        </div>
    );
}
