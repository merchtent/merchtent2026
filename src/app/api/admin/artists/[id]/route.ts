import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        const {
            display_name,
            slug,
            bio,
            instagram_url,
            spotify_url,
            bandcamp_url,
            website_url,
        } = body;

        if (!display_name?.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Display Name is required",
                },
                {
                    status: 400,
                }
            );
        }

        const { data, error } = await supabase
            .from("artists")
            .update({
                display_name: display_name.trim(),
                slug: slug?.trim() || null,
                bio: bio?.trim() || null,
                instagram_url:
                    instagram_url?.trim() || null,
                spotify_url:
                    spotify_url?.trim() || null,
                bandcamp_url:
                    bandcamp_url?.trim() || null,
                website_url:
                    website_url?.trim() || null,
            })
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
            artist: data,
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