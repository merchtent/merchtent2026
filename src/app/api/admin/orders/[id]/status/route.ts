import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const VALID_STATUSES = [
    "pending",
    "paid",
    "in_production",
    "shipped",
    "delivered",
] as const;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const body = await request.json();

        const {
            status,
            trackingNumber,
            carrier,
        } = body;

        if (
            status === "shipped" &&
            (
                !trackingNumber?.trim() ||
                !carrier?.trim()
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Tracking number and carrier are required for shipped orders.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !VALID_STATUSES.includes(
                status as (typeof VALID_STATUSES)[number]
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid status",
                },
                {
                    status: 400,
                }
            );
        }

        const supabase = getServerSupabase();

        // verify logged in
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorised",
                },
                {
                    status: 401,
                }
            );
        }

        // verify admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "admin") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Forbidden",
                },
                {
                    status: 403,
                }
            );
        }

        const updateData: any = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (trackingNumber !== undefined) {
            updateData.tracking_number = trackingNumber;
        }

        if (carrier !== undefined) {
            updateData.carrier = carrier;
        }

        const { data, error } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error(error);

            return NextResponse.json(
                {
                    success: false,
                    message: error.message,
                },
                {
                    status: 500,
                }
            );
        }

        return NextResponse.json({
            success: true,
            order: data,
        });
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message: error.message,
            },
            {
                status: 500,
            }
        );
    }
}