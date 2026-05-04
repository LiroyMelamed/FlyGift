using System.Runtime.Serialization;
using FlyGiftBackend.Models;

namespace FlyGiftBackend.Responses.GiftCards
{
    [DataContract]
    public class GiftCardResponse : GeneralResponse
    {
        [DataMember]
        public GiftCard? GiftCard { get; set; }

        public GiftCardResponse(GeneralResponse parent, GiftCard? giftCard) : base(parent)
        {
            GiftCard = giftCard;
        }
    }

    [DataContract]
    public class GiftCardListResponse : GeneralResponse
    {
        [DataMember]
        public IEnumerable<GiftCard> Items { get; set; }

        public GiftCardListResponse(GeneralResponse parent, IEnumerable<GiftCard> items) : base(parent)
        {
            Items = items;
        }
    }
}
