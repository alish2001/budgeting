import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: "Oversight - Budget Planner - 50/30/20 Rule",
  description:
    "A simple budgeting app using the 50/30/20 rule to manage your finances",
  keywords: ["budget", "finance", "50/30/20", "money management", "savings"],
  authors: [{ name: "Ali Shariatmadari" }],
  applicationName: "Oversight - Budget Planner",
  openGraph: {
    title: "Oversight - Budget Planner - 50/30/20 Rule",
    description:
      "A simple budgeting app using the 50/30/20 rule to manage your finances",
    url: "https://oversight.finance",
    siteName: "Oversight - Budget Planner",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Oversight - Budget Planner - 50/30/20 Rule",
    description:
      "A simple budgeting app using the 50/30/20 rule to manage your finances",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
