export const PRODUCT_TRUST_EVIDENCE = {
    production: {
        label: "Production window",
        value: "Usually 2–3 business days",
        detail: "Each item is made after checkout rather than held as finished stock.",
    },
    delivery: {
        label: "Tracked delivery",
        value: "Options shown at checkout",
        detail: "The selected service and tracking updates stay attached to the order.",
    },
    reviews: {
        label: "Verified reviews",
        value: "Completed orders only",
        detail: "Only customers with an eligible completed order can publish a product review.",
    },
    replacement: {
        label: "Replacement promise",
        value: "Replaced at no cost",
        detail: "Damaged, misprinted or incorrect items are fully replaced at no cost.",
    },
} as const;
