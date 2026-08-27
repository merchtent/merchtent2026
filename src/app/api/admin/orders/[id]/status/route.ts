export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { noStoreJson } from "@/lib/api/no-store";
import { requireAdmin } from "@/lib/auth/admin";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/lib/supabase/service";

const statusSchema = z.object({
    status: z.enum(["pending", "paid", "in_production", "shipped", "delivered"]),
    trackingNumber: z.string().trim().max(120).optional().default(""),
    carrier: z.string().trim().max(80).optional().default(""),
});

function trackingUrlFor(carrier: string, trackingNumber: string) {
    const encoded = encodeURIComponent(trackingNumber);
    const normalized = carrier.toLowerCase();

    if (normalized.includes("australia post")) {
        return `https://auspost.com.au/mypost/track/#/details/${encoded}`;
    }

    if (normalized.includes("sendle")) {
        return `https://try.sendle.com/tracking?ref=${encoded}`;
    }

    return null;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) return auth.response;

        const { id } = await params;
        const parsed = statusSchema.safeParse(await request.json().catch(() => ({})));

        if (!parsed.success) {
            return noStoreJson(
                { success: false, message: "Invalid status payload" },
                { status: 400 }
            );
        }

        const { status, trackingNumber, carrier } = parsed.data;

        if (status === "shipped" && (!trackingNumber || !carrier)) {
            return noStoreJson(
                {
                    success: false,
                    message:
                        "Tracking number and carrier are required for shipped orders.",
                },
                { status: 400 }
            );
        }

        const serviceSupabase = getServiceSupabase();
        const trackingUrl =
            trackingNumber && carrier ? trackingUrlFor(carrier, trackingNumber) : null;

        const { data, error } = await serviceSupabase.rpc("admin_update_order_status", {
            p_order_id: id,
            p_actor_user_id: auth.user.id,
            p_status: status,
            p_tracking_code: trackingNumber || null,
            p_tracking_carrier: carrier || null,
            p_tracking_url: trackingUrl,
        });

        if (error) {
            logger.error("Admin order status update failed", {
                order_id: id,
                status,
                actor_user_id: auth.user.id,
                error: error.message,
            });
            return noStoreJson(
                { success: false, message: "Could not update order status." },
                { status: 500 }
            );
        }

        return noStoreJson({
            success: true,
            order: data,
        });
    } catch (error) {
        logger.error("Unexpected admin order status update error", {
            error: getErrorMessage(error),
        });
        return noStoreJson(
            { success: false, message: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
