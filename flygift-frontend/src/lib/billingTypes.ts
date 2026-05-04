export type BulkOrderStatus = 0 | 1 | 2; // Pending | Invoiced | Failed

export const BulkOrderStatusLabel: Record<BulkOrderStatus, string> = {
    0: "Pending",
    1: "Invoiced",
    2: "Failed",
};

export interface InvoiceDto {
    id: number;
    batchId: string;
    invoiceNumber?: string | null;
    invoiceUrl?: string | null;
    recipientCount: number;
    totalCharged: number;
    currency: string;
    status: BulkOrderStatus;
    createdAt: string;
    invoicedAt?: string | null;
}

export interface BillingResponse {
    invoices: InvoiceDto[];
    summary: {
        count: number;
        totalInvoiced: number;
        pending: number;
        failed: number;
    };
}
