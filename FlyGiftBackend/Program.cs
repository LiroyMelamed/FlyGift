using FlyGiftBackend.Data;
using FlyGiftBackend.Reposetories;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Billing;
using FlyGiftBackend.Services.Bulk;
using FlyGiftBackend.Services.Wallet;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Booking;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Messaging;
using FlyGiftBackend.Services.Otp;
using FlyGiftBackend.Services.Payments;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"];

if (string.IsNullOrEmpty(secretKey))
{
    throw new InvalidOperationException("JWT Secret Key is missing in appsettings.json!");
}

var key = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("FlyGiftDatabase"),
        npg => npg.EnableRetryOnFailure(maxRetryCount: 3)));

//builder.Services.AddScoped<GroomingQueueRepository>();
//builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<AuthRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<GiftCardRepository>();
builder.Services.AddScoped<TransactionRepository>();
builder.Services.AddScoped<FlightBookingRepository>();
builder.Services.AddScoped<HotelBookingRepository>();
// Idempotency cache + nightly expiration sweep
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IIdempotencyService, IdempotencyService>();

// Stage 16 — Immutable ledger / source-of-truth balance.
builder.Services.AddScoped<IBalanceService, BalanceService>();

// Stage 17 — Messaging (Email + SMS), templates, OTP, Invoices.
builder.Services.Configure<SendGridOptions>(builder.Configuration.GetSection("Messaging:SendGrid"));
builder.Services.Configure<TwilioOptions>(builder.Configuration.GetSection("Messaging:Twilio"));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection("Otp"));
builder.Services.AddSingleton<ITemplateEngine, SimpleTemplateEngine>();
builder.Services.AddSingleton<ITemplateCatalog, InMemoryTemplateCatalog>();
builder.Services.AddScoped<IEmailProvider, SendGridEmailProvider>();
builder.Services.AddScoped<ISmsProvider, TwilioSmsProvider>();
builder.Services.AddScoped<IMessagingProvider, MessagingProvider>();
builder.Services.AddScoped<IOtpService, MemoryOtpService>();
builder.Services.AddScoped<IInvoiceProvider, MockInvoiceProvider>();

// B2B bulk distribution
builder.Services.AddScoped<IBulkExcelParser, BulkExcelParser>();
builder.Services.AddScoped<IBulkGiftCardService, BulkGiftCardService>();
builder.Services.AddSingleton<IBulkDispatchQueue, BulkDispatchQueue>();
builder.Services.AddScoped<INotificationService, TemplatedNotificationService>();
builder.Services.AddHostedService<BulkDispatchWorker>();

// Flight search aggregator (mock provider for now — register additional
// IFlightSearchProvider implementations to merge real GDS data).
builder.Services.AddScoped<IFlightSearchProvider, MockFlightSearchProvider>();
builder.Services.AddScoped<IFlightSearchService, FlightSearchService>();

// Checkout / split-payment
builder.Services.AddScoped<IPaymentProvider, MockStripePaymentProvider>();
builder.Services.AddScoped<IBookingService, BookingService>();

// Hotel search & booking (Stage 19) — mock provider, swappable.
builder.Services.AddScoped<FlyGiftBackend.Services.Hotels.IHotelSearchService,
    FlyGiftBackend.Services.Hotels.HotelSearchService>();


// Wallet (Apple .pkpass + Google Wallet save link)
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddHostedService<GiftCardExpirationWorker>();


builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FlyGift API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by your token. Example: \"Bearer abc123xyz\""
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:3000",
                  "http://127.0.0.1:3000"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FlyGift API v1");
        c.RoutePrefix = string.Empty; // Load at root URL
    });
}

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
