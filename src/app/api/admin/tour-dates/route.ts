// app/api/admin/tour-dates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = getServerSupabase();

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

        const body = await request.json();

        const artist = String(body.artist || "").trim();
        const venue = String(body.venue || "").trim();
        const city = String(body.city || "").trim();
        const event_date = String(body.event_date || "").trim();
        const ticket_url = String(body.ticket_url || "").trim();

        if (!artist) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Artist is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!venue) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Venue is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!city) {
            return NextResponse.json(
                {
                    success: false,
                    message: "City is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!event_date) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Event Date is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (!ticket_url) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Ticket URL is required",
                },
                {
                    status: 400,
                }
            );
        }

        const { data, error } = await supabase
            .from("tour_dates")
            .insert({
                artist,
                venue,
                city,
                event_date,
                ticket_url,
            })
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
            tourDate: data,
        });
    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ??
                    "An unexpected error occurred",
            },
            {
                status: 500,
            }
        );
    }
}