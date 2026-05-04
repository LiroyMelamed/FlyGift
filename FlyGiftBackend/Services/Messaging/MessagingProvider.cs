namespace FlyGiftBackend.Services.Messaging
{
    /// <summary>
    /// Default implementation that resolves a template id, renders it with
    /// {Variable} substitution, and dispatches to email or sms providers.
    /// </summary>
    public class MessagingProvider : IMessagingProvider
    {
        private readonly IEmailProvider _email;
        private readonly ISmsProvider _sms;
        private readonly ITemplateCatalog _catalog;
        private readonly ITemplateEngine _engine;
        private readonly ILogger<MessagingProvider> _log;

        public MessagingProvider(
            IEmailProvider email,
            ISmsProvider sms,
            ITemplateCatalog catalog,
            ITemplateEngine engine,
            ILogger<MessagingProvider> log)
        {
            _email = email;
            _sms = sms;
            _catalog = catalog;
            _engine = engine;
            _log = log;
        }

        public Task<MessageDeliveryResult> SendEmailAsync(string templateId, string to, IDictionary<string, string?> vars, CancellationToken ct = default)
        {
            if (!_catalog.TryGet(templateId, out var tpl) || tpl == null)
            {
                _log.LogWarning("Email template not found: {TemplateId}", templateId);
                return Task.FromResult(new MessageDeliveryResult { Success = false, FailureReason = $"Template '{templateId}' not found." });
            }
            var msg = new EmailMessage
            {
                To = to,
                ToName = vars.TryGetValue("Name", out var n) ? n : null,
                Subject = _engine.Render(tpl.Subject ?? "", vars),
                Body = _engine.Render(tpl.Body, vars),
                IsHtml = true,
            };
            return _email.SendAsync(msg, ct);
        }

        public Task<MessageDeliveryResult> SendSmsAsync(string templateId, string toPhone, IDictionary<string, string?> vars, CancellationToken ct = default)
        {
            if (!_catalog.TryGet(templateId, out var tpl) || tpl == null)
            {
                _log.LogWarning("SMS template not found: {TemplateId}", templateId);
                return Task.FromResult(new MessageDeliveryResult { Success = false, FailureReason = $"Template '{templateId}' not found." });
            }
            var msg = new SmsMessage
            {
                ToPhone = toPhone,
                Body = _engine.Render(tpl.Body, vars),
            };
            return _sms.SendAsync(msg, ct);
        }
    }
}
