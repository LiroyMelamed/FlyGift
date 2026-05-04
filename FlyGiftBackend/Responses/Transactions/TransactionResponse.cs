using System.Runtime.Serialization;
using FlyGiftBackend.Models;

namespace FlyGiftBackend.Responses.Transactions
{
    [DataContract]
    public class TransactionListResponse : GeneralResponse
    {
        [DataMember]
        public IEnumerable<Transaction> Items { get; set; }

        public TransactionListResponse(GeneralResponse parent, IEnumerable<Transaction> items) : base(parent)
        {
            Items = items;
        }
    }
}
