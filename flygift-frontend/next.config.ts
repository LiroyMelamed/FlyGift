import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.flygift.com";
// connect-src must be the host origin (no path) so /api/* subpaths are allowed.
const apiConnectOrigin = (() => {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/, "");
  }
})();

/**
 * Strict CSP for the Cinematic Skyline app.
 *
 * - Self-only by default
 * - Google Fonts allowed (next/font + CSS)
 * - Our backend API allowed via NEXT_PUBLIC_API_BASE_URL
 * - 'unsafe-inline' tolerated in dev only (Next dev overlay + HMR)
 * - 'unsafe-eval' allowed only in dev for React Refresh
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : "'unsafe-inline'"} https://static.cloudflareinsights.com`,
  `connect-src 'self' ${apiConnectOrigin}${isDev ? " ws: http://localhost:* http://127.0.0.1:*" : " https://cloudflareinsights.com"}`,
  `manifest-src 'self'`,
  `worker-src 'self' blob:`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
