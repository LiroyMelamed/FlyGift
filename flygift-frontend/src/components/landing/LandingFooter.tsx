import { Plane } from "lucide-react";
import { t } from "@/i18n/he";

export function LandingFooter() {
    return (
        <footer
            className="border-t border-white/[0.06] bg-bg-base py-10"
            dir="rtl"
        >
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
                <div className="inline-flex items-center gap-2">
                    <span className="btn-gold inline-flex h-8 w-8 items-center justify-center rounded-lg">
                        <Plane className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="font-display text-sm font-semibold brand-glow">
                        FlyGift
                    </span>
                    <span className="text-xs text-text-secondary">
                        · {t.landing.footer.tagline}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="https://mela-media.co.il"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-text-secondary transition-colors hover:text-white"
                    >
                        נבנה ע״י MelaMedia
                    </a>
                    <span className="text-[11px] text-text-secondary opacity-40">·</span>
                    <p className="text-[11px] text-text-secondary">
                        © {new Date().getFullYear()} FlyGift · {t.landing.footer.rights}
                    </p>
                </div>
            </div>
        </footer>
    );
}
