// src/lib/supabase/service.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";

export function getServiceSupabase() {
    return createClient(
        serverEnv.supabaseUrl(),
        serverEnv.supabaseServiceRoleKey(), // keep only on server
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}
