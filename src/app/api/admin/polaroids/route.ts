// app/api/admin/polaroids/route.ts

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

        const image_path = String(
            body.image_path || ""
        ).trim();

        const caption = String(
            body.caption || ""
        ).trim();

        const instagram_url = String(
            body.instagram_url || ""
        ).trim();

        if (!image_path) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Image path is required",
                },
                {
                    status: 400,
                }
            );
        }

        const { data, error } = await supabase
            .from("backstage_polaroids")
            .insert({
                image_path,
                caption,
                instagram_url,
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
            polaroid: data,
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