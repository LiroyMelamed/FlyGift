using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlyGiftBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddKiwiBookingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KiwiBookingId",
                table: "FlightBookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KiwiPnr",
                table: "FlightBookings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KiwiBookingId",
                table: "FlightBookings");

            migrationBuilder.DropColumn(
                name: "KiwiPnr",
                table: "FlightBookings");
        }
    }
}
