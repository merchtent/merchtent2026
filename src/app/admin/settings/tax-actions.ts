"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/auth/admin";

function cleanAbn(value: FormDataEntryValue | null) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits || null;
}

export async function updateTaxSettings(formData: FormData) {
    const { supabase, user } = await requireAdminAction();
    const gstRegistered = formData.get("gst_registered") === "on";
    const effectiveDate = String(formData.get("gst_effective_from") ?? "").trim();
    const legalName = String(formData.get("legal_name") ?? "").trim();
    const abn = cleanAbn(formData.get("abn"));
    const pricingMode = formData.get("pricing_mode") === "preserve_margins"
        ? "preserve_margins"
        : "absorb";

    if (!legalName) throw new Error("A seller legal name is required.");
    if (abn && abn.length !== 11) throw new Error("ABN must contain 11 digits.");
    if (gstRegistered && (!effectiveDate || !abn)) {
        throw new Error("An effective date and ABN are required before GST can be enabled.");
    }

    const { error } = await supabase
        .from("tax_settings")
        .update({
            gst_registered: gstRegistered,
            gst_effective_from: effectiveDate || null,
            gst_rate_bps: 1000,
            pricing_mode: pricingMode,
            legal_name: legalName,
            abn,
            updated_by: user.id,
        })
        .eq("id", true);

    if (error) throw new Error(`Could not update GST settings: ${error.message}`);

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard/products/designer");
    redirect("/admin/settings?saved=tax");
}
