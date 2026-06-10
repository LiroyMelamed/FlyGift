import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PKPASS = "application/vnd.apple.pkpass";

interface ApiEnvelope {
    success?: boolean;
    Success?: boolean;
    response?: string;
    Response?: string;
}

function apiBase(): string {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    return raw.replace(/\/$/, "");
}

function parseErrorMessage(body: string, fallback: string): string {
    try {
        const parsed = JSON.parse(body) as ApiEnvelope;
        return parsed.response || parsed.Response || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Same-origin proxy for Apple Wallet (.pkpass) downloads.
 * iOS Safari must navigate to a same-origin URL with the correct MIME
 * type; cross-origin API URLs often fail with "Safari cannot download
 * this file" even when the backend response is valid.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ bookingId: string }> },
) {
    const { bookingId } = await context.params;
    const id = Number(bookingId);
    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const token = (await cookies()).get("flygift_token")?.value;
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backendUrl = `${apiBase()}/Bookings/${id}/wallet-pass`;
    const upstream = await fetch(backendUrl, {
        headers: { Cookie: `flygift_token=${token}` },
        cache: "no-store",
    });

    if (!upstream.ok) {
        const text = await upstream.text();
        const message = parseErrorMessage(
            text,
            "Apple Wallet אינו זמין כעת. נסו שוב מאוחר יותר.",
        );
        return NextResponse.json(
            { success: false, response: message },
            { status: upstream.status },
        );
    }

    const contentType = upstream.headers.get("content-type") ?? PKPASS;
    if (!contentType.includes("pkpass")) {
        const text = await upstream.text();
        const message = parseErrorMessage(text, "Apple Wallet אינו זמין כעת.");
        return NextResponse.json(
            { success: false, response: message },
            { status: 502 },
        );
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
        status: 200,
        headers: {
            "Content-Type": PKPASS,
            "Content-Disposition": `inline; filename="flygift-boarding-${id}.pkpass"`,
            "Cache-Control": "no-store",
        },
    });
}
