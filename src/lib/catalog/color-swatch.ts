export function colorSwatchHex(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes("white")) return "#f7f7f2";
    if (normalized.includes("black")) return "#111111";
    if (normalized.includes("navy")) return "#111827";
    if (normalized.includes("red")) return "#b91c1c";
    if (normalized.includes("green") || normalized.includes("forest")) return "#14532d";
    if (normalized.includes("grey") || normalized.includes("gray")) return "#9ca3af";
    if (normalized.includes("blue")) return "#1d4ed8";
    return "#444444";
}
