import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { MotionProvider } from "@/components/motion/motion-provider";
import { SITE } from "@/constants/site";

import "./globals.css";
import "./motion.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sansFont = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Reconnect with your UPS classmates, discover alumni across professions, and create new opportunities together.",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: "An alumni-led community for former University Public School students, Chakdara.",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#123E35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="min-h-dvh bg-brand-ivory font-sans text-brand-ink antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-deep focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
