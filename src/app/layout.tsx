import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--nf-display",
  display: "swap",
});
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--nf-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--nf-mono",
  display: "swap",
});

const metadataBase = process.env.APP_ORIGIN
  ? new URL(process.env.APP_ORIGIN)
  : undefined;

export const metadata: Metadata = {
  metadataBase,
  applicationName: "Fulcrum",
  title: {
    default: "Fulcrum — website security scorecard",
    template: "%s — Fulcrum",
  },
  description:
    "Grade a website's security from A to F and get a remediation plan ranked by risk removed per unit of effort.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Fulcrum",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`h-full ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-full bg-base text-ink antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
