// app/checkout/success/ClearCheckoutDraft.tsx
"use client";
import { useEffect } from "react";

export default function ClearCheckoutDraft() {
    useEffect(() => {
        try {
            localStorage.removeItem("checkout_draft_v1");
            localStorage.removeItem("checkout_ship_v1");
        } catch { }
    }, []);
    return null;
}
