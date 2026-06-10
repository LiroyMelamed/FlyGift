import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Heebo } from "next/font/google";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalBackground } from "@/components/ui/GlobalBackground";
import { ScrollingPlane } from "@/components/ui/ScrollingPlane";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Premium geometric display font (Clash Display alternative, no extra license).
// To swap to Clash Display: install via next/font/local with the .woff2 files
// and keep the same `--font-display` CSS variable.
const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const fontHeebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://flygift.mela-media.co.il";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FlyGift — שולחים חוויות",
  description:
    "כרטיסי מתנה פרימיום לטיסות ומלונות. שולחים חוויות, לא שוברים.",
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: siteUrl,
    siteName: "FlyGift",
    title: "FlyGift — שולחים חוויות",
    description:
      "כרטיסי מתנה פרימיום לטיסות ומלונות. שולחים חוויות, לא שוברים.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FlyGift — שולחים חוויות",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlyGift — שולחים חוויות",
    description:
      "כרטיסי מתנה פרימיום לטיסות ומלונות. שולחים חוויות, לא שוברים.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} ${fontHeebo.variable}`}
    >
      <body className="min-h-dvh text-text-primary antialiased font-heebo">
        <ThemeProvider defaultTheme="dark">
          <GlobalBackground />
          <ScrollingPlane />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
