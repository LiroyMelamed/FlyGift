using ClosedXML.Excel;
using System.Text.RegularExpressions;

namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>
    /// Parses an uploaded XLSX file with columns:
    ///   Name | Email | Phone | Amount  (header row required, case-insensitive)
    /// </summary>
    public interface IBulkExcelParser
    {
        Task<BulkParseResult> ParseAsync(Stream stream, CancellationToken ct = default);
    }

    public class BulkExcelParser : IBulkExcelParser
    {
        private const int MaxRows = 5000;
        private static readonly Regex EmailRx =
            new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

        public Task<BulkParseResult> ParseAsync(Stream stream, CancellationToken ct = default)
        {
            var result = new BulkParseResult();

            using var workbook = new XLWorkbook(stream);
            var sheet = workbook.Worksheets.FirstOrDefault()
                        ?? throw new InvalidOperationException("Workbook contains no sheets.");

            var headerRow = sheet.FirstRowUsed()
                            ?? throw new InvalidOperationException("Sheet is empty.");

            var cols = MapColumns(headerRow);

            var dataRows = sheet.RowsUsed().Skip(1).ToList();
            if (dataRows.Count > MaxRows)
                throw new InvalidOperationException($"Too many rows ({dataRows.Count}). Max {MaxRows}.");

            foreach (var row in dataRows)
            {
                ct.ThrowIfCancellationRequested();

                var r = new BulkRecipientRow { RowNumber = row.RowNumber() };

                r.Name  = row.Cell(cols.Name).GetString().Trim();
                r.Email = row.Cell(cols.Email).GetString().Trim().ToLowerInvariant();
                r.Phone = cols.Phone > 0 ? row.Cell(cols.Phone).GetString().Trim() : null;

                var amountCell = row.Cell(cols.Amount);
                if (amountCell.TryGetValue<decimal>(out var amt))
                    r.Amount = amt;
                else if (decimal.TryParse(amountCell.GetString(), out var parsed))
                    r.Amount = parsed;

                Validate(r);
                result.Rows.Add(r);
            }

            return Task.FromResult(result);
        }

        private static void Validate(BulkRecipientRow r)
        {
            if (string.IsNullOrWhiteSpace(r.Name)) r.Errors.Add("Missing name");
            if (string.IsNullOrWhiteSpace(r.Email)) r.Errors.Add("Missing email");
            else if (!EmailRx.IsMatch(r.Email)) r.Errors.Add("Invalid email");
            if (r.Amount <= 0) r.Errors.Add("Amount must be > 0");
            if (r.Amount > 10000) r.Errors.Add("Amount exceeds 10,000 limit");
        }

        private record ColumnMap(int Name, int Email, int Phone, int Amount);

        private static ColumnMap MapColumns(IXLRow header)
        {
            int name = 0, email = 0, phone = 0, amount = 0;
            foreach (var cell in header.CellsUsed())
            {
                var key = cell.GetString().Trim().ToLowerInvariant();
                switch (key)
                {
                    case "name": case "full name": case "recipient": name = cell.Address.ColumnNumber; break;
                    case "email": case "e-mail": email = cell.Address.ColumnNumber; break;
                    case "phone": case "mobile": case "tel": phone = cell.Address.ColumnNumber; break;
                    case "amount": case "value": case "sum": amount = cell.Address.ColumnNumber; break;
                }
            }
            if (name == 0 || email == 0 || amount == 0)
                throw new InvalidOperationException(
                    "Header row must contain at least: Name, Email, Amount.");
            return new ColumnMap(name, email, phone, amount);
        }
    }
}
