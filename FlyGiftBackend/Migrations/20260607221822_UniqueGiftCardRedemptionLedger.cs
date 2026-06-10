using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlyGiftBackend.Migrations
{
    /// <inheritdoc />
    public partial class UniqueGiftCardRedemptionLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_RelatedGiftCardId",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_GiftCardLoad_Unique",
                table: "Transactions",
                column: "RelatedGiftCardId",
                unique: true,
                filter: "\"RelatedGiftCardId\" IS NOT NULL AND \"Type\" = 0 AND \"IsReversal\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_GiftCardLoad_Unique",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_RelatedGiftCardId",
                table: "Transactions",
                column: "RelatedGiftCardId");
        }
    }
}
