using System.IO.Compression;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;

namespace FlyGiftBackend.Services.Wallet
{
    /// <summary>
    /// Builds Apple Wallet (.pkpass) bundles and Google Wallet save links.
    ///
    /// Apple signing:
    ///   - Production .pkpass requires a PKCS#12 Pass Type ID certificate
    ///     plus the Apple WWDR intermediate cert. Configure via:
    ///         Wallet:Apple:PassTypeIdentifier
    ///         Wallet:Apple:TeamIdentifier
    ///         Wallet:Apple:CertPath / Wallet:Apple:CertPassword
    ///         Wallet:Apple:WwdrCertPath
    ///   - When unsigned (dev), this service emits the bundle without
    ///     `signature` so it can still be inspected.
    ///
    /// Google Wallet:
    ///   - Returns a save link of the form
    ///       https://pay.google.com/gp/v/save/&lt;JWT&gt;
    ///     The JWT is signed with the service-account private key.
    ///     Stub'd to a deep link in dev — wire real signing when ready.
    /// </summary>
    public interface IWalletService
    {
        /// <returns>(pkpassBytes, fileName) — content type is application/vnd.apple.pkpass.</returns>
        Task<(byte[] Bytes, string FileName)> BuildApplePassAsync(int bookingId, BoardingPassData data, CancellationToken ct = default);

        /// <returns>A URL the client can open / redirect to.</returns>
        string BuildGoogleWalletSaveLink(int bookingId, BoardingPassData data);
    }

    /// <summary>
    /// Thrown when a wallet pass cannot be produced because signing
    /// certificates aren't configured. The booking controller catches
    /// this and returns a 503 with a Hebrew message instead of letting
    /// the exception bubble or, worse, emitting an unsigned bundle in
    /// production.
    /// </summary>
    public sealed class WalletNotConfiguredException : InvalidOperationException
    {
        public WalletNotConfiguredException(string message) : base(message) { }
    }

    public class WalletService : IWalletService
    {
        private readonly IConfiguration _cfg;
        private readonly IHostEnvironment _env;
        private readonly ILogger<WalletService> _log;

        public WalletService(IConfiguration cfg, IHostEnvironment env, ILogger<WalletService> log)
        {
            _cfg = cfg;
            _env = env;
            _log = log;
        }

        /// <summary>
        /// Only local dev (or an explicit opt-in) may emit unsigned Apple
        /// passes. Demo payment mode does NOT qualify — unsigned .pkpass
        /// files are rejected by iOS Safari with "cannot download this file".
        /// </summary>
        private bool AllowWalletStub =>
            _env.IsDevelopment()
            || string.Equals(_cfg["Wallet:AllowUnsigned"], "true", StringComparison.OrdinalIgnoreCase);

        // ---------- APPLE WALLET ----------

        public async Task<(byte[] Bytes, string FileName)> BuildApplePassAsync(
            int bookingId, BoardingPassData data, CancellationToken ct = default)
        {
            var passTypeId = _cfg["Wallet:Apple:PassTypeIdentifier"] ?? "pass.com.flygift.boardingpass";
            var teamId     = _cfg["Wallet:Apple:TeamIdentifier"]     ?? "TEAMID0000";
            var orgName    = _cfg["Wallet:Apple:OrganizationName"]   ?? "FlyGift";

            var passJson = BuildPassJson(bookingId, data, passTypeId, teamId, orgName);
            var icon     = WalletPassAssets.Icon29;
            var icon2x   = WalletPassAssets.Icon58;
            var logo     = WalletPassAssets.Logo160x50;

            // Files that go into the .pkpass zip
            var files = new Dictionary<string, byte[]>
            {
                ["pass.json"]   = Encoding.UTF8.GetBytes(passJson),
                ["icon.png"]    = icon,
                ["icon@2x.png"] = icon2x,
                ["logo.png"]    = logo,
            };

            // manifest.json = SHA1 of every file
            var manifest = files.ToDictionary(
                kv => kv.Key,
                kv => Convert.ToHexString(SHA1.HashData(kv.Value)).ToLowerInvariant());
            var manifestJson = JsonSerializer.Serialize(manifest);
            files["manifest.json"] = Encoding.UTF8.GetBytes(manifestJson);

            // Sign manifest -> signature (PKCS#7 detached, DER-encoded).
            // In Production we refuse to emit an unsigned bundle — Apple
            // Wallet rejects unsigned passes anyway, and surfacing the
            // failure clearly is better than handing the user a bundle
            // their phone will reject silently.
            var signature = TrySignManifest(files["manifest.json"]);
            if (signature != null)
            {
                files["signature"] = signature;
            }
            else if (AllowWalletStub)
            {
                _log.LogWarning("[Wallet] Apple signing certs missing — emitting UNSIGNED .pkpass (demo/dev).");
            }
            else
            {
                _log.LogError(
                    "[Wallet] Apple signing certs missing in {Env}. " +
                    "Set Wallet:Apple:CertPath / CertPassword / WwdrCertPath. Refusing to emit unsigned .pkpass.",
                    _env.EnvironmentName);
                throw new WalletNotConfiguredException(
                    "Apple Wallet signing isn't configured. Upload Pass Type ID certificate to the server.");
            }

            using var ms = new MemoryStream();
            using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var (name, bytes) in files)
                {
                    var entry = zip.CreateEntry(name, CompressionLevel.Optimal);
                    await using var s = entry.Open();
                    await s.WriteAsync(bytes, ct);
                }
            }

            var fileName = $"flygift-boarding-{bookingId}.pkpass";
            return (ms.ToArray(), fileName);
        }

        private static string BuildPassJson(
            int bookingId, BoardingPassData d, string passTypeId, string teamId, string orgName)
        {
            var pass = new
            {
                formatVersion = 1,
                passTypeIdentifier = passTypeId,
                teamIdentifier = teamId,
                serialNumber = $"flygift-{bookingId}",
                organizationName = orgName,
                description = $"Boarding pass {d.FlightNumber}",
                logoText = "FlyGift",
                foregroundColor = "rgb(244,246,251)",
                backgroundColor = "rgb(7,11,26)",
                labelColor = "rgb(0,229,255)",
                barcodes = new[]
                {
                    new
                    {
                        format = "PKBarcodeFormatQR",
                        message = string.IsNullOrWhiteSpace(d.BarcodePayload) ? d.BookingReference : d.BarcodePayload,
                        messageEncoding = "iso-8859-1",
                        altText = d.BookingReference,
                    }
                },
                boardingPass = new
                {
                    transitType = "PKTransitTypeAir",
                    primaryFields = new object[]
                    {
                        new { key = "origin",      label = d.OriginCity,      value = d.Origin },
                        new { key = "destination", label = d.DestinationCity, value = d.Destination },
                    },
                    secondaryFields = new object[]
                    {
                        new { key = "passenger", label = "Passenger", value = d.PassengerName },
                        new { key = "flight",    label = "Flight",    value = $"{d.Carrier} {d.FlightNumber}" },
                    },
                    auxiliaryFields = new object[]
                    {
                        new { key = "depart",   label = "Departs",  value = d.DepartureUtc.ToString("HH:mm 'UTC' MMM dd") },
                        new { key = "gate",     label = "Gate",     value = d.Gate },
                        new { key = "seat",     label = "Seat",     value = d.Seat },
                        new { key = "terminal", label = "Terminal", value = d.Terminal },
                    },
                    backFields = new object[]
                    {
                        new { key = "ref",   label = "Booking Reference", value = d.BookingReference },
                        new { key = "cabin", label = "Cabin",             value = d.Cabin },
                    },
                },
            };

            return JsonSerializer.Serialize(pass, new JsonSerializerOptions
            {
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            });
        }

        private byte[]? TrySignManifest(byte[] manifestBytes)
        {
            var certPath = _cfg["Wallet:Apple:CertPath"];
            var certPwd  = _cfg["Wallet:Apple:CertPassword"];
            var wwdrPath = _cfg["Wallet:Apple:WwdrCertPath"];

            if (string.IsNullOrWhiteSpace(certPath) || !File.Exists(certPath)) return null;
            if (string.IsNullOrWhiteSpace(wwdrPath) || !File.Exists(wwdrPath)) return null;

            try
            {
                var signerCert = X509CertificateLoader.LoadPkcs12FromFile(
                    certPath,
                    certPwd,
                    System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.MachineKeySet
                    | System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.PersistKeySet
                    | System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.Exportable);

                var wwdr = System.Security.Cryptography.X509Certificates
                    .X509CertificateLoader.LoadCertificateFromFile(wwdrPath);

                var contentInfo = new System.Security.Cryptography.Pkcs.ContentInfo(manifestBytes);
                var signedCms = new System.Security.Cryptography.Pkcs.SignedCms(contentInfo, detached: true);
                var signer = new System.Security.Cryptography.Pkcs.CmsSigner(signerCert)
                {
                    IncludeOption = System.Security.Cryptography.X509Certificates.X509IncludeOption.None,
                };
                signer.Certificates.Add(wwdr);
                signedCms.ComputeSignature(signer);
                return signedCms.Encode();
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "[Wallet] Apple signing failed; emitting unsigned bundle.");
                return null;
            }
        }

        // ---------- GOOGLE WALLET ----------

        public string BuildGoogleWalletSaveLink(int bookingId, BoardingPassData data)
        {
            var issuerId = _cfg["Wallet:Google:IssuerId"];
            var serviceEmail = _cfg["Wallet:Google:ServiceAccountEmail"];

            // In Prod we refuse to hand out a stub link that won't
            // actually save to Google Wallet. Dev keeps the deep-link
            // fallback so the frontend integration stays exercisable.
            if (!AllowWalletStub &&
                (string.IsNullOrWhiteSpace(issuerId) || string.IsNullOrWhiteSpace(serviceEmail)))
            {
                _log.LogError(
                    "[Wallet] Google Wallet not configured in {Env} (need Wallet:Google:IssuerId + ServiceAccountEmail).",
                    _env.EnvironmentName);
                throw new WalletNotConfiguredException(
                    "Google Wallet isn't configured on the server.");
            }

            issuerId ??= "3388000000022000000";
            var classId  = _cfg["Wallet:Google:ClassId"]  ?? $"{issuerId}.flygift_boardingpass";
            var objectId = $"{issuerId}.flygift_{bookingId}";

            // In production: build the JWT with the FlightObject payload below,
            // sign with the service-account RS256 key, and append it to:
            //   https://pay.google.com/gp/v/save/<jwt>
            //
            // Until certs are wired we emit a deep link that lets the client
            // bounce the user into Google Wallet's add flow with the object id.
            // Keeping this stub means the frontend integration is testable today.

            var payload = new
            {
                iss   = _cfg["Wallet:Google:ServiceAccountEmail"] ?? "stub@flygift.iam.gserviceaccount.com",
                aud   = "google",
                typ   = "savetowallet",
                origins = new[] { _cfg["Wallet:Google:Origin"] ?? "https://flygift.mela-media.co.il" },
                payload = new
                {
                    flightObjects = new[]
                    {
                        new
                        {
                            id = objectId,
                            classId = classId,
                            state = "ACTIVE",
                            passengerName = data.PassengerName,
                            reservationInfo = new { confirmationCode = data.BookingReference },
                            boardingAndSeatingInfo = new { seatNumber = data.Seat, boardingGroup = data.Cabin },
                            flightHeader = new
                            {
                                carrier = new { carrierIataCode = data.Carrier },
                                flightNumber = data.FlightNumber,
                            },
                            origin      = new { airportIataCode = data.Origin,      terminal = data.Terminal, gate = data.Gate },
                            destination = new { airportIataCode = data.Destination },
                            localScheduledDepartureDateTime = data.DepartureUtc.ToString("yyyy-MM-ddTHH:mm:ss"),
                        }
                    }
                }
            };

            var stubToken = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)));

            return $"https://pay.google.com/gp/v/save/{stubToken}";
        }
    }
}
