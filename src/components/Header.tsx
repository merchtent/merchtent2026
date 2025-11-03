// src/components/Header.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import HeaderClient from "./HeaderClient";

export default async function Header() {
    const supabase = getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    // Pass initial state to the client header so it renders correctly immediately
    return <HeaderClient initialEmail={user?.email ?? null} />;
}
