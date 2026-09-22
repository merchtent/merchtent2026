"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth/admin";

function dollarsToCents(value: FormDataEntryValue | null) {
    const amount = Number(String(value ?? "").trim());
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export async function recordSupplierTax(formData: FormData) {
    const { supabase } = await requireAdminAction();
    const orderId = String(formData.get("order_id") ?? "");
    const itemId = String(formData.get("order_item_id") ?? "");
    const reference = String(formData.get("supplier_tax_invoice_reference") ?? "").trim();
    const exGst = dollarsToCents(formData.get("supplier_cost_ex_gst"));
    const gst = dollarsToCents(formData.get("supplier_cost_gst"));

    if (!orderId || !itemId || exGst === null || gst === null || !reference) {
        throw new Error("Supplier cost, GST and invoice reference are required.");
    }

    const { error } = await supabase
        .from("order_items")
        .update({
            supplier_cost_ex_gst_cents: exGst,
            supplier_cost_gst_cents: gst,
            supplier_cost_inc_gst_cents: exGst + gst,
            supplier_tax_invoice_reference: reference,
            supplier_tax_recorded_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .eq("order_id", orderId);

    if (error) throw new Error(`Could not record supplier GST: ${error.message}`);
    revalidatePath(`/admin/orders/${orderId}`);
}
