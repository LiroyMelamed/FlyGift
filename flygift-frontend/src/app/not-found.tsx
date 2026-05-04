import { GiftNotFound } from "@/components/giftcard/GiftNotFound";
import { t } from "@/i18n/he";

/**
 * Global 404 — reuses the premium GiftNotFound shell with generic
 * page-not-found copy so the look-and-feel stays consistent.
 */
export default function NotFound() {
    return (
        <GiftNotFound
            title={t.common.pageNotFoundTitle}
            description={t.common.pageNotFoundDescription}
        />
    );
}
