namespace FlyGiftBackend.Models
{
    /// <summary>
    /// Sanitized profile projection for <c>GET /api/Auth/Me</c> and
    /// <c>PUT /api/Auth/Profile</c>. Excludes password, balance, and role.
    /// </summary>
    public sealed class UserProfileDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = "";
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }

        public string FullName =>
            string.IsNullOrWhiteSpace(LastName)
                ? (FirstName ?? "").Trim()
                : $"{FirstName} {LastName}".Trim();

        public static UserProfileDto From(User u) => new()
        {
            Id = u.Id,
            UserName = u.UserName,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
        };
    }
}
