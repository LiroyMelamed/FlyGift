import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";
import { GiftDetailView } from "@/components/giftcard/GiftDetailView";
import { GiftNotFound } from "@/components/giftcard/GiftNotFound";

interface PageProps {
    params: Promise<{ id: string }>;
}

interface PublicGiftCardEnvelope {
    success: boolean;
    response?: string;
    giftCard?: {
        id: number;
        shortCode: string;
        amount: number;
        currency: string;
        status: string; // "Active" | "Redeemed" | "Expired"
        expirationDate: string;
        createdAt: string;
        flightSnapshot?: string | null;
        senderName?: string | null;
    } | null;
}

interface FlightSnapshot {
    recipientName?: string;
    recipientEmail?: string;
    message?: string | null;
    variant?: GiftCardVariant;
    category?: "Flights" | "Hotels" | "Travel";
    originIata?: string;
    destinationIata?: string;
}

function parseSnapshot(json: string | null | undefined): FlightSnapshot {
    if (!json) return {};
    try {
        return JSON.parse(json) as FlightSnapshot;
    } catch {
        return {};
    }
}

async function fetchGiftByCode(raw: string): Promise<MockGiftCard | null> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!base) return null;

    const code = decodeURIComponent(raw).trim().toUpperCase();
    const res = await fetch(`${base}/GiftCard/by-code/${encodeURIComponent(code)}`, {
        cache: "no-store",
    });
    if (!res.ok) return null;

    const env = (await res.json()) as PublicGiftCardEnvelope;
    if (!env?.success || !env.giftCard) return null;

    const snap = parseSnapshot(env.giftCard.flightSnapshot);

    return {
        id: String(env.giftCard.id),
        code: env.giftCard.shortCode,
        amount: env.giftCard.amount,
        currency: env.giftCard.currency,
        status: env.giftCard.status as MockGiftCard["status"],
        variant: snap.variant ?? "cyan-jet",
        category: snap.category ?? "Flights",
        senderName: env.giftCard.senderName ?? "FlyGift",
        recipientName: snap.recipientName ?? "",
        expirationDate: env.giftCard.expirationDate,
        createdAt: env.giftCard.createdAt,
        message: snap.message ?? undefined,
        originIata: snap.originIata,
        destinationIata: snap.destinationIata,
    };
}

export default async function GiftDetailPage({ params }: PageProps) {
    const { id } = await params;
    const card = await fetchGiftByCode(id);

    if (!card) {
        return <GiftNotFound />;
    }

    return <GiftDetailView initialCard={card} />;
}
