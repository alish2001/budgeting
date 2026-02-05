import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  JetBrains_Mono,
  Libre_Baskerville,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { DesignLanguageProvider } from "@/lib/design-language-context";
import {
  DEFAULT_DESIGN_LANGUAGE,
  DESIGN_LANGUAGE_STORAGE_KEY,
} from "@/lib/design-language";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://oversight.finance"),
  title: "Oversight - Budget Planner",
  description:
    "A simple budgeting app using the 50/30/20 rule to manage your finances",
  keywords: [
    "oversight",
    "budget",
    "finance",
    "50/30/20",
    "money management",
    "savings",
  ],
  authors: [{ name: "Ali Shariatmadari" }],
  applicationName: "Oversight - Budget Planner",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Oversight - Budget Planner",
    description:
      "A simple budgeting app using the 50/30/20 rule to manage your finances",
    url: "https://oversight.finance",
    siteName: "Oversight - Budget Planner",
    type: "website",
    images: [
      {
        url: "https://oversight.finance/oversight-og.png",
        width: 1200,
        height: 630,
        alt: "Oversight - Budget Planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oversight - Budget Planner",
    description:
      "A simple budgeting app using the 50/30/20 rule to manage your finances",
    images: ["https://oversight.finance/oversight-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const designLanguageInitScript = `(() => {
  try {
    const stored = localStorage.getItem("${DESIGN_LANGUAGE_STORAGE_KEY}");
    const next = stored === "delight" || stored === "cyberpunk"
      ? stored
      : "${DEFAULT_DESIGN_LANGUAGE}";
    document.documentElement.setAttribute("data-design-language", next);
  } catch {
    document.documentElement.setAttribute("data-design-language", "${DEFAULT_DESIGN_LANGUAGE}");
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: designLanguageInitScript }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${libreBaskerville.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DesignLanguageProvider>{children}</DesignLanguageProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
