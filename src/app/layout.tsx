import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import "./globals.css";
import CartProvider from "@/components/CartProvider";
import ToastProvider from "@/components/ToastProvider";
import OverlayCleanup from "@/components/OverlayCleanup";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageViewTracker from "@/components/PageViewTracker";
import ScrollRestoration from "@/components/ScrollRestoration";
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
  title: "Merch Tent | Local and Unsigned Band Merch",
  description: "Local and Unsigned Band Merch",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Merch Tent | Local and Unsigned Band Merch",
    description: "Artist merch, fan accounts, and self-service product drops.",
    url: "/",
    siteName: "Merch Tent",
    type: "website",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <OverlayCleanup />
        <Suspense fallback={null}>
          <ScrollRestoration />
        </Suspense>
        <ToastProvider>
          <CartProvider>
            <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-red-600/40">
              <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.08] mix-blend-soft-light" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)", backgroundSize: "12px 12px, 14px 14px" }} />
              <Header />
              <PageViewTracker userId={user?.id ?? null} />
              {children}
              <Footer />
            </div>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
