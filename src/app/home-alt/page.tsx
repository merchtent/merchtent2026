import type { Metadata } from "next";
import HomeAlt from "@/components/shop/HomeAlt";

export const metadata: Metadata = {
    title: "Merch Tent Alt Concept | Artist-first merch",
    description: "An alternate homepage concept for Merch Tent.",
};

export default function HomeAltPage() {
    return <HomeAlt />;
}
