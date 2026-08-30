import PolaroidsSection from "@/components/admin/PolaroidsSection";
import TourDatesSection from "@/components/admin/TourDatesSection";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function SettingsPage() {
    const supabase = getServerSupabase();

    const { data: artists } = await supabase
        .from("artists")
        .select("id");

    const { data: products } = await supabase
        .from("products")
        .select("id");

    const { data: orders } = await supabase
        .from("orders")
        .select("id");

    const { data: tourDates } = await supabase
        .from("tour_dates")
        .select("*")
        .order("event_date");

    const { data: artistNames } = await supabase
        .from("artists")
        .select("display_name")
        .order("display_name");

    const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", {
            ascending: false,
        });

    const { data: fanShouts } = await supabase
        .from("fan_shouts")
        .select(`
        *,
        artists (
            display_name
        ),
        products (
            title
        )
    `)
        .order("created_at", {
            ascending: false,
        });

    const { data: polaroids } = await supabase
        .from("backstage_polaroids")
        .select("*")
        .order("created_at", {
            ascending: false,
        });

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="border-b border-neutral-800 p-5 md:p-8">

            {/* HEADER */}

            <div>

                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#b7ff3c]">
                    Platform settings
                </p>

                <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl">
                    Settings desk.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                    Store content, scene modules, fan proof, mailing list health and platform-wide controls.
                </p>

            </div>
            </section>

            {/* PLATFORM HEALTH */}

            <section className="grid border-b border-neutral-800 md:grid-cols-3">

                <div className="border-b border-neutral-800 p-5 md:border-b-0 md:border-r">

                    <div className="text-xs font-black uppercase tracking-[0.24em] text-neutral-500">
                        Artists
                    </div>

                    <div className="mt-2 text-4xl font-black text-[#b7ff3c]">
                        {artists?.length ?? 0}
                    </div>

                </div>

                <div className="border-b border-neutral-800 p-5 md:border-b-0 md:border-r">

                    <div className="text-xs font-black uppercase tracking-[0.24em] text-neutral-500">
                        Products
                    </div>

                    <div className="mt-2 text-4xl font-black text-[#b7ff3c]">
                        {products?.length ?? 0}
                    </div>

                </div>

                <div className="p-5">

                    <div className="text-xs font-black uppercase tracking-[0.24em] text-neutral-500">
                        Orders
                    </div>

                    <div className="mt-2 text-4xl font-black text-[#b7ff3c]">
                        {orders?.length ?? 0}
                    </div>

                </div>

            </section>

            <section className="space-y-8 p-5 md:p-8">

            <TourDatesSection
                tourDates={tourDates ?? []}
                artists={
                    artistNames?.map(
                        (a) => a.display_name
                    ) ?? []
                }
            />

            {/* BACKSTAGE POLAROIDS */}

            <PolaroidsSection
                polaroids={polaroids ?? []}
            />

            {/* FAN SHOUTS */}

            <div className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">

                <div className="flex items-center justify-between mb-6">

                    <div>

                        <h2 className="text-2xl font-black uppercase tracking-tight">
                            Fan Shouts
                        </h2>

                        <p className="text-sm text-neutral-500 mt-1">
                            Reviews, comments and shout-outs from customers.
                        </p>

                    </div>

                    <div className="flex gap-3">

                        <div className="
                px-4
                py-2
                rounded-xl
                bg-red-500/10
                text-red-400
                border
                border-red-500/20
                font-semibold
            ">
                            {fanShouts?.length ?? 0} Total
                        </div>

                    </div>

                </div>

                <div className="mb-6 grid gap-px bg-neutral-800 p-px md:grid-cols-4">

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Published
                        </div>

                        <div className="text-3xl font-black mt-2 text-green-400">
                            {
                                fanShouts?.filter(
                                    x => x.is_published
                                ).length ?? 0
                            }
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Hidden
                        </div>

                        <div className="text-3xl font-black mt-2 text-yellow-400">
                            {
                                fanShouts?.filter(
                                    x => !x.is_published
                                ).length ?? 0
                            }
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Average Rating
                        </div>

                        <div className="text-3xl font-black mt-2">
                            {(
                                (fanShouts?.reduce(
                                    (sum, x) =>
                                        sum + (x.rating ?? 5),
                                    0
                                ) ?? 0)
                                /
                                Math.max(
                                    fanShouts?.length ?? 1,
                                    1
                                )
                            ).toFixed(1)}
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            5 Star Reviews
                        </div>

                        <div className="text-3xl font-black mt-2">
                            {
                                fanShouts?.filter(
                                    x => x.rating === 5
                                ).length ?? 0
                            }
                        </div>

                    </div>

                </div>

                <div className="space-y-4">

                    {fanShouts?.map((shout) => (

                        <div
                            key={shout.id}
                            className="
                    bg-neutral-950
                    border
                    border-neutral-800
                    rounded-xl
                    p-5
                "
                        >

                            <div className="flex justify-between items-start">

                                <div>

                                    <div className="font-bold text-lg">
                                        {shout.name}
                                    </div>

                                    <div className="text-sm text-neutral-500 mt-1">

                                        {new Date(
                                            shout.created_at
                                        ).toLocaleDateString(
                                            "en-AU",
                                            {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            }
                                        )}

                                    </div>

                                </div>

                                <div className="flex gap-2 items-center">

                                    <span className="
                            px-2
                            py-1
                            rounded-lg
                            bg-yellow-500/10
                            text-yellow-400
                            text-xs
                            font-semibold
                        ">
                                        {"★".repeat(
                                            shout.rating ?? 5
                                        )}
                                    </span>

                                    <span
                                        className={`
                                px-2
                                py-1
                                rounded-lg
                                text-xs
                                font-semibold
                                ${shout.is_published
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-neutral-700 text-neutral-300"
                                            }
                            `}
                                    >
                                        {shout.is_published
                                            ? "LIVE"
                                            : "HIDDEN"}
                                    </span>

                                </div>

                            </div>

                            <div className="mt-4 text-neutral-300 leading-relaxed">
                                {shout.text}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">

                                {shout.artists?.display_name && (
                                    <span className="
                            px-2
                            py-1
                            rounded-md
                            bg-red-500/10
                            text-red-400
                            text-xs
                            font-semibold
                        ">
                                        {shout.artists.display_name}
                                    </span>
                                )}

                                {shout.products?.title && (
                                    <span className="
                            px-2
                            py-1
                            rounded-md
                            bg-neutral-800
                            text-neutral-300
                            text-xs
                            font-semibold
                        ">
                                        {shout.products.title}
                                    </span>
                                )}

                            </div>

                        </div>

                    ))}

                    {fanShouts?.length === 0 && (

                        <div className="
                text-center
                py-12
                text-neutral-500
                border
                border-neutral-800
                rounded-xl
            ">
                            No fan shouts yet.
                        </div>

                    )}

                </div>

            </div>

            {/* NEWSLETTER */}

            <div className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">

                <div className="flex items-center justify-between mb-6">

                    <div>

                        <h2 className="text-2xl font-black uppercase tracking-tight">
                            Newsletter Subscribers
                        </h2>

                        <p className="text-sm text-neutral-500 mt-1">
                            Mailing list signups from across Merch Tent.
                        </p>

                    </div>

                    <div className="flex gap-3">

                        <div className="
                px-4
                py-2
                rounded-xl
                bg-green-500/10
                text-green-400
                border
                border-green-500/20
                font-semibold
            ">
                            {
                                subscribers?.filter(
                                    x => x.status === "subscribed"
                                ).length ?? 0
                            } Active
                        </div>

                    </div>

                </div>

                <div className="mb-6 grid gap-px bg-neutral-800 p-px md:grid-cols-4">

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Total Subscribers
                        </div>

                        <div className="text-3xl font-black mt-2">
                            {subscribers?.length ?? 0}
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Subscribed
                        </div>

                        <div className="text-3xl font-black mt-2 text-green-400">
                            {
                                subscribers?.filter(
                                    x => x.status === "subscribed"
                                ).length ?? 0
                            }
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Unsubscribed
                        </div>

                        <div className="text-3xl font-black mt-2 text-yellow-400">
                            {
                                subscribers?.filter(
                                    x => x.status === "unsubscribed"
                                ).length ?? 0
                            }
                        </div>

                    </div>

                    <div className="bg-black p-4">

                        <div className="text-xs text-neutral-500">
                            Bounced
                        </div>

                        <div className="text-3xl font-black mt-2 text-red-400">
                            {
                                subscribers?.filter(
                                    x => x.status === "bounced"
                                ).length ?? 0
                            }
                        </div>

                    </div>

                </div>

                <div className="overflow-x-auto border border-neutral-800">

                    <table className="w-full">

                        <thead className="bg-neutral-950">

                            <tr>

                                <th className="text-left p-4">
                                    Email
                                </th>

                                <th className="text-left p-4">
                                    Name
                                </th>

                                <th className="text-left p-4">
                                    Source
                                </th>

                                <th className="text-left p-4">
                                    Status
                                </th>

                                <th className="text-left p-4">
                                    Joined
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {subscribers?.map((subscriber) => (

                                <tr
                                    key={subscriber.id}
                                    className="
                            border-t
                            border-neutral-800
                            hover:bg-neutral-800/30
                        "
                                >

                                    <td className="p-4 font-medium">
                                        {subscriber.email}
                                    </td>

                                    <td className="p-4">
                                        {subscriber.name || "-"}
                                    </td>

                                    <td className="p-4">
                                        {subscriber.source || "-"}
                                    </td>

                                    <td className="p-4">

                                        <span
                                            className={`
                                    px-2
                                    py-1
                                    rounded-lg
                                    text-xs
                                    font-semibold
                                    ${subscriber.status === "subscribed"
                                                    ? "bg-green-500/20 text-green-400"
                                                    : subscriber.status === "unsubscribed"
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-red-500/20 text-red-400"
                                                }
                                `}
                                        >
                                            {subscriber.status.toUpperCase()}
                                        </span>

                                    </td>

                                    <td className="p-4 text-neutral-400">

                                        {new Date(
                                            subscriber.created_at
                                        ).toLocaleDateString("en-AU", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}

                                    </td>

                                </tr>

                            ))}

                            {subscribers?.length === 0 && (

                                <tr>

                                    <td
                                        colSpan={5}
                                        className="
                                text-center
                                p-12
                                text-neutral-500
                            "
                                    >
                                        No newsletter subscribers yet.
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

            </div>

            </section>
        </main>);
}
