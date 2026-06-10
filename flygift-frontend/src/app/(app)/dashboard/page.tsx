"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { useAppDerived } from "@/lib/appStore";

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAppDerived();

    // Company users should never see the consumer dashboard. Login already
    // routes them to /company/dashboard, but anyone hitting /dashboard
    // directly (deep link, browser back button) is bounced here.
    useEffect(() => {
        if (user.role === "Company" || user.role === "Admin") {
            router.replace("/company/dashboard");
        }
    }, [user.role, router]);

    if (user.role === "Company" || user.role === "Admin") return null;
    return <DashboardView />;
}
