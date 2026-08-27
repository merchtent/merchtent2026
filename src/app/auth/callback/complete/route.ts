import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/api/no-store";
import { logger } from "@/lib/logger";
import { getWritableServerSupabase } from "@/lib/supabase/server-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const accountType = url.searchParams.get("type");
    const requestedNext = safeNextPath(url.searchParams.get("next"));
    if (!code) return noStoreRedirect(new URL("/", req.url));

    const supabase = getWritableServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        logger.error("auth callback code exchange failed", {
            error: error.message,
        });
        return noStoreRedirect(new URL("/auth/sign-in?error=callback", req.url));
    }

    const next = new URL(requestedNext, req.url);
    if (accountType === "artist" || accountType === "fan") {
        next.searchParams.set("type", accountType);
    }

    return noStoreRedirect(next);
}

function safeNextPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return "/account/setup";
    }
    return value;
}

function noStoreRedirect(url: URL) {
    const response = NextResponse.redirect(url);
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}
