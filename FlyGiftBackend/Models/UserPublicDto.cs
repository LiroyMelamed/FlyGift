namespace FlyGiftBackend.Models
{
    /// <summary>
    /// Sanitized projection of <see cref="User"/> for endpoints that
    /// expose sender/recipient party info (e.g. GiftCard/Mine,
    /// Bookings/Mine). Hides Email, PhoneNumber, AccountBalance, Role,
    /// CreatedAt and the bcrypt PasswordHash — only the fields needed
    /// to render a name in the UI.
    /// </summary>
    public record UserPublicDto(int Id, string DisplayName)
    {
        public static UserPublicDto? From(User? u)
        {
            if (u == null) return null;
            var composed = ($"{u.FirstName} {u.LastName}").Trim();
            var name = string.IsNullOrWhiteSpace(composed)
                ? (string.IsNullOrWhiteSpace(u.UserName) ? "FlyGift" : u.UserName)
                : composed;
            return new UserPublicDto(u.Id, name);
        }
    }
}
