import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getServerSupabase() {
    const cookieStore = cookies(); // read-only in RSC

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                async get(name: string) {
                    return (await cookieStore).get(name)?.value;
                },
                // No-ops: writing cookies is disallowed outside Actions/Route Handlers
                set(_name: string, _value: string, _options: CookieOptions) { },
                remove(_name: string, _options: CookieOptions) { },
            },
        }
    );
}
