namespace FlyGiftBackend.Services.Wallet
{
    /// <summary>
    /// Branded PNG assets for Apple Wallet pass bundles.
    /// PassKit requires icon.png (29×29) and icon@2x.png (58×58).
    /// </summary>
    internal static class WalletPassAssets
    {
        public static byte[] Icon29 => FromB64(
            "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJUlEQVR42mNgePqfJmjU3FFzR80dNXfU3FFzR80dNXfU3EFlLgDQbjZfwM08QAAAAABJRU5ErkJggg==");

        public static byte[] Icon58 => FromB64(
            "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAAQ0lEQVR42u3OAQkAAAwDoPXv+RxfjoFgAJP7Jbq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6Owoyl9l5URk6sQAAAABJRU5ErkJggg==");

        public static byte[] Logo160x50 => FromB64(
            "iVBORw0KGgoAAAANSUhEUgAAAKAAAAAyCAIAAABUA0cyAAAAZ0lEQVR42u3RQQ0AAAgDsfn3iQ6mgg9pcgquyaw+ZwFgARZgARZgARZgwAIswAIswAIswIAFWIAFWIAFWIAFGLAAC7AAC7AACzBgARZgARZgARZgwAIswAIswAIswAIMWIAFWIB1VwFOgRh2HA7CVwAAAABJRU5ErkJggg==");

        private static byte[] FromB64(string b64) => Convert.FromBase64String(b64);
    }
}
