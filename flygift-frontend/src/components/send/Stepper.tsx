"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface StepperProps {
    steps: string[];
    current: number; // 0-based
    className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
    return (
        <ol className={cn("flex items-start gap-2", className)} aria-label="Progress">
            {steps.map((label, i) => {
                const isDone = i < current;
                const isActive = i === current;
                return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                        <div className="flex flex-col items-center gap-1.5">
                            <motion.span
                                initial={false}
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    backgroundColor: isDone || isActive ? "#00E5FF" : "rgba(255,255,255,0.06)",
                                    color: isDone || isActive ? "#021024" : "#8B96B8",
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                                    isActive && "shadow-glow-cyan"
                                )}
                            >
                                {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                            </motion.span>
                            <span
                                className={cn(
                                    "text-[10px] font-medium uppercase tracking-wider",
                                    isActive
                                        ? "text-text-primary"
                                        : "text-text-secondary/70"
                                )}
                            >
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 ? (
                            <div className="relative -mt-4 h-0.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <motion.div
                                    initial={false}
                                    animate={{ width: isDone ? "100%" : "0%" }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="absolute inset-y-0 left-0 bg-cyan-jet shadow-glow-cyan"
                                />
                            </div>
                        ) : (
                            <div aria-hidden className="-mt-4 h-0.5 flex-1" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
