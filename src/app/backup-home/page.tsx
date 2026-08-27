import { getServerSupabase } from "@/lib/supabase/server";
import BackupHome from "@/components/shop/BackupHome";

async function getTourDates() {
    const supabase = getServerSupabase();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
        .from("tour_dates")
        .select("id, artist, venue, city, event_date, ticket_url")
        .gte("event_date", today)
        .order("event_date", { ascending: true });

    return data ?? [];
}

export default async function BackupHomePage() {
    const tourDates = await getTourDates();

    return <BackupHome tourDates={tourDates} />;
}
