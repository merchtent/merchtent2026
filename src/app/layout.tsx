import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSupabase } from "@/lib/supabase/server";
import "./globals.css";
import Link from "next/link";
import CartProvider from "@/components/CartProvider";
import ToastProvider from "@/components/ToastProvider";
import OverlayCleanup from "@/components/OverlayCleanup";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merch Tent | Local and Unsigned Band Merch",
  description: "Local and Unsigned Band Merch",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OverlayCleanup />
        <ToastProvider>
          <CartProvider>
            <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-red-600/40">
              <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.08] mix-blend-soft-light" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)", backgroundSize: "12px 12px, 14px 14px" }} />
              <Header />
              {children}
              <Footer />
            </div>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
