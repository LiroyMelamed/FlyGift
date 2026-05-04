"use client";

import {
    forwardRef,
    type InputHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

interface FieldBase {
    label: string;
    hint?: string;
    error?: string;
}

export type TextFieldProps = FieldBase &
    Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
        className?: string;
    };

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    function TextField({ label, hint, error, className, id, ...rest }, ref) {
        const inputId = id || `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
        return (
            <div className={cn("space-y-1.5", className)}>
                <label
                    htmlFor={inputId}
                    className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start"
                >
                    {label}
                </label>
                <input
                    id={inputId}
                    ref={ref}
                    {...rest}
                    className={cn(
                        "w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4 py-3",
                        "text-base text-[#0F172A] dark:text-text-primary placeholder:text-[#0F172A]/40 dark:placeholder:text-text-secondary/60",
                        "transition-all focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06]",
                        "focus:shadow-[0_0_0_4px_rgba(0,229,255,0.12)]",
                        error && "border-danger/60"
                    )}
                />
                {(hint || error) && (
                    <p
                        className={cn(
                            "text-xs",
                            error ? "text-danger" : "text-text-secondary"
                        )}
                    >
                        {error || hint}
                    </p>
                )}
            </div>
        );
    }
);

export type TextAreaFieldProps = FieldBase &
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
        className?: string;
    };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
    function TextAreaField({ label, hint, error, className, id, ...rest }, ref) {
        const inputId = id || `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
        return (
            <div className={cn("space-y-1.5", className)}>
                <label
                    htmlFor={inputId}
                    className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start"
                >
                    {label}
                </label>
                <textarea
                    id={inputId}
                    ref={ref}
                    {...rest}
                    className={cn(
                        "w-full resize-none rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4 py-3",
                        "text-base text-[#0F172A] dark:text-text-primary placeholder:text-[#0F172A]/40 dark:placeholder:text-text-secondary/60",
                        "transition-all focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06]",
                        "focus:shadow-[0_0_0_4px_rgba(0,229,255,0.12)]",
                        error && "border-danger/60"
                    )}
                />
                {(hint || error) && (
                    <p
                        className={cn(
                            "text-xs",
                            error ? "text-danger" : "text-text-secondary"
                        )}
                    >
                        {error || hint}
                    </p>
                )}
            </div>
        );
    }
);
