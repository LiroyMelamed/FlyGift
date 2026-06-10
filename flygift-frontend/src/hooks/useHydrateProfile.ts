"use client";

import { useEffect } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import { setUserDisplayName } from "@/lib/appStore";

interface UserProfile {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string;
}

interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    Data?: T;
}

function readProfile(payload: ApiEnvelope<UserProfile> | UserProfile | null | undefined): UserProfile | null {
    if (!payload || typeof payload !== "object") return null;
    if ("firstName" in payload || "fullName" in payload) return payload as UserProfile;
    const env = payload as ApiEnvelope<UserProfile>;
    return env.data ?? env.Data ?? null;
}

/** Load the signed-in user's profile name from the server (supports Hebrew). */
export function useHydrateProfile(): void {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = (await ApiUtils.get("Auth/Me").startRequest()) as ApiEnvelope<UserProfile>;
                if (cancelled) return;
                const profile = readProfile(res);
                if (!profile) return;
                const name =
                    profile.fullName?.trim() ||
                    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
                if (name) setUserDisplayName(name);
            } catch {
                // Guest or offline — keep JWT-derived name.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
}
