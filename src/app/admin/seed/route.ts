// src/app/admin/seed/route.ts
import { NextResponse } from 'next/server';
import { getServiceRoleSupabase } from "@/lib/supabase/server";

export async function POST() {
    const supabase = getServiceRoleSupabase();

    // upsert two example products
    const { error } = await supabase.from('products').upsert([
        { title: 'Artist Tee', description: 'Soft cotton tee', price_cents: 3500, currency: 'AUD', is_published: true },
        { title: 'Tour Hoodie', description: 'Cozy fleece hoodie', price_cents: 6900, currency: 'AUD', is_published: true }
    ]);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
