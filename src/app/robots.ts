import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
    const siteUrl = publicEnv.siteUrl();

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin",
                    "/dashboard",
                    "/account",
                    "/checkout",
                    "/cart",
                    "/orders",
                    "/api",
                    "/auth",
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
