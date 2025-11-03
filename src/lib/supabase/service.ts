// src/lib/supabase/service.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // keep only on server
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}
