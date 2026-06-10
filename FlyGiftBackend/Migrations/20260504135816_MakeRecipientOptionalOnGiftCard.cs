using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlyGiftBackend.Migrations
{
    /// <inheritdoc />
    public partial class MakeRecipientOptionalOnGiftCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "RecipientId",
                table: "GiftCards",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "RecipientEmail",
                table: "GiftCards",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientName",
                table: "GiftCards",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecipientEmail",
                table: "GiftCards");

            migrationBuilder.DropColumn(
                name: "RecipientName",
                table: "GiftCards");

            migrationBuilder.AlterColumn<int>(
                name: "RecipientId",
                table: "GiftCards",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
