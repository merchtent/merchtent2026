import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

export function getPublicServerSupabase() {
    return createClient(
        publicEnv.supabaseUrl(),
        publicEnv.supabaseAnonKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}
