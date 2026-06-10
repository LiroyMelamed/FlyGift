using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlyGiftBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddFlightSnapshotAndShortCodeToGiftCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FlightSnapshot",
                table: "GiftCards",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortCode",
                table: "GiftCards",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            // Backfill any pre-existing rows with unique random codes so
            // the unique index below doesn't collide on the empty default.
            // Format mirrors the runtime-generated FG-XXXX-XXXX shape.
            migrationBuilder.Sql(@"
                UPDATE ""GiftCards""
                SET ""ShortCode"" = 'FG-' ||
                    upper(substr(md5(random()::text || ""Id""::text || clock_timestamp()::text), 1, 4)) || '-' ||
                    upper(substr(md5(random()::text || ""Id""::text || clock_timestamp()::text || 'x'), 1, 4))
                WHERE ""ShortCode"" = '';
            ");

            migrationBuilder.CreateIndex(
                name: "IX_GiftCards_ShortCode",
                table: "GiftCards",
                column: "ShortCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GiftCards_ShortCode",
                table: "GiftCards");

            migrationBuilder.DropColumn(
                name: "FlightSnapshot",
                table: "GiftCards");

            migrationBuilder.DropColumn(
                name: "ShortCode",
                table: "GiftCards");
        }
    }
}
