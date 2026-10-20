import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { MotionProvider } from "@/components/motion/motion-provider";
import { BRAND_COLORS } from "@/constants/colors";
import { SITE } from "@/constants/site";

import "./globals.css";
import "./motion.css";

// One variable family for the whole site. Hierarchy comes from weight and tracking, not a second typeface.
const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  themeColor: BRAND_COLORS.deep,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sansFont.variable}>
      <body className="min-h-dvh bg-brand-mist font-sans text-brand-ink antialiased">
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
