using FlyGiftBackend.Data;
using FlyGiftBackend.Reposetories;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Billing;
using FlyGiftBackend.Services.Bulk;
using FlyGiftBackend.Services.Wallet;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Flights.Kiwi;
using FlyGiftBackend.Services.Booking;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Messaging;
using FlyGiftBackend.Services.Notifications;
using FlyGiftBackend.Services.Otp;
using FlyGiftBackend.Services.Payments;
using FlyGiftBackend.Services.Payments.Grow;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Fail-fast: require all production secrets to be set via env vars
// before we bind a port. In Development this is downgraded to a warning
// so local runs without Kiwi keys still work via the mock providers
// (the dev DB + JWT secret live in `dotnet user-secrets`).
{
    using var bootLoggerFactory = LoggerFactory.Create(b => b.AddConsole());
    var bootLog = bootLoggerFactory.CreateLogger("Startup");
    FlyGiftBackend.Auth.StartupValidator.EnsureProductionSecrets(
        builder.Configuration, builder.Environment, bootLog);
}

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"]
    ?? throw new InvalidOperationException(
        "JwtSettings:Secret is required (env: JwtSettings__Secret).");
var key = Encoding.UTF8.GetBytes(secretKey);

var connStr = builder.Configuration.GetConnectionString("FlyGiftDatabase");
if (string.IsNullOrWhiteSpace(connStr))
    throw new InvalidOperationException(
        "ConnectionStrings:FlyGiftDatabase is required (env: ConnectionStrings__FlyGiftDatabase).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connStr, npg => npg
        .EnableRetryOnFailure(maxRetryCount: 2, maxRetryDelay: TimeSpan.FromSeconds(2), errorCodesToAdd: null)
        .CommandTimeout(15)));
builder.Services.AddHostedService<DbWarmupService>();

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

// Stage 25 — Activity feed (bell icon).
builder.Services.AddScoped<INotificationStore, NotificationStore>();

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

// Flight search aggregator. Real GDS providers are registered alongside
// the mock so the controller can fan out across all of them.
builder.Services.Configure<KiwiOptions>(builder.Configuration.GetSection("Travel:Kiwi"));
var kiwiOpts = builder.Configuration.GetSection("Travel:Kiwi").Get<KiwiOptions>() ?? new KiwiOptions();
if (kiwiOpts.IsConfigured)
{
    // Typed HttpClient — Tequila `apikey` header lives in KiwiApiClient ctor.
    // Tequila returns gzip-encoded responses (per their prerequisites), so
    // we opt the underlying handler into automatic decompression rather
    // than reading raw bytes ourselves.
    builder.Services.AddHttpClient<KiwiApiClient>()
        .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
        {
            AutomaticDecompression = System.Net.DecompressionMethods.GZip
                | System.Net.DecompressionMethods.Deflate,
        });
    builder.Services.AddScoped<IFlightSearchProvider, KiwiFlightSearchProvider>();
    // Real 3-step Booking API chain (Deposit model): check_flights →
    // save_booking → confirm_payment. Test mode automatically splices
    // test_payments=1 into the POSTs (see KiwiApiClient.PostJsonAsync).
    builder.Services.AddScoped<IFlightBookingProvider, KiwiFlightBookingProvider>();
}
else
{
    // No live key → keep the deterministic mock so dev/CI keep working
    // without external dependencies. Set Travel:Kiwi:ApiKey (or env
    // TRAVEL__KIWI__APIKEY) to flip to live.
    builder.Services.AddScoped<IFlightSearchProvider, MockFlightSearchProvider>();
    builder.Services.AddScoped<IFlightBookingProvider, MockFlightBookingProvider>();
}
builder.Services.AddScoped<IFlightSearchService, FlightSearchService>();

// Booking pipeline. The deposit model means Kiwi pulls funds from
// FlyGift's pre-funded partner account — no per-booking card charge —
// so BookingService no longer talks to a card-payment provider directly.
// Wallet top-ups (which fund the user's FlyGift balance) go through Grow.
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IAppBootstrapService, AppBootstrapService>();

// Grow (Israeli hosted-page payment gateway). Replaces Stripe. When
// credentials are present we register the real provider; otherwise the
// DisabledPaymentProcessProvider stub is registered so WalletController
// can surface a clean 503 envelope instead of crashing on a missing DI.
// One-line env switch via Grow:Mode = Test | Production.
// Set Payments:Mode=Demo to bypass Grow and credit wallets instantly.
builder.Services.Configure<GrowOptions>(builder.Configuration.GetSection("Grow"));
var paymentsMode = builder.Configuration["Payments:Mode"] ?? "";
var growOpts = builder.Configuration.GetSection("Grow").Get<GrowOptions>() ?? new GrowOptions();
if (string.Equals(paymentsMode, "Demo", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IPaymentProcessProvider, DemoPaymentProcessProvider>();
}
else if (growOpts.IsConfigured)
{
    builder.Services.AddHttpClient<GrowApiClient>();
    builder.Services.AddScoped<IPaymentProcessProvider, GrowPaymentProvider>();
}
else
{
    builder.Services.AddScoped<IPaymentProcessProvider, DisabledPaymentProcessProvider>();
}

// Hotel search & booking (Stage 19) — mock provider, swappable.
builder.Services.AddScoped<FlyGiftBackend.Services.Hotels.IHotelSearchService,
    FlyGiftBackend.Services.Hotels.HotelSearchService>();


// Wallet (Apple .pkpass + Google Wallet save link)
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddHostedService<GiftCardExpirationWorker>();


builder.Services.AddControllers();

// When [ApiController] auto-rejects a request with a 400, log the
// failed ModelState before returning the standard ValidationProblemDetails
// so we can see *which* field failed without having to reproduce the
// bug interactively. The response body shape is unchanged.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    var fallback = options.InvalidModelStateResponseFactory;
    options.InvalidModelStateResponseFactory = context =>
    {
        var logger = context.HttpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("ModelValidation");

        var errors = context.ModelState
            .Where(kv => kv.Value?.Errors.Count > 0)
            .ToDictionary(
                kv => kv.Key,
                kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

        logger.LogWarning(
            "Model validation failed for {Method} {Path}: {@Errors}",
            context.HttpContext.Request.Method,
            context.HttpContext.Request.Path,
            errors);

        return fallback(context);
    };
});

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

var authCookieName = builder.Configuration["Auth:Cookie:Name"]
    ?? FlyGiftBackend.Auth.CookieOptionsBuilder.DefaultCookieName;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
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
        // Accept the JWT either from the standard `Authorization: Bearer`
        // header (for native/mobile clients) OR from the HttpOnly cookie
        // we set on /Auth/Login (for the web SPA, which never reads it
        // client-side). Authorization header wins when both are present.
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue(authCookieName, out var cookieToken) &&
                    !string.IsNullOrWhiteSpace(cookieToken))
                {
                    ctx.Token = cookieToken;
                }
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// Origins come from `Cors:AllowedOrigins` (pipe-separated) so prod can
// pin to https://app.flygift.app while dev allows localhost. Credentials
// are required because we send the auth cookie cross-origin in dev.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins);
        policy.AllowAnyHeader()
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
