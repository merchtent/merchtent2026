import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

export function getWritableServerSupabase() {
    const cookieStore = cookies(); // writable in Actions/Route Handlers

    return createServerClient(
        publicEnv.supabaseUrl(),
        publicEnv.supabaseAnonKey(),
        {
            cookies: {
                async get(name: string) {
                    return (await cookieStore).get(name)?.value;
                },
                async set(name: string, value: string, options: CookieOptions) {
                    (await cookieStore).set({ name, value, ...options });
                },
                async remove(name: string, options: CookieOptions) {
                    (await cookieStore).set({ name, value: "", ...options });
                },
            },
        }
    );
}
