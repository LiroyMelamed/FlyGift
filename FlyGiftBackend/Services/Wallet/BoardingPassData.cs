namespace FlyGiftBackend.Services.Wallet
{
    /// <summary>
    /// Strongly-typed boarding pass payload — what the airline gives us
    /// after ticketing. Persisted as JSON in FlightBooking.BoardingPassData.
    /// </summary>
    public class BoardingPassData
    {
        public string PassengerName { get; set; } = "";
        public string FlightNumber { get; set; } = "";
        public string Carrier { get; set; } = "";
        public string Origin { get; set; } = "";          // e.g. "TLV"
        public string OriginCity { get; set; } = "";
        public string Destination { get; set; } = "";     // e.g. "JFK"
        public string DestinationCity { get; set; } = "";
        public DateTime DepartureUtc { get; set; }
        public DateTime ArrivalUtc { get; set; }
        public string Gate { get; set; } = "";
        public string Seat { get; set; } = "";
        public string Terminal { get; set; } = "";
        public string Cabin { get; set; } = "Economy";
        public string BookingReference { get; set; } = "";
        /// <summary>Payload encoded into the QR / PDF417 barcode.</summary>
        public string BarcodePayload { get; set; } = "";
    }
}
