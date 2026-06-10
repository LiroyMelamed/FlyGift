using ClosedXML.Excel;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>
    /// Parses an uploaded recipient list with columns:
    ///   Name | Email | Phone | Amount  (header row required, case-insensitive).
    /// Accepts both XLSX (ClosedXML) and CSV (UTF-8/UTF-8-BOM, comma-separated,
    /// optionally quoted). The format is auto-detected by sniffing the first
    /// bytes for the ZIP magic that XLSX files carry.
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

        public async Task<BulkParseResult> ParseAsync(Stream stream, CancellationToken ct = default)
        {
            // Buffer the stream so we can peek a few bytes and still hand the
            // full payload to whichever parser wins.
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, ct);
            ms.Position = 0;

            var sig = new byte[4];
            var read = await ms.ReadAsync(sig.AsMemory(0, 4), ct);
            ms.Position = 0;

            // XLSX (and any zip) starts with "PK\x03\x04". Anything else is
            // assumed to be CSV-encoded text.
            var isXlsx = read >= 4 && sig[0] == 0x50 && sig[1] == 0x4B
                         && sig[2] == 0x03 && sig[3] == 0x04;

            return isXlsx ? ParseXlsx(ms, ct) : ParseCsv(ms, ct);
        }

        private static BulkParseResult ParseXlsx(Stream stream, CancellationToken ct)
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

            return result;
        }

        private static BulkParseResult ParseCsv(Stream stream, CancellationToken ct)
        {
            var result = new BulkParseResult();
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

            string? line;
            int rowNumber = 0;
            int nameIdx = -1, emailIdx = -1, phoneIdx = -1, amountIdx = -1;

            // Header
            do { line = reader.ReadLine(); rowNumber++; }
            while (line != null && string.IsNullOrWhiteSpace(line));

            if (line == null)
                throw new InvalidOperationException("CSV is empty.");

            var headers = SplitCsvLine(line);
            for (int i = 0; i < headers.Count; i++)
            {
                var key = headers[i].Trim().ToLowerInvariant();
                switch (key)
                {
                    case "name": case "full name": case "recipient": nameIdx = i; break;
                    case "email": case "e-mail": emailIdx = i; break;
                    case "phone": case "mobile": case "tel": phoneIdx = i; break;
                    case "amount": case "value": case "sum": amountIdx = i; break;
                }
            }
            if (nameIdx < 0 || emailIdx < 0 || amountIdx < 0)
                throw new InvalidOperationException(
                    "Header row must contain at least: Name, Email, Amount.");

            int dataRows = 0;
            while ((line = reader.ReadLine()) != null)
            {
                ct.ThrowIfCancellationRequested();
                rowNumber++;
                if (string.IsNullOrWhiteSpace(line)) continue;

                if (++dataRows > MaxRows)
                    throw new InvalidOperationException($"Too many rows. Max {MaxRows}.");

                var fields = SplitCsvLine(line);
                var r = new BulkRecipientRow { RowNumber = rowNumber };
                r.Name  = Get(fields, nameIdx).Trim();
                r.Email = Get(fields, emailIdx).Trim().ToLowerInvariant();
                r.Phone = phoneIdx >= 0 ? Get(fields, phoneIdx).Trim() : null;
                if (string.IsNullOrWhiteSpace(r.Phone)) r.Phone = null;

                var rawAmount = Get(fields, amountIdx).Trim();
                if (decimal.TryParse(rawAmount, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
                    r.Amount = parsed;

                Validate(r);
                result.Rows.Add(r);
            }

            return result;
        }

        private static string Get(IList<string> row, int idx) =>
            idx >= 0 && idx < row.Count ? row[idx] : "";

        /// <summary>
        /// Minimal RFC 4180 single-line CSV splitter — handles double-quoted
        /// fields with embedded commas and escaped quotes (`""`).
        /// </summary>
        private static List<string> SplitCsvLine(string line)
        {
            var fields = new List<string>();
            var sb = new StringBuilder();
            bool inQuotes = false;
            for (int i = 0; i < line.Length; i++)
            {
                var c = line[i];
                if (inQuotes)
                {
                    if (c == '"')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '"') { sb.Append('"'); i++; }
                        else inQuotes = false;
                    }
                    else sb.Append(c);
                }
                else
                {
                    if (c == ',') { fields.Add(sb.ToString()); sb.Clear(); }
                    else if (c == '"' && sb.Length == 0) inQuotes = true;
                    else sb.Append(c);
                }
            }
            fields.Add(sb.ToString());
            return fields;
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
