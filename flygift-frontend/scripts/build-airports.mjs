/**
 * One-off build script — converts the OurAirports CSV (CC0) into a
 * slim JSON used by the /api/airports/search route.
 *
 * Run with:  node scripts/build-airports.mjs
 *
 * The output (src/data/airports.json) is committed so production
 * doesn't need to download anything at runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src/data/airports.json");

const SOURCES = {
    airports:
        "https://davidmegginson.github.io/ourairports-data/airports.csv",
    countries:
        "https://davidmegginson.github.io/ourairports-data/countries.csv",
};

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`${url}: HTTP ${res.statusCode}`));
                    return;
                }
                let data = "";
                res.setEncoding("utf8");
                res.on("data", (c) => (data += c));
                res.on("end", () => resolve(data));
            })
            .on("error", reject);
    });
}

/** Minimal CSV parser handling quoted fields with embedded commas. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else inQuotes = false;
            } else cell += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ",") {
                row.push(cell);
                cell = "";
            } else if (ch === "\n") {
                row.push(cell);
                rows.push(row);
                row = [];
                cell = "";
            } else if (ch === "\r") {
                /* skip */
            } else cell += ch;
        }
    }
    if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function rowsToObjects(rows) {
    const [header, ...body] = rows;
    return body
        .filter((r) => r.length === header.length)
        .map((r) => {
            const o = {};
            header.forEach((h, i) => (o[h] = r[i]));
            return o;
        });
}

const HE_OVERRIDES_PATH = path.join(ROOT, "scripts/airport-he-overrides.json");
let HE_OVERRIDES = {};
try {
    HE_OVERRIDES = JSON.parse(fs.readFileSync(HE_OVERRIDES_PATH, "utf8"));
} catch {
    /* optional */
}

async function main() {
    console.log("Downloading OurAirports CSV…");
    const [airportsCsv, countriesCsv] = await Promise.all([
        fetchText(SOURCES.airports),
        fetchText(SOURCES.countries),
    ]);

    const airports = rowsToObjects(parseCsv(airportsCsv));
    const countries = rowsToObjects(parseCsv(countriesCsv));
    const countryByCode = new Map(countries.map((c) => [c.code, c.name]));

    // Keep only commercial airports with IATA codes — gives ~6k entries.
    const filtered = airports.filter(
        (a) =>
            a.iata_code &&
            a.iata_code.length === 3 &&
            a.scheduled_service === "yes" &&
            (a.type === "large_airport" ||
                a.type === "medium_airport" ||
                a.type === "small_airport")
    );

    const slim = filtered
        .map((a) => {
            const iata = a.iata_code.toUpperCase();
            const country = countryByCode.get(a.iso_country) ?? a.iso_country;
            const he = HE_OVERRIDES[iata] ?? {};
            return {
                iata,
                name: a.name,
                city: a.municipality || a.name,
                cityHe: he.cityHe ?? null,
                country,
                countryHe: he.countryHe ?? null,
                type: a.type, // for ranking (large > medium > small)
                lat: Number(a.latitude_deg) || 0,
                lon: Number(a.longitude_deg) || 0,
            };
        })
        // Order: large airports first (so default suggestions are major hubs)
        .sort((a, b) => {
            const rank = { large_airport: 0, medium_airport: 1, small_airport: 2 };
            return rank[a.type] - rank[b.type] || a.iata.localeCompare(b.iata);
        });

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(slim));
    console.log(
        `Wrote ${slim.length.toLocaleString()} airports → ${path.relative(
            ROOT,
            OUT_FILE
        )} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB)`
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
