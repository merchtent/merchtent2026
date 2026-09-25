const NAMED_SWATCHES: Record<string, string> = {
    ash: "#b7b8b3",
    "ash stone": "#8f918c",
    "dark chocolate": "#3b2925",
    "dark heather": "#555154",
    "forest green": "#14532d",
    "heather royal": "#4169a8",
    "light blue": "#69a9dc",
    "light pink": "#efb6c8",
    maroon: "#7f1d3b",
    "moss stone": "#59654b",
    navy: "#172033",
    red: "#c62828",
    royal: "#2855b6",
    sand: "#c8b99b",
    "sport grey": "#aeb4bd",
};

export function colorSwatchHex(label: string) {
    const normalized = label.trim().toLowerCase();
    const namedSwatch = NAMED_SWATCHES[normalized];
    if (namedSwatch) return namedSwatch;
    if (normalized.includes("white")) return "#f7f7f2";
    if (normalized.includes("cream")) return "#f1eee4";
    if (normalized.includes("black")) return "#111111";
    if (normalized.includes("navy")) return "#111827";
    if (normalized.includes("maroon")) return "#7f1d3b";
    if (normalized.includes("pink")) return "#efb6c8";
    if (normalized.includes("purple")) return "#7e22ce";
    if (normalized.includes("red")) return "#b91c1c";
    if (normalized.includes("green") || normalized.includes("forest")) return "#14532d";
    if (normalized.includes("grey") || normalized.includes("gray")) return "#9ca3af";
    if (normalized.includes("blue")) return "#1d4ed8";
    if (normalized.includes("yellow")) return "#eab308";
    if (normalized.includes("orange")) return "#ea580c";
    return "#444444";
}

export function resolvedCatalogColorHex(label: string, storedValue: string) {
    return storedValue.trim().toLowerCase() === "#444444"
        ? colorSwatchHex(label)
        : storedValue;
}
