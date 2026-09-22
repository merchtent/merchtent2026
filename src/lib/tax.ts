export type TaxPricingMode = "absorb" | "preserve_margins";

export type PublicTaxSettings = {
    gst_registered: boolean;
    gst_effective_from: string | null;
    gst_rate_bps: number;
    pricing_mode: TaxPricingMode;
};

export function isGstActive(
    settings: Pick<PublicTaxSettings, "gst_registered" | "gst_effective_from">,
    at = new Date()
) {
    if (!settings.gst_registered || !settings.gst_effective_from) return false;
    const dateParts = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Sydney",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(at);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        dateParts.find((value) => value.type === type)?.value ?? "";
    const sydneyDate = `${part("year")}-${part("month")}-${part("day")}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(settings.gst_effective_from)
        && sydneyDate >= settings.gst_effective_from;
}

export function gstComponentFromInclusiveCents(grossCents: number, rateBps = 1000) {
    if (grossCents <= 0 || rateBps <= 0) return 0;
    return Math.round((grossCents * rateBps) / (10000 + rateBps));
}

export function retailCentsForTaxSettings(
    configuredCents: number,
    settings: PublicTaxSettings | null,
    at = new Date()
) {
    if (
        !settings ||
        settings.pricing_mode !== "preserve_margins" ||
        !isGstActive(settings, at)
    ) {
        return configuredCents;
    }

    return Math.round(configuredCents * (1 + settings.gst_rate_bps / 10000));
}
