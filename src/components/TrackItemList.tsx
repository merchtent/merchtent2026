"use client";

import { useEffect } from "react";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function TrackItemList({ listName, items }: { listName: string; items: Array<{ id: string; title?: string | null; price_cents?: number | null; currency?: string | null }> }) {
    useEffect(() => {
        if (!items.length) return;
        trackMarketingEvent("view_item_list", {
            item_list_name: listName,
            items: items.slice(0, 50).map((item) => ({ item_id: item.id, item_name: item.title, price_cents: item.price_cents, currency: item.currency ?? "AUD" })),
        });
    }, [items, listName]);
    return null;
}
