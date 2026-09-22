import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

export function getBearerSupabase(accessToken: string) {
    return createClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
