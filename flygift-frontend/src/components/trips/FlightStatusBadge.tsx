import type { FlightStatus } from "@/lib/tripTypes";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";

const STYLES: Record<FlightStatus, string> = {
    "On Time": "bg-success/15 text-success border-success/30",
    "Delayed": "bg-warning/15 text-warning border-warning/30",
    "Boarding": "bg-cyan-jet/15 text-cyan-jet border-cyan-jet/30",
    "Gate Change": "bg-violet-aurora/15 text-violet-aurora border-violet-aurora/30",
    "Arrived": "bg-white/[0.06] text-text-secondary border-white/10",
    "Cancelled": "bg-danger/15 text-danger border-danger/30",
    "Unknown": "bg-white/[0.06] text-text-secondary border-white/10",
};

export function FlightStatusBadge({ status }: { status: FlightStatus }) {
    const cls = STYLES[status] ?? STYLES.Unknown;
    const label = t.trips.flightStatus[status] ?? status;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                cls
            )}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {label}
        </span>
    );
}
