"use client";

import FeaturedArtistsSection from "../FeaturedArtists";
import JoinTheList from "../JoinTheList";
import TourSection from "../TourSection";
import Hero from "./sections/Hero";
import SceneMarquee from "./sections/SceneMarquee";
import SceneVideoHero from "./sections/SceneVideoHero";
import RetailSceneFloor from "./sections/RetailSceneFloor";
import ProductionConfidence from "./sections/ProductionConfidence";
import DesignToFulfilmentShowcase from "./sections/DesignToFulfilmentShowcase";
import CollectionBundleFeature from "./sections/CollectionBundleFeature";
import AccountPathways from "./sections/AccountPathways";
import MerchWall from "./sections/MerchWall";
import SceneSocialFeed from "./sections/SceneSocialFeed";
import RealLifeInLoop from "./sections/RealLifeInLoop";
import CommunityReviews from "./sections/CommunityReviews";
import MiniCTAStrip from "./sections/MiniCTAStrip";
import WhyTrustUs from "./sections/WhyTrustUs";
import type { TourDate } from "@/lib/models/TourDates";

export default function Home({
    tourDates,
}: {
    tourDates: TourDate[];
}) {
    return (
        <>
            <Hero />
            <SceneMarquee />
            <SceneVideoHero />
            <DesignToFulfilmentShowcase />
            <AccountPathways />
            <RetailSceneFloor />
            <MerchWall />
            <FeaturedArtistsSection />
            <CollectionBundleFeature />
            <SceneSocialFeed />
            <ProductionConfidence />
            {tourDates.length > 0 && <TourSection dates={tourDates} />}
            <RealLifeInLoop />
            <CommunityReviews />
            <WhyTrustUs />
            <MiniCTAStrip />
            <JoinTheList />
        </>
    );
}
