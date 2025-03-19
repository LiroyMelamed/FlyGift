namespace FlyGiftBackend.Models
{
    public class User
    {
        public int Id { get; set; }

        public string UserName { get; set; }

        public string? Email { get; set; }

        public string PasswordHash { get; set; }

        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        public UserRole Role { get; set; }

        public DateTime CreatedAt {  get; set; } 
    }

    public enum UserRole
    {
        Client,
        Company,
        Admin
    }
}
