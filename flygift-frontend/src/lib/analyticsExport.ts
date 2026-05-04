import type { AnalyticsResponse } from "@/lib/analyticsTypes";

/**
 * CSV export — universally importable into Excel / Google Sheets.
 * Generates three sheets concatenated as one blob (Summary, Trend, Destinations).
 */
export function exportAnalyticsCsv(data: AnalyticsResponse) {
    const s = data.summary;
    const lines: string[] = [];
    lines.push("# FlyGift — Company Analytics");
    lines.push(`# Generated: ${data.generatedAt}`);
    lines.push(`# Period: last ${data.periodDays} days`);
    lines.push("");
    lines.push("Section,Metric,Value");
    lines.push(`Summary,Total Cards,${s.totalCards}`);
    lines.push(`Summary,Active Cards,${s.activeCards}`);
    lines.push(`Summary,Redeemed Cards,${s.redeemedCards}`);
    lines.push(`Summary,Expired Cards,${s.expiredCards}`);
    lines.push(`Summary,Total Distributed (${s.currency}),${s.totalDistributed}`);
    lines.push(`Summary,Redeemed Amount (${s.currency}),${s.redeemedAmount}`);
    lines.push(`Summary,Unused Amount (${s.currency}),${s.unusedAmount}`);
    lines.push(`Summary,Redemption Rate (%),${s.redemptionRate}`);
    lines.push(`Summary,Avg Gift Amount (${s.currency}),${s.avgGiftAmount}`);
    lines.push(`Summary,Avg Time to Redemption (days),${s.avgTimeToRedemptionDays}`);
    lines.push("");
    lines.push("Period Start,Distributed,Used");
    data.spendingTrend.forEach((p) =>
        lines.push(`${p.periodStart.slice(0, 10)},${p.distributed},${p.used}`)
    );
    lines.push("");
    lines.push("IATA,City,Country,Trips");
    data.topDestinations.forEach((d) =>
        lines.push(`${d.iata},${d.city},${d.country},${d.trips}`)
    );

    download(lines.join("\n"), `flygift-analytics-${stamp()}.csv`, "text/csv;charset=utf-8");
}

/**
 * PDF export — opens a print-styled HTML window and triggers the
 * browser's print dialog. Users pick "Save as PDF". This avoids a
 * heavy PDF lib while producing crisp vector output.
 */
export function exportAnalyticsPdf(data: AnalyticsResponse) {
    const s = data.summary;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>FlyGift Analytics</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui; color: #0B1226; padding: 32px; }
  h1 { font-size: 24px; margin: 0 0 4px; background: linear-gradient(90deg, #00E5FF, #7C5CFF); -webkit-background-clip: text; color: transparent; }
  .meta { color: #6B7280; font-size: 12px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
  th { background: #F8FAFC; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 8px; color: #1F2937; }
</style></head><body>
<h1>FlyGift — Company Analytics</h1>
<div class="meta">Generated ${new Date(data.generatedAt).toLocaleString()} · last ${data.periodDays} days</div>

<h2>Summary</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Total cards</td><td class="num">${s.totalCards}</td></tr>
  <tr><td>Active</td><td class="num">${s.activeCards}</td></tr>
  <tr><td>Redeemed</td><td class="num">${s.redeemedCards}</td></tr>
  <tr><td>Expired</td><td class="num">${s.expiredCards}</td></tr>
  <tr><td>Total distributed</td><td class="num">${money(s.totalDistributed, s.currency)}</td></tr>
  <tr><td>Redeemed amount</td><td class="num">${money(s.redeemedAmount, s.currency)}</td></tr>
  <tr><td>Unused amount</td><td class="num">${money(s.unusedAmount, s.currency)}</td></tr>
  <tr><td>Redemption rate</td><td class="num">${s.redemptionRate}%</td></tr>
  <tr><td>Avg gift amount</td><td class="num">${money(s.avgGiftAmount, s.currency)}</td></tr>
  <tr><td>Avg time to redemption</td><td class="num">${s.avgTimeToRedemptionDays} days</td></tr>
</table>

<h2>Spending Trend</h2>
<table>
  <tr><th>Week starting</th><th>Distributed</th><th>Used</th></tr>
  ${data.spendingTrend
            .map(
                (p) =>
                    `<tr><td>${p.periodStart.slice(0, 10)}</td><td class="num">${money(
                        p.distributed,
                        s.currency
                    )}</td><td class="num">${money(p.used, s.currency)}</td></tr>`
            )
            .join("")}
</table>

<h2>Top Destinations</h2>
<table>
  <tr><th>IATA</th><th>City</th><th>Country</th><th>Trips</th></tr>
  ${data.topDestinations
            .map(
                (d) =>
                    `<tr><td>${d.iata}</td><td>${d.city}</td><td>${d.country}</td><td class="num">${d.trips}</td></tr>`
            )
            .join("")}
</table>

<script>window.onload = () => setTimeout(() => window.print(), 250);</script>
</body></html>`);
    win.document.close();
}

function money(n: number, cur: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
}

function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function stamp() {
    return new Date().toISOString().slice(0, 10);
}
