import { getMockGiftCardById } from "@/lib/mockData";
import { GiftDetailView } from "@/components/giftcard/GiftDetailView";
import { GiftNotFound } from "@/components/giftcard/GiftNotFound";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function GiftDetailPage({ params }: PageProps) {
    const { id } = await params;
    const card = getMockGiftCardById(id);

    if (!card) {
        return <GiftNotFound />;
    }

    return <GiftDetailView initialCard={card} />;
}
