namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>One row parsed from the uploaded Excel file.</summary>
    public class BulkRecipientRow
    {
        public int RowNumber { get; set; }
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "ILS";

        public List<string> Errors { get; } = new();
        public bool IsValid => Errors.Count == 0;
    }

    /// <summary>Result of parsing the entire workbook.</summary>
    public class BulkParseResult
    {
        public List<BulkRecipientRow> Rows { get; } = new();
        public int ValidCount => Rows.Count(r => r.IsValid);
        public int InvalidCount => Rows.Count(r => !r.IsValid);
        public decimal TotalAmount => Rows.Where(r => r.IsValid).Sum(r => r.Amount);
    }

    /// <summary>Per-row outcome after dispatch.</summary>
    public class BulkDispatchRow
    {
        public int RowNumber { get; set; }
        public string Email { get; set; } = "";
        public bool Success { get; set; }
        public int? GiftCardId { get; set; }
        public string? Error { get; set; }
    }

    public class BulkDispatchResult
    {
        public Guid BatchId { get; set; }
        public int TotalRows { get; set; }
        public int SucceededRows { get; set; }
        public int FailedRows { get; set; }
        public decimal TotalCharged { get; set; }
        public List<BulkDispatchRow> Rows { get; set; } = new();
    }

    /// <summary>Confirm payload sent by the frontend after preview.</summary>
    public class BulkConfirmRequest
    {
        public Guid PreviewId { get; set; }
        public string DefaultCurrency { get; set; } = "ILS";
        public DateTime? ExpirationDate { get; set; }
        public string? Message { get; set; }
    }
}
