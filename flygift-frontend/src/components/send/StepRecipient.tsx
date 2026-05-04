"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TextField, TextAreaField } from "@/components/ui/FormFields";
import type { GiftDraft } from "./types";

interface Props {
    draft: GiftDraft;
    setDraft: (next: GiftDraft) => void;
    errors: Partial<Record<keyof GiftDraft, string>>;
}

export function StepRecipient({ draft, setDraft, errors }: Props) {
    const firstFieldRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstFieldRef.current?.focus();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-5 text-right"
        >
            <header className="space-y-1 text-center">
                <h2 className="font-display text-xl font-semibold text-[#0F172A]">למי המתנה?</h2>
                <p className="text-sm text-[#0F172A]/70">
                    ספרו לנו על המטייל המזלהב.
                </p>
            </header>

            <TextField
                ref={firstFieldRef}
                label="שם המקבל/ת"
                placeholder="למשל שרה כהן"
                autoComplete="name"
                value={draft.recipientName}
                onChange={(e) =>
                    setDraft({ ...draft, recipientName: e.target.value })
                }
                error={errors.recipientName}
            />

            <TextField
                label="דוא״ל"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="sarah@example.com"
                value={draft.recipientEmail}
                onChange={(e) =>
                    setDraft({ ...draft, recipientEmail: e.target.value })
                }
                error={errors.recipientEmail}
            />

            <TextAreaField
                label="הודעה אישית"
                rows={4}
                maxLength={240}
                placeholder="תיהנה מהטיול בלתי נשכח ✈️"
                value={draft.message ?? ""}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                hint={`${(draft.message ?? "").length} / 240`}
            />
        </motion.div>
    );
}
