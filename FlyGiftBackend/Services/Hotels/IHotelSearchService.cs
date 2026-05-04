namespace FlyGiftBackend.Services.Hotels
{
    public interface IHotelSearchService
    {
        Task<HotelSearchResponse> SearchAsync(int userId, HotelSearchRequest request, CancellationToken ct);
        Task<HotelOffer?> GetOfferAsync(string offerId, CancellationToken ct);
        Task<BookHotelResult> BookAsync(int userId, BookHotelRequest request, CancellationToken ct);
    }
}
