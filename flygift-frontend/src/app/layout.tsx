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

export const metadata: Metadata = {
  title: "FlyGift — שולחים חוויות",
  description:
    "כרטיסי מתנה פרימיום לטיסות ומלונות. שולחים חוויות, לא שוברים.",
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
