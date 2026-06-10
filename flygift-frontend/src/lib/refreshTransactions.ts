import { ApiUtils } from "@/utils/ApiUtils";
import { setTransactions } from "@/lib/appStore";
import type { Transaction } from "@/lib/transactionTypes";

interface MineEnvelope {
    success?: boolean;
    items?: Transaction[];
}

/** Pull the latest ledger from the server into appStore. */
export async function refreshTransactions(): Promise<void> {
    try {
        const env = (await ApiUtils.get("Transaction/Mine").startRequest()) as MineEnvelope;
        if (env?.success && Array.isArray(env.items)) {
            setTransactions(env.items);
        }
    } catch {
        // Silent — caller decides whether to surface an error.
    }
}
