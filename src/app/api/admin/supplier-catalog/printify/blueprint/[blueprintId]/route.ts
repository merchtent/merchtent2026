import { requireAdmin } from "@/lib/auth/admin";
import {
    getPrintifyBlueprint,
    listAllPrintifyPrintProviders,
    listPrintifyPrintProviders,
} from "@/lib/printify/catalog";
import { noStoreJson } from "@/lib/api/no-store";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ blueprintId: string }> }
) {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { blueprintId } = await params;
    const parsedBlueprintId = Number(blueprintId);

    if (!Number.isInteger(parsedBlueprintId) || parsedBlueprintId <= 0) {
        return noStoreJson(
            { success: false, message: "Enter a valid Printify blueprint id." },
            { status: 400 }
        );
    }

    try {
        const [blueprint, blueprintProviders, allProviders, importedProviders] = await Promise.all([
            getPrintifyBlueprint(parsedBlueprintId),
            listPrintifyPrintProviders(parsedBlueprintId),
            listAllPrintifyPrintProviders(),
            admin.supabase
                .from("supplier_catalog_products")
                .select("supplier_provider_id")
                .eq("supplier", "printify")
                .eq("supplier_product_id", String(parsedBlueprintId)),
        ]);
        if (importedProviders.error) {
            throw new Error(importedProviders.error.message);
        }
        const allProviderById = new Map(allProviders.map((provider) => [provider.id, provider]));
        const providers = blueprintProviders.map((provider) => ({
            ...allProviderById.get(provider.id),
            ...provider,
            location: provider.location ?? allProviderById.get(provider.id)?.location,
        }));

        return noStoreJson({
            success: true,
            blueprint,
            providers,
            importedProviderIds: (importedProviders.data ?? [])
                .map((row) => Number(row.supplier_provider_id))
                .filter((id) => Number.isInteger(id) && id > 0),
        });
    } catch (error) {
        return noStoreJson(
            {
                success: false,
                message: error instanceof Error ? error.message : "Printify catalogue request failed.",
            },
            { status: 502 }
        );
    }
}
