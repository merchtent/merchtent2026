import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { Suspense } from "react";
import "./globals.css";
import CartProvider from "@/components/CartProvider";
import ToastProvider from "@/components/ToastProvider";
import OverlayCleanup from "@/components/OverlayCleanup";
import Header from "@/components/Header";
import HeaderVisibility from "@/components/HeaderVisibility";
import FooterVisibility from "@/components/FooterVisibility";
import PageViewTracker from "@/components/PageViewTracker";
import ScrollRestoration from "@/components/ScrollRestoration";
import StructuredData from "@/components/StructuredData";
import ConsentBanner from "@/components/ConsentBanner";
import { publicEnv } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl()),
  title: {
    default: "Band Merch Australia for Local Artists | Merch Tent",
    template: "%s | Merch Tent",
  },
  description: "Shop official merch from Australian local and unsigned bands, or launch your own print-on-demand range. Tees, hoodies and more. Artists earn on every sale.",
  applicationName: "Merch Tent",
  creator: "Merch Tent",
  publisher: "Merch Tent",
  keywords: [
    "band merch Australia",
    "local band merch",
    "unsigned band merch",
    "Australian artist merch",
    "print on demand band merch",
  ],
  openGraph: {
    title: "Band Merch Australia for Local Artists | Merch Tent",
    description: "Shop official merch from Australian local and unsigned bands, or launch your own print-on-demand range. Artists earn on every sale.",
    url: "/",
    siteName: "Merch Tent",
    type: "website",
    locale: "en_AU",
    images: [
      {
        url: "/images/home-new-hero-merch-table.png",
        alt: "Band merch from local and unsigned Australian artists at Merch Tent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Band Merch Australia for Local Artists | Merch Tent",
    description: "Shop official merch from Australian local and unsigned bands. Artists earn on every sale.",
    images: ["/images/home-new-hero-merch-table.png"],
  },
  icons: {
    icon: [{ url: "/images/merch-tent-logo-badge-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/images/merch-tent-logo-badge-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Strict per-request CSP nonces require request-time rendering.
  await connection();
  const siteUrl = publicEnv.siteUrl();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <StructuredData
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${siteUrl}/#website`,
              url: siteUrl,
              name: "Merch Tent",
              alternateName: "Merch Tent Australia",
              inLanguage: "en-AU",
              publisher: { "@id": `${siteUrl}/#store` },
            },
            {
              "@context": "https://schema.org",
              "@type": "OnlineStore",
              "@id": `${siteUrl}/#store`,
              url: siteUrl,
              name: "Merch Tent",
              alternateName: "Merch Tent Australia",
              description: "An Australian marketplace for official merch from local and unsigned bands, with self-service merch tools for artists.",
              logo: {
                "@type": "ImageObject",
                url: `${siteUrl}/images/merch-tent-logo-badge.png`,
                contentUrl: `${siteUrl}/images/merch-tent-logo-badge.png`,
              },
              image: `${siteUrl}/images/home-new-hero-merch-table.png`,
              email: "support@merchtent.com.au",
              areaServed: { "@type": "Country", name: "Australia" },
              sameAs: ["https://www.instagram.com/merchtent.au/"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@merchtent.com.au",
                availableLanguage: "English",
                areaServed: "AU",
              },
            },
          ]}
        />
        <OverlayCleanup />
        <Suspense fallback={null}>
          <ScrollRestoration />
        </Suspense>
        <ToastProvider>
          <CartProvider>
            <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-red-600/40">
              <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.08] mix-blend-soft-light" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)", backgroundSize: "12px 12px, 14px 14px" }} />
              <HeaderVisibility>
                <Header />
              </HeaderVisibility>
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              <div id="main-content" className="app-content" tabIndex={-1}>
                {children}
              </div>
              <FooterVisibility />
              <ConsentBanner />
            </div>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
