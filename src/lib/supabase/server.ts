import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

export function getServerSupabase() {
    const cookieStore = cookies(); // read-only in RSC

    return createServerClient(
        publicEnv.supabaseUrl(),
        publicEnv.supabaseAnonKey(),
        {
            cookies: {
                async get(name: string) {
                    return (await cookieStore).get(name)?.value;
                },
                // No-ops: writing cookies is disallowed outside Actions/Route Handlers
                set(_name: string, _value: string, _options: CookieOptions) {
                    void _name;
                    void _value;
                    void _options;
                },
                remove(_name: string, _options: CookieOptions) {
                    void _name;
                    void _options;
                },
            },
        }
    );
}
