import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Disc3, Home, Search, Store } from "lucide-react";

const routes = [
    {
        label: "Shop new drops",
        href: "/new",
        icon: Store,
    },
    {
        label: "Find artists",
        href: "/artists",
        icon: Disc3,
    },
    {
        label: "Start a drop",
        href: "/start",
        icon: ArrowRight,
    },
];

export default function NotFound() {
    return (
        <main className="bg-black text-white">
            <section className="relative min-h-[calc(100vh-6rem)] overflow-hidden border-b border-neutral-800">
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1800&q=80"
                        alt="Crowd at a live music show"
                        fill
                        sizes="100vw"
                        className="object-cover opacity-55"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/72 to-black/20" />
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-25" />
                </div>

                <div className="relative z-10 grid min-h-[calc(100vh-6rem)] lg:grid-cols-[1fr_0.74fr]">
                    <div className="flex flex-col justify-end border-b border-neutral-800 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="inline-flex w-fit bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]">
                            Page not found
                        </p>
                        <h1 className="mt-5 max-w-5xl text-[6.5rem] font-black uppercase leading-[0.76] md:text-[11rem]">
                            404
                        </h1>
                        <h2 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.9] md:text-7xl">
                            This drop left the table.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-neutral-200">
                            The link is dead, the route moved, or the merch never made it to the rack.
                            Head back into the scene and find something live.
                        </p>
                    </div>

                    <aside className="grid content-between gap-6 bg-black/72 p-5 backdrop-blur md:p-8">
                        <div className="border border-neutral-800 bg-neutral-950 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-500">
                                        Lost signal
                                    </p>
                                    <p className="mt-3 text-3xl font-black uppercase leading-none">
                                        Try one of these instead.
                                    </p>
                                </div>
                                <div className="grid h-12 w-12 shrink-0 place-items-center bg-red-600">
                                    <Search className="h-6 w-6" />
                                </div>
                            </div>

                            <div className="mt-8 grid gap-3">
                                {routes.map((route) => {
                                    const Icon = route.icon;
                                    return (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            className="group flex items-center justify-between border border-neutral-800 bg-black p-4 hover:border-red-500"
                                        >
                                            <span className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.1em]">
                                                <Icon className="h-4 w-4 text-red-400" />
                                                {route.label}
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-red-400 transition group-hover:translate-x-1" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <Link
                            href="/"
                            className="inline-flex w-full items-center justify-center gap-2 bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.1em] text-white hover:bg-red-500"
                        >
                            <Home className="h-4 w-4" />
                            Back to homepage
                        </Link>
                    </aside>
                </div>
            </section>
        </main>
    );
}
