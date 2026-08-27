// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export function getBrowserSupabase() {
    return createBrowserClient(
        publicEnv.supabaseUrl(),
        publicEnv.supabaseAnonKey(),
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        }
    );
}
