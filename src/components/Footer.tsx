import Link from "next/link";
import { ArrowRight, Instagram, Music2, Shirt, Sparkles, UserPlus } from "lucide-react";

const brand = {
    name: "MERCH TENT",
    tagline: "Artist-first merch. Fan-backed drops. No boxes before demand.",
};

const shopNav = [
    { label: "New drops", href: "/new" },
    { label: "Tees", href: "/category/tees" },
    { label: "Hoodies", href: "/category/hoodies" },
    { label: "Hats", href: "/category/hats" },
    { label: "Tank Tops", href: "/category/tanks" },
    { label: "Artists", href: "/artists" },
];

const platformNav = [
    { label: "Product designer", href: "/dashboard/products/designer" },
    { label: "How artists launch", href: "/start" },
    { label: "Fan accounts", href: "/auth/sign-up" },
    { label: "Merch credits", href: "/account" },
];

const supportNav = [
    { label: "Shipping & Returns", href: "/shipping-and-returns" },
    { label: "Size guide", href: "/size-guide" },
    { label: "Contact us", href: "/contact" },
    { label: "Sustainability", href: "/sustainability" },
];

const legalNav = [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
];

export default function Footer() {
    return (
        <footer className="site-shell-footer border-t border-neutral-800 bg-black text-white">
            <div className="grid border-b border-neutral-800 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="border-b border-neutral-800 p-5 md:p-7 lg:border-b-0 lg:border-r">
                    <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-lime-300">
                                {brand.name}
                            </p>
                            <h2 className="mt-3 max-w-3xl text-3xl font-black uppercase leading-none md:text-5xl">
                                Build the drop. Back the band.
                            </h2>
                        </div>
                        <span className="border border-lime-300/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">
                            Built after checkout
                        </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        {brand.tagline} Artists can create merch, fans can discover the scene, and every order keeps
                        the product story moving.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/auth/sign-up?type=artist"
                            className="group flex min-h-24 items-center justify-between gap-4 border border-red-500 bg-red-600 p-4 text-white transition hover:bg-red-500"
                        >
                            <Music2 className="h-6 w-6 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xl font-black uppercase leading-none">
                                    Sign up as artist
                                </p>
                                <p className="mt-2 text-xs font-bold leading-5 text-red-50">
                                    Design products, publish drops, sell without stock risk.
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                        </Link>

                        <Link
                            href="/auth/sign-up?type=fan"
                            className="group flex min-h-24 items-center justify-between gap-4 border border-lime-300/60 bg-lime-300 p-4 text-black transition hover:bg-lime-200"
                        >
                            <UserPlus className="h-6 w-6 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xl font-black uppercase leading-none">
                                    Sign up as fan
                                </p>
                                <p className="mt-2 text-xs font-bold leading-5 text-black/70">
                                    Track orders, save artists, earn merch credits.
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2">
                    <FooterColumn title="Shop" links={shopNav} icon={<Shirt className="h-4 w-4 text-lime-300" />} />
                    <FooterColumn title="Platform" links={platformNav} icon={<Sparkles className="h-4 w-4 text-lime-300" />} />
                    <FooterColumn title="Support" links={supportNav} />
                    <div className="border-b border-r border-neutral-800 p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neutral-500">
                            Social
                        </p>
                        <div className="mt-4 grid gap-3">
                            <Link
                                href="https://www.instagram.com/merchtent.au/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-bold text-neutral-300 hover:border-lime-300 hover:text-white"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Instagram className="h-4 w-4 text-lime-300" />
                                    Instagram
                                </span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/artists"
                                className="inline-flex items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-bold text-neutral-300 hover:border-lime-300 hover:text-white"
                            >
                                Latest artists
                                <ArrowRight className="h-4 w-4 text-lime-300" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 px-4 py-5 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between md:px-8">
                <p>
                    © {new Date().getFullYear()} {brand.name}. All rights reserved.
                </p>
                <div className="flex flex-wrap gap-4">
                    {legalNav.map((item) => (
                        <Link key={item.label} href={item.href} className="hover:text-white">
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({
    title,
    links,
    icon,
}: {
    title: string;
    links: { label: string; href: string }[];
    icon?: React.ReactNode;
}) {
    return (
        <div className="border-b border-r border-neutral-800 p-5">
            <div className="flex items-center gap-2">
                {icon}
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neutral-500">
                    {title}
                </p>
            </div>
            <ul className="mt-4 space-y-2.5">
                {links.map((item) => (
                    <li key={item.label}>
                        <Link href={item.href} className="text-sm font-bold text-neutral-300 hover:text-lime-300">
                            {item.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
