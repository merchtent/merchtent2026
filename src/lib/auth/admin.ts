import "server-only";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { rejectCrossOriginRequest } from "@/lib/auth/request-origin";
import { noStoreJson } from "@/lib/api/no-store";

export async function requireAdmin(request?: Request) {
    if (request) {
        const originRejection = rejectCrossOriginRequest(request);
        if (originRejection) {
            return {
                ok: false as const,
                response: originRejection,
            };
        }
    }

    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            ok: false as const,
            response: noStoreJson(
                { success: false, message: "Unauthorised" },
                { status: 401 }
            ),
        };
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error || profile?.role !== "admin") {
        return {
            ok: false as const,
            response: noStoreJson(
                { success: false, message: "Forbidden" },
                { status: 403 }
            ),
        };
    }

    return {
        ok: true as const,
        supabase,
        user,
    };
}

export async function requireAdminAction() {
    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Sign in required.");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error || profile?.role !== "admin") {
        throw new Error("Admin access required.");
    }

    return {
        supabase,
        user,
    };
}

export async function requireAdminPage() {
    const supabase = getServerSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error || profile?.role !== "admin") {
        redirect("/");
    }

    return {
        supabase,
        user,
    };
}
