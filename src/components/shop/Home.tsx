"use client";

import FeaturedArtistsSection from "../FeaturedArtists";
import JoinTheList from "../JoinTheList";
import TourSection from "../TourSection";
import Hero from "./sections/Hero";
import AngledPromoRail from "./sections/AngledPromoRail";
import MerchWall from "./sections/MerchWall";
import ShopByCollection from "./sections/ShopByCollection";
import SplitPromo from "./sections/SplitPromo";
import BootlegSale from "./sections/BootlegSale";
import EditorsRailPromo from "./sections/EditorsRailPromo";
import BundleBuilder from "./sections/MixtapeBundle";
import AllArtists from "./sections/AllArtists";
import BackstagePolaroids from "./sections/BackstagePolaroids";
import FanShouts from "./sections/FanShouts";
import OurFavouriteMerch from "./sections/OurFavouriteMerch";
import DropInConcept from "./sections/DropInConcept";
import HowItWorks from "./sections/HowItWorks";
import WhyThisIsBetter from "./sections/WhyThisIsBetter";
import MiniCTAStrip from "./sections/MiniCTAStrip";
import WhyTrustUs from "./sections/WhyTrustUs";
import FeaturedArtist from "./sections/FeaturedArtist";
import BundleBuilderForTwoTees from "./sections/MixtapeBundleForTwoTees";

// ============================================================
// BAND MERCH — "NOISE // NIGHT DRIVE" (maximum‑edgy edition)
// Influence: bootleg flyers, tour stickers, diagonal splits, torn edges,
// masonry merch wall, horizontal rails, countdown drop, second capsule.
// Tech: shadcn/ui, framer-motion, lucide-react, Tailwind, Next/Image.
// ============================================================

export default function Home({
    tourDates,
}: {
    tourDates: TourDate[];
}) {

    return (
        <>
            <Hero />
            <FeaturedArtistsSection />
            <AngledPromoRail />
            <MerchWall />
            <FeaturedArtist />
            <ShopByCollection />
            <DropInConcept />
            <OurFavouriteMerch />
            <EditorsRailPromo />
            <BundleBuilderForTwoTees />
            <BundleBuilder />
            <AllArtists />
            <WhyTrustUs />
            <HowItWorks />
            <SplitPromo />
            <WhyThisIsBetter />
            <MiniCTAStrip />
            <BackstagePolaroids />
            <TourSection dates={tourDates} />
            <FanShouts />
            <JoinTheList />
        </>
    );
}