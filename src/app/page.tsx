import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
    title: "Band Merch Australia for Local Artists | Merch Tent",
    description: "Shop official merch from Australian local and unsigned bands, or launch band merch without upfront stock. Artists earn on every sale.",
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        url: "/",
        title: "Band Merch Australia for Local Artists | Merch Tent",
        description: "Shop official Australian band merch or launch your own made-to-order range without upfront stock.",
        images: [{ url: "/images/home-new-hero-merch-table.png", alt: "Australian band merch at Merch Tent" }],
    },
};

export default function HomePage() {
    return <HomePageClient />;
}
