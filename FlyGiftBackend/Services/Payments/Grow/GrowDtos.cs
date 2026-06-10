using System.Text.Json.Serialization;

namespace FlyGiftBackend.Services.Payments.Grow
{
    // Request/response shapes for Grow's createPaymentProcess endpoint.
    // Reference: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess
    //
    // Field names match the Grow docs verbatim. We model only what we
    // send or read; the gateway accepts unknown fields as no-ops.

    public sealed class GrowCreateProcessRequest
    {
        /// <summary>Account user id from the Grow dashboard. Mandatory.</summary>
        [JsonPropertyName("userId")] public string UserId { get; set; } = "";

        /// <summary>Page code from the Grow dashboard. Mandatory.</summary>
        [JsonPropertyName("pageCode")] public string PageCode { get; set; } = "";

        /// <summary>API key. Sent in body, NOT in headers.</summary>
        [JsonPropertyName("apiKey")] public string ApiKey { get; set; } = "";

        [JsonPropertyName("sum")] public decimal Sum { get; set; }

        /// <summary>Number of installments — 1 for full amount up front.</summary>
        [JsonPropertyName("paymentNum")] public int PaymentNum { get; set; } = 1;

        [JsonPropertyName("description")] public string? Description { get; set; }

        [JsonPropertyName("pageField[fullName]")] public string? CustomerName { get; set; }
        [JsonPropertyName("pageField[email]")] public string? CustomerEmail { get; set; }
        [JsonPropertyName("pageField[phone]")] public string? CustomerPhone { get; set; }

        /// <summary>Where the gateway redirects the browser on success.</summary>
        [JsonPropertyName("successUrl")] public string? SuccessUrl { get; set; }

        /// <summary>Where the gateway redirects on cancel.</summary>
        [JsonPropertyName("cancelUrl")] public string? CancelUrl { get; set; }

        /// <summary>Webhook target — Grow will POST settlement notifications here.</summary>
        [JsonPropertyName("notifyUrl")] public string? NotifyUrl { get; set; }

        /// <summary>Optional invoice-via-webhook target. Defaults to <see cref="NotifyUrl"/>.</summary>
        [JsonPropertyName("invoiceNotifyUrl")] public string? InvoiceNotifyUrl { get; set; }

        /// <summary>Stable correlation id — echoed back on the webhook so we know which wallet to credit.</summary>
        [JsonPropertyName("cField1")] public string? ExternalReference { get; set; }
    }

    public sealed class GrowCreateProcessResponse
    {
        [JsonPropertyName("status")] public int Status { get; set; }
        [JsonPropertyName("err")] public string? Err { get; set; }
        [JsonPropertyName("data")] public GrowCreateProcessData? Data { get; set; }
    }

    public sealed class GrowCreateProcessData
    {
        [JsonPropertyName("url")] public string? Url { get; set; }
        [JsonPropertyName("processId")] public string? ProcessId { get; set; }
        [JsonPropertyName("processToken")] public string? ProcessToken { get; set; }
    }

    /// <summary>
    /// Webhook callback payload Grow POSTs to <c>notifyUrl</c> when a
    /// payment settles. Field names follow the Grow docs; the exact set
    /// depends on the page configuration. We model the fields that drive
    /// the wallet-credit decision and ignore the rest.
    /// </summary>
    public sealed class GrowWebhookPayload
    {
        /// <summary>Payment status — typical values: <c>"1"</c> (success), <c>"0"</c> (failed).</summary>
        [JsonPropertyName("status")] public string? Status { get; set; }

        [JsonPropertyName("transactionId")] public string? TransactionId { get; set; }
        [JsonPropertyName("processId")] public string? ProcessId { get; set; }
        [JsonPropertyName("processToken")] public string? ProcessToken { get; set; }

        [JsonPropertyName("sum")] public decimal? Sum { get; set; }
        [JsonPropertyName("transactionTypeId")] public string? TransactionTypeId { get; set; }

        /// <summary>Echo of <see cref="GrowCreateProcessRequest.ExternalReference"/>.</summary>
        [JsonPropertyName("cField1")] public string? ExternalReference { get; set; }

        /// <summary>Hash signature Grow includes for integrity verification.</summary>
        [JsonPropertyName("asmachta")] public string? Asmachta { get; set; }

        [JsonPropertyName("paymentDate")] public string? PaymentDate { get; set; }
        [JsonPropertyName("paymentType")] public string? PaymentType { get; set; }
        [JsonPropertyName("payerName")] public string? PayerName { get; set; }
        [JsonPropertyName("payerPhone")] public string? PayerPhone { get; set; }
        [JsonPropertyName("payerEmail")] public string? PayerEmail { get; set; }
    }
}
