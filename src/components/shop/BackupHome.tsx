"use client";

import FeaturedArtistsSection from "../FeaturedArtists";
import JoinTheList from "../JoinTheList";
import TourSection from "../TourSection";
import Hero from "./sections/Hero";
import SceneMarquee from "./sections/SceneMarquee";
import SceneVideoHero from "./sections/SceneVideoHero";
import RetailSceneFloor from "./sections/RetailSceneFloor";
import ProductionConfidence from "./sections/ProductionConfidence";
import SceneLaunchGrid from "./sections/SceneLaunchGrid";
import DesignToFulfilmentShowcase from "./sections/DesignToFulfilmentShowcase";
import CollectionBundleFeature from "./sections/CollectionBundleFeature";
import AngledPromoRail from "./sections/AngledPromoRail";
import MerchWall from "./sections/MerchWall";
import SceneSocialFeed from "./sections/SceneSocialFeed";
import ShopByCollection from "./sections/ShopByCollection";
import SplitPromo from "./sections/SplitPromo";
import AllArtists from "./sections/AllArtists";
import BackstagePolaroids from "./sections/BackstagePolaroids";
import RealLifeInLoop from "./sections/RealLifeInLoop";
import CommunityReviews from "./sections/CommunityReviews";
import OurFavouriteMerch from "./sections/OurFavouriteMerch";
import DropInConcept from "./sections/DropInConcept";
import HowItWorks from "./sections/HowItWorks";
import WhyThisIsBetter from "./sections/WhyThisIsBetter";
import MiniCTAStrip from "./sections/MiniCTAStrip";
import WhyTrustUs from "./sections/WhyTrustUs";
import FeaturedArtist from "./sections/FeaturedArtist";
import LowerSceneVideo from "./sections/LowerSceneVideo";
import React from "react";
import MobileMerchWall from "./sections/MobileMerchWall";
import type { TourDate } from "@/lib/models/TourDates";

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();

        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);

    return isMobile;
}

export default function BackupHome({ tourDates }: { tourDates: TourDate[] }) {
    const isMobile = useIsMobile();

    return (
        <>
            <Hero />
            <SceneMarquee />
            <SceneVideoHero />
            <DesignToFulfilmentShowcase />
            <RetailSceneFloor />
            <FeaturedArtistsSection />
            <SceneLaunchGrid />
            <CollectionBundleFeature />
            <AngledPromoRail />
            {isMobile ? <MobileMerchWall /> : <MerchWall />}
            <SceneSocialFeed />
            <AllArtists />
            <ShopByCollection />
            <FeaturedArtist />
            <ProductionConfidence />
            <DropInConcept />
            <OurFavouriteMerch />
            <LowerSceneVideo />
            <WhyTrustUs />
            <HowItWorks />
            <SplitPromo />
            <WhyThisIsBetter />
            <MiniCTAStrip />
            <BackstagePolaroids />
            <TourSection dates={tourDates} />
            <RealLifeInLoop />
            <CommunityReviews />
            <JoinTheList />
        </>
    );
}
