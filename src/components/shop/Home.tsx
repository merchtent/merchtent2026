"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    ShoppingBag,
    Search,
    Menu,
    X,
    ChevronRight,
    ChevronLeft,
    Heart,
    Star,
    Music2,
    Globe,
    Ticket,
    Disc3,
    Flame,
    BadgePercent,
    ArrowUpRight,
    Sparkles,
    Scissors,
    Timer,
    Megaphone,
    Instagram,
    Twitter,
    Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

import spank from '@/images/spank_1.jpg';
import tee_cat from '@/images/category_tee.png';
import hoodie_cat from '@/images/category_hoodie.png';
import tank_cat from '@/images/category_tank.png';
import journal_img from '@/images/journal.png';

import Link from "next/link";
import FeaturedArtistsSection from "../FeaturedArtists";
import JoinTheList from "../JoinTheList";
import { ProductCard } from "./ProductCard";

// ============================================================
// BAND MERCH — "NOISE // NIGHT DRIVE" (maximum‑edgy edition)
// Influence: bootleg flyers, tour stickers, diagonal splits, torn edges,
// masonry merch wall, horizontal rails, countdown drop, second capsule.
// Tech: shadcn/ui, framer-motion, lucide-react, Tailwind, Next/Image.
// ============================================================

// ---------- Site Theme Helpers ----------
const brand = {
    name: "MERCH TENT",
    tagline: "Band Merch for local & unsigned bands",
    accent: "#ef4444", // tailwind red-500
};

const nav = [
    // { label: "New", href: "#new" },
    { label: "Tees", href: "/category/tees" },
    { label: "Hoodies", href: "/category/hoodies" },
    { label: "Artists", href: "/artists" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
];

const heroSlides = [
    {
        id: "s1",
        eyebrow: "NEW ALBUM",
        title: "Midnight Feedback",
        copy: "Limited first press • hand-numbered inserts",
        cta: "Shop the drop",
        image: "https://picsum.photos/id/1021/2000/1200",
        align: "left" as const,
    },
    {
        id: "s2",
        eyebrow: "WORLD TOUR",
        title: "Night Drive '25",
        copy: "Exclusive city tees – only online for a week",
        cta: "Grab your city tee",
        image: "https://picsum.photos/id/1005/2000/1200",
        align: "center" as const,
    },
    {
        id: "s3",
        eyebrow: "RESTOCK",
        title: "Classic Logo",
        copy: "Back in black. And bone.",
        cta: "See variants",
        image: "https://picsum.photos/id/1018/2000/1200",
        align: "right" as const,
    },
];

export type Product = {
    id: string;
    title: string;
    price: number;
    image: string;   // base front
    hover?: string;  // base back
    badge?: string;
    colors?: ProductColorVariant[]; // 👈 NOW rich
    kind?: "tee" | "hoodie" | "vinyl" | "cassette" | "poster" | "accessory";
    sizes: ["XS", "S", "M", "L", "XL"], // 👈 add this if the product should be sizeable
};

export type ProductColorVariant = {
    hex: string;
    label?: string | null;
    front?: string | null;
    back?: string | null;
};

// const products: Product[] = [
//     { id: "p1", title: "Tour Tee — Sydney", price: 45, image: "https://picsum.photos/id/1049/900/1200", hover: "https://picsum.photos/id/1050/900/1200", badge: "Limited", colors: ["#111111", "#E5E5E5"], kind: "tee" },
//     { id: "p2", title: "Classic Logo Tee", price: 39, image: "https://picsum.photos/id/1051/900/1200", hover: "https://picsum.photos/id/1052/900/1200", badge: "Bestseller", colors: ["#111111", "#f5f5f5"], kind: "tee" },
//     { id: "p3", title: "Midnight Feedback — Vinyl LP", price: 32, image: "https://picsum.photos/id/1069/900/1200", hover: "https://picsum.photos/id/1070/900/1200", colors: ["#111111"], kind: "vinyl" },
//     { id: "p4", title: "Logo Hoodie", price: 79, image: "https://picsum.photos/id/1055/900/1200", hover: "https://picsum.photos/id/1056/900/1200", badge: "New", colors: ["#111111", "#bdbdbd"], kind: "hoodie" },
//     { id: "p5", title: "Tour Poster — 18x24", price: 25, image: "https://picsum.photos/id/1081/900/1200", hover: "https://picsum.photos/id/1082/900/1200", colors: ["#111111", "#ffffff"], kind: "poster" },
//     { id: "p6", title: "Cassette — Smoke Shell", price: 16, image: "https://picsum.photos/id/1060/900/1200", hover: "https://picsum.photos/id/1061/900/1200", badge: "Tour Only", colors: ["#111111"], kind: "cassette" },
//     { id: "p7", title: "City Tee — Tokyo", price: 45, image: "https://picsum.photos/id/1074/900/1200", hover: "https://picsum.photos/id/1075/900/1200", colors: ["#111111", "#d1d1d1"], kind: "tee" },
//     { id: "p8", title: "City Tee — Melbourne", price: 45, image: "https://picsum.photos/id/1053/900/1200", hover: "https://picsum.photos/id/1054/900/1200", colors: ["#111111", "#E5E5E5"], kind: "tee" },
// ];

const products: Product[] = [

];

// // Second capsule
// const products2: Product[] = [
//     { id: "p9", title: "Asterisk Tee — Neon", price: 49, image: "https://picsum.photos/id/1010/900/1200", hover: "https://picsum.photos/id/1011/900/1200", badge: "Restock", colors: ["#111111", "#f5f5f5"], kind: "tee" },
//     { id: "p10", title: "Skate Deck — Logo", price: 99, image: "https://picsum.photos/id/1012/900/1200", hover: "https://picsum.photos/id/1013/900/1200", colors: ["#111111"], kind: "poster" },
//     { id: "p11", title: "Patches Trio", price: 25, image: "https://picsum.photos/id/1014/900/1200", hover: "https://picsum.photos/id/1015/900/1200", badge: "New", colors: ["#111111", "#E5E5E5"], kind: "accessory" },
//     { id: "p12", title: "Logo Beanie", price: 35, image: "https://picsum.photos/id/1016/900/1200", hover: "https://picsum.photos/id/1017/900/1200", colors: ["#111111", "#bdbdbd"], kind: "hoodie" },
//     { id: "p13", title: "Tour Tee — Berlin", price: 45, image: "https://picsum.photos/id/1018/900/1200", hover: "https://picsum.photos/id/1019/900/1200", colors: ["#111111", "#E5E5E5"], kind: "tee" },
//     { id: "p14", title: "Sticker/Pick Pack", price: 25, image: "https://picsum.photos/id/1020/900/1200", hover: "https://picsum.photos/id/1021/900/1200", badge: "Tour Only", colors: ["#111111"], kind: "accessory" },
//     { id: "p15", title: "Windbreaker — Classic", price: 104, image: "https://picsum.photos/id/1022/900/1200", hover: "https://picsum.photos/id/1023/900/1200", colors: ["#111111", "#d1d1d1"], kind: "hoodie" },
//     { id: "p16", title: "Women’s Baby Tee — Love", price: 57, image: "https://picsum.photos/id/1024/900/1200", hover: "https://picsum.photos/id/1025/900/1200", colors: ["#111111", "#f5f5f5"], kind: "tee" },
// ];

const collections = [
    { title: "New Tees", sub: "Fresh tour designs", image: "https://picsum.photos/id/1020/1600/1200", href: "#tees" },
    { title: "Vinyl & Cassettes", sub: "Spin the new record", image: "https://picsum.photos/id/1035/1600/1200", href: "#music" },
    { title: "Tour Exclusives", sub: "Drops from the road", image: "https://picsum.photos/id/1012/1600/1200", href: "#tour" },
];

const tourDates = [
    { date: "Nov 15", artist: "Spank the 90s", city: "Bendigo", venue: "Golden Vine Hotel", href: "https://www.facebook.com/events/1544058490109285" }
];

// ---------- Helper UI ----------
function GlitchText({ lines }: { lines: string[] }) {
    return (
        <div className="relative leading-[0.9] font-black select-none">
            {lines.map((t, i) => (
                <div key={i} className="relative inline-block mr-4 last:mr-0">
                    <motion.span
                        aria-hidden
                        className="absolute left-0 top-0 blur-[1px] opacity-50 text-red-500"
                        animate={{ x: [0, 2, -1, 0], y: [0, -1, 1, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.12 }}
                    >
                        {t}
                    </motion.span>
                    <motion.span
                        aria-hidden
                        className="absolute left-0 top-0 blur-[0.5px] opacity-40 text-cyan-400"
                        animate={{ x: [0, -2, 1, 0], y: [0, 1, -1, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                    >
                        {t}
                    </motion.span>
                    <span className="relative">{t}</span>
                </div>
            ))}
        </div>
    );
}


// ---------- Helper UI ----------
function Badge({ children }: { children: string }) {
    return (
        <span className="absolute top-3 left-3 bg-white/95 text-[11px] px-2 py-1 rounded-full tracking-wide shadow-sm">
            {children}
        </span>
    );
}

function ColorDot({ hex }: { hex: string }) {
    return (
        <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ backgroundColor: hex }}
        />
    );
}

function BootlegStamp() {
    return (
        <div className="pointer-events-none absolute -left-8 -top-4 rotate-[-12deg] text-[11px] font-black tracking-wider">
            <span className="bg-red-600 text-white px-3 py-1 rounded">LIMITED // 300</span>
        </div>
    );
}

function DropCountdown({ untilISO }: { untilISO: string }) {
    const [left, setLeft] = useState<string>("");
    useEffect(() => {
        const t = setInterval(() => {
            const d = Math.max(0, new Date(untilISO).getTime() - Date.now());
            const h = Math.floor(d / 3.6e6);
            const m = Math.floor((d % 3.6e6) / 6e4);
            const s = Math.floor((d % 6e4) / 1e3);
            setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
        }, 1000);
        return () => clearInterval(t);
    }, [untilISO]);
    return <span className="tabular-nums">{left}</span>;
}

// ---------- Slider Hook (arrows + dots) ----------
function useSlider(length: number, intervalMs = 6000) {
    const [i, setI] = useState(0);
    const next = () => setI((v) => (v + 1) % length);
    const prev = () => setI((v) => (v - 1 + length) % length);
    useEffect(() => {
        const t = setInterval(next, intervalMs);
        return () => clearInterval(t);
    }, [length, intervalMs]);
    return { i, setI, next, prev };
}

// ---------- Product Card (edgier) ----------
// function ProductCard({
//     p,
//     onQuickView,
//     onQuickAdd,
//     theme = "dark",
//     clipped = false,
// }: {
//     p: Product;
//     onQuickView: (p: Product) => void;
//     onQuickAdd: (p: Product) => void;
//     theme?: "dark" | "light";
//     clipped?: boolean;
// }) {
//     const cardClass =
//         theme === "light"
//             ? "group overflow-hidden bg-white text-neutral-900 border-neutral-200"
//             : "group overflow-hidden bg-neutral-950 text-neutral-100 border-neutral-800";
//     const priceText = theme === "light" ? "text-neutral-600" : "text-neutral-400";
//     const wishColor =
//         theme === "light"
//             ? "text-neutral-500 hover:text-neutral-800"
//             : "text-neutral-400 hover:text-white";

//     return (
//         <Card
//             className={`${cardClass} relative ${clipped ? "" : ""}`}
//             style={
//                 clipped
//                     ? { clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }
//                     : undefined
//             }
//         >
//             <div className="relative aspect-[3/4]">
//                 {/* CLICKABLE OVERLAY (now above images) */}
//                 <Link
//                     href={`/product/${p.id}`}
//                     aria-label={p.title}
//                     className="absolute inset-0 z-10"
//                 />

//                 {/* Images sit below the overlay */}
//                 <Image
//                     src={p.image}
//                     alt={p.title}
//                     fill
//                     className="relative z-0 object-cover transition-opacity duration-300 group-hover:opacity-0"
//                 />
//                 <Image
//                     src={p.hover}
//                     alt={`${p.title} alt`}
//                     fill
//                     className="relative z-0 object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
//                 />

//                 {p.badge && <Badge>{p.badge}</Badge>}

//                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
//                     <BootlegStamp />
//                 </div>

//                 {/* Buttons sit ABOVE the overlay so they still work */}
//                 <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
//                     <div className="flex gap-2 relative z-20">
//                         <Button
//                             size="sm"
//                             className="flex-1"
//                             onClick={(e) => {
//                                 e.preventDefault();
//                                 e.stopPropagation();
//                                 onQuickAdd(p);
//                             }}
//                         >
//                             Quick add
//                         </Button>
//                         <Button
//                             size="sm"
//                             variant="secondary"
//                             onClick={(e) => {
//                                 e.preventDefault();
//                                 e.stopPropagation();
//                                 onQuickView(p);
//                             }}
//                         >
//                             Quick view
//                         </Button>
//                     </div>
//                 </div>
//             </div>

//             <CardContent className="p-3 md:p-4">
//                 <div className="flex items-start justify-between gap-3">
//                     <div>
//                         <p className="text-sm md:text-base">{p.title}</p>
//                         <p className={`text-sm ${priceText}`}>${p.price.toFixed(2)}</p>
//                     </div>
//                     <button aria-label="Wishlist" className={`p-1 ${wishColor}`}>
//                         <Heart className="h-4 w-4" />
//                     </button>
//                 </div>
//                 {p.colors && (
//                     <div className="mt-2 flex items-center gap-2">
//                         {p.colors.map((c, i) => (
//                             <ColorDot key={i} hex={c} />
//                         ))}
//                     </div>
//                 )}
//             </CardContent>
//         </Card>
//     );
// }

function EditorsRail({
    onQuickAdd,
    onQuickView,
    fallback = [],
}: {
    onQuickAdd: (p: Product) => void;
    onQuickView: (p: Product) => void;
    fallback?: Product[];
}) {
    const [list, setList] = useState<Product[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch("/api/products/editors", { cache: "no-store" });
                const json = await res.json();
                if (mounted) setList(Array.isArray(json.products) ? json.products : []);
            } catch {
                if (mounted) setList([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const data = (list && list.length ? list : fallback) as Product[];

    return (
        <div className="overflow-x-auto no-scrollbar pb-6 h-full">
            <div className="flex gap-4 pr-4 items-stretch min-h-[320px] h-full">
                {loading && (!list || list.length === 0) &&
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="min-w-[220px] max-w-[220px] h-full">
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 h-80 w-[220px] animate-pulse" />
                        </div>
                    ))
                }

                {data.map((p, idx) => (
                    <div
                        key={p.id}
                        className={`min-w-[270px] max-w-[270px] min-h-[320px] ${idx % 2 ? "rotate-2" : "-rotate-2"
                            } transition-transform`}
                    >
                        <div className="h-full">
                            <ProductCard
                                p={p}
                                // onQuickAdd={onQuickAdd}
                                // onQuickView={onQuickView}
                                theme={idx % 2 ? "light" : "dark"}
                                clipped={idx % 3 === 0}
                                sizeTone="dark"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}



// ---- Bundle Builder (choose 3 tees for A$99) ----
// function BundleBuilder() {
//     const tees = products.filter(p => p.kind === 'tee');
//     const [picked, setPicked] = useState<string[]>([]);
//     function toggle(id: string) { setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev); }
//     const count = picked.length;
//     const sum = tees.filter(t => picked.includes(t.id)).reduce((a, b) => a + b.price, 0);
//     const price = count === 3 ? 99 : sum;
//     return (
//         <div>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
//                 {tees.map((t, i) => (
//                     <label key={t.id} className={`relative cursor-pointer ${picked.includes(t.id) ? 'ring-2 ring-red-500' : ''}`}>
//                         <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-neutral-800">
//                             <Image src={t.image} alt={t.title} fill className="object-cover" />
//                             <input type="checkbox" className="absolute inset-0 opacity-0" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} />
//                             <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs bg-neutral-950/70 px-2 py-1 rounded">
//                                 <span className="truncate">{t.title}</span>
//                                 <span>${t.price.toFixed(0)}</span>
//                             </div>
//                         </div>
//                     </label>
//                 ))}
//             </div>
//             <div className="mt-4 flex items-center justify-between">
//                 <p className="text-sm text-neutral-300">Selected: <span className="font-semibold">{count}/3</span> {count === 3 && <span className="ml-2 inline-block px-2 py-0.5 text-[11px] rounded bg-red-600 text-white">BUNDLE READY</span>}</p>
//                 <div className="flex items-center gap-3">
//                     <p className="text-lg font-semibold">Total: ${price.toFixed(0)}</p>
//                     <Button disabled={count !== 3}>Add bundle</Button>
//                 </div>
//             </div>
//         </div>
//     );
// }

export default function BandMerchOnePage() {
    // const [cart, setCart] = useState<{ id: string; title: string; price: number; qty: number }[]>([]);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [quickView, setQuickView] = useState<Product | null>(null);
    const { i, setI, next, prev } = useSlider(heroSlides.length, 7000);

    // const subtotal = useMemo(() => cart.reduce((s, li) => s + li.price * li.qty, 0), [cart]);

    // function addToCart(p: Product, qty = 1) {
    //     setCart((c) => {
    //         const ex = c.find((x) => x.id === p.id);
    //         if (ex) return c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + qty } : x));
    //         return [...c, { id: p.id, title: p.title, price: p.price, qty }];
    //     });
    // }

    // function removeFromCart(id: string) {
    //     setCart((c) => c.filter((i) => i.id !== id));
    // }

    return (
        <div>
            {/* EDGY HERO — split layout, oversized type, sticker */}
            <section className="relative border-b border-neutral-800">
                <div className="grid md:grid-cols-2 min-h-[50vh]">
                    {/* Image first on mobile, second on desktop */}
                    <div className="relative order-1 md:order-2">
                        {/* Mobile: intrinsic (no fill) */}
                        <div className="relative md:hidden">
                            <Image src={spank} alt="Hero" priority />
                        </div>

                        {/* Desktop: fill */}
                        <div className="relative hidden md:block md:min-h-[70vh] overflow-visible">
                            <Image
                                src={spank}
                                alt="Hero"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>

                        <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
                        <div className="absolute top-6 right-6">
                            <div className="h-16 w-16 rounded-full bg-red-600 grid place-items-center text-white font-black text-xl rotate-[15deg]">★</div>
                        </div>
                    </div>

                    {/* Text second on mobile, first on desktop */}
                    <div className="relative order-2 md:order-1 flex items-start md:items-center justify-center md:justify-end p-8 md:p-14">
                        <div className="max-w-xl">
                            <p className="uppercase tracking-[0.3em] text-xs text-red-400">SPANK THE 90s Tour '25</p>
                            <h1 className="mt-3 leading-[0.9] text-5xl md:text-7xl font-black">
                                <GlitchText lines={["GET", "YOUR", "SPANK", "ON  "]} />
                            </h1>
                            <p className="mt-4 text-neutral-300">Warning, these merch items might increase spanking!</p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button asChild><a href="/artists/spank-the-90s">Shop Spank the 90s</a></Button>
                                <Button variant="secondary" asChild><a href="/artists/spank-the-90s">View Merch</a></Button>
                            </div>
                        </div>

                        {/* Sticker */}
                        <div className="absolute -top-6 left-[-500px] md:top-6 md:left-0 rotate-[-12deg]">
                            <div className="bg-white text-neutral-900 px-3 py-2 rounded-full shadow-md border border-neutral-200 text-xs font-semibold">
                                MERCH TENT EXCLUSIVE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative h-6 overflow-hidden">
                    <div className="absolute inset-0 -skew-y-3 bg-neutral-950 border-b border-neutral-800" />
                </div>
            </section>


            {/* COLLECTION STRIP */}
            {/* <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <h2 className="text-xl md:text-2xl font-semibold mb-6">Shop by artist collection</h2>
                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                    {collections.map((c) => (
                        <a key={c.title} href={c.href} className="group relative rounded-2xl overflow-hidden border border-neutral-800">
                            <Image src={c.image} alt={c.title} width={1600} height={1200} className="h-64 md:h-80 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <p className="text-xl md:text-2xl font-black tracking-tight">{c.title}</p>
                                <p className="text-xs md:text-sm opacity-90">{c.sub}</p>
                                <span className="inline-flex items-center text-sm opacity-90 mt-1">Shop now <ChevronRight className="ml-1 h-4 w-4" /></span>
                            </div>
                            <div className="absolute -right-10 top-6 rotate-12 bg-red-600 text-white text-xs px-3 py-1 font-bold">Featured</div>
                        </a>
                    ))}
                </div>
            </section> */}

            <FeaturedArtistsSection />




            {/* ANGLED PROMO RAIL */}
            <section className="relative py-0">
                <div className="-skew-y-3 bg-neutral-100 text-neutral-900 border-y border-neutral-200">
                    <div className="skew-y-3 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 grid md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2">
                            <h3 className="text-3xl md:text-5xl font-black leading-[0.95]">
                                OPENING SALE // LIVE
                            </h3>
                            <p className="mt-2 text-neutral-700">
                                Fresh drops only. Limited-time launch pricing on brand-new merch.
                            </p>

                        </div>
                        <div className="flex md:justify-end gap-3">
                            <Button asChild><a href="category/tees" className="inline-flex items-center"><BadgePercent className="h-4 w-4 mr-2" /> See Tees</a></Button>
                            <Button variant="secondary" asChild><a href="/new" className="inline-flex items-center"><Megaphone className="h-4 w-4 mr-2" /> New this week</a></Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* COUNTDOWN DROP BAR */}
            {/* <section className="bg-red-600 text-white py-3 border-y border-red-700/50">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm">
                    <span className="font-medium inline-flex items-center gap-2"><Flame className="h-4 w-4" /> 24H FLASH DROP</span>
                    <span className="opacity-90 inline-flex items-center gap-2"><Timer className="h-4 w-4" /> <DropCountdown untilISO="2025-11-01T00:00:00" /></span>
                </div>
            </section> */}

            {/* MASONRY MERCH WALL */}
            {/* <section id="grid" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="text-xl md:text-3xl font-black tracking-tight">Latest Drop</h2>
                        <p className="text-sm text-neutral-400">Graphic tees, vinyl, posters & more</p>
                    </div>
                    <a href="#" className="text-sm underline">View all</a>
                </div>
                <div className="[column-fill:_balance]_columns-2 md:columns-3 lg:columns-4 gap-4">
                    {products.map((p, i) => (
                        <div key={p.id} className="mb-4 break-inside-avoid">
                            <ProductCard p={p} onQuickAdd={(x) => addToCart(x)} onQuickView={(x) => setQuickView(x)} theme={i % 3 === 0 ? "light" : "dark"} clipped={i % 4 === 0} />
                        </div>
                    ))}
                </div>
            </section> */}

            {/* MASONRY MERCH WALL (live from Supabase) */}
            <section id="grid" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="text-xl md:text-3xl font-black tracking-tight">Latest Drop</h2>
                        <p className="text-sm text-neutral-400">Graphic tees, vinyl, posters & more</p>
                    </div>
                    <a href="/new" className="text-sm underline">View all</a>
                </div>

                {/* Ideally pull this into its own component, but keeping your pattern */}
                {(() => {
                    const [live, setLive] = useState<Product[] | null>(null);
                    const [loading, setLoading] = useState(true);

                    useEffect(() => {
                        let mounted = true;
                        (async () => {
                            try {
                                const res = await fetch("/api/products", { cache: "no-store" });
                                const json = await res.json();
                                if (mounted) setLive(Array.isArray(json.products) ? json.products : []);
                            } catch {
                                if (mounted) setLive([]);
                            } finally {
                                if (mounted) setLoading(false);
                            }
                        })();
                        return () => {
                            mounted = false;
                        };
                    }, []);

                    const list = (live && live.length > 0 ? live : products).slice(0, 8);

                    if (loading && (!live || live.length === 0)) {
                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 h-64 animate-pulse" />
                                ))}
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {list.map((p, i) => (
                                <div key={p.id}>
                                    <ProductCard
                                        p={p}
                                        theme="light"
                                        clipped={i % 2 === 0}
                                        sizeTone="dark"
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </section>

            <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
                <h2 className="text-xl md:text-2xl font-semibold mb-6">Shop by collection</h2>
                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                    {[
                        {
                            title: "Tees",
                            sub: "Fresh tour designs",
                            image: tee_cat,
                            href: "/category/tees",
                        },
                        {
                            title: "Hoodies",
                            sub: "Heavyweight & warm",
                            image: hoodie_cat,
                            href: "/category/hoodies",
                        },
                        // {
                        //     title: "Tank Tops",
                        //     sub: "Cut for the pit",
                        //     image: tank_cat,
                        //     href: "/category/tank-tops",
                        // },
                    ].map((c) => (
                        <a
                            key={c.title}
                            href={c.href}
                            className="group relative rounded-2xl overflow-hidden border border-neutral-800"
                        >
                            <Image
                                src={c.image}
                                alt={c.title}
                                width={1600}
                                height={1200}
                                className="h-64 md:h-80 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <p className="text-xl md:text-2xl font-black tracking-tight">{c.title}</p>
                                <p className="text-xs md:text-sm opacity-90">{c.sub}</p>
                                <span className="inline-flex items-center text-sm opacity-90 mt-1">
                                    Shop now <ChevronRight className="ml-1 h-4 w-4" />
                                </span>
                            </div>
                            <div className="absolute -right-0 top-6 rotate-12 bg-red-600 text-white text-xs px-3 py-1 font-bold">
                                Category
                            </div>
                        </a>
                    ))}
                </div>
            </section>


            {/* SPLIT PROMO — checker + bold type */}
            {/* <section className="relative">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(0deg,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 grid md:grid-cols-3 gap-6 items-stretch">
                    <div className="md:col-span-2 rounded-2xl overflow-hidden relative border border-neutral-800">
                        <Image src={journal_img} alt="Festival Gig" width={250} height={650} className="w-full h-72 md:h-full object-cover" />
                        <div className="absolute bottom-4 left-4 bg-neutral-900/80 text-white px-4 py-2 rounded-full text-xs font-semibold">Gig Vibes</div>
                    </div>
                    <div className="rounded-2xl border border-neutral-800 p-6 flex flex-col justify-between bg-neutral-950">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-neutral-400">Journal</p>
                            <h3 className="text-2xl md:text-3xl font-black mt-2">We’re Live! Official Merch Tent Launch</h3>
                            <p className="mt-3 text-neutral-300">
                                You can now grab all the gear you’ve been asking for: tees, hoodies, hats, posters from your favourite local bands.
                            </p>
                            <p className="mt-3 text-neutral-300">
                                This is your one-stop shop to rep the band wherever you go. We’ll be adding new drops, limited editions, and exclusive tour merch soon, so keep your eyes peeled.
                            </p>
                            <p className="mt-3 text-neutral-300">
                                Merch Tent is a platform built for bands by people who love music and merch. We’re here to make sure you get the best quality gear while supporting the artists you care about.
                            </p>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* ANGLED PROMO RAIL */}
            {/* <section className="relative py-0">
                <div className="-skew-y-3 bg-neutral-100 text-neutral-900 border-y border-neutral-200">
                    <div className="skew-y-3 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 grid md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2">
                            <h3 className="text-3xl md:text-5xl font-black leading-[0.95]">BOOTLEG SALE // 24H</h3>
                            <p className="mt-2 text-neutral-700">Old tour stock. Misprints. One-offs. Blink and you miss it.</p>
                        </div>
                        <div className="flex md:justify-end gap-3">
                            <Button asChild><a href="#sale" className="inline-flex items-center"><BadgePercent className="h-4 w-4 mr-2" /> See markdowns</a></Button>
                            <Button variant="secondary" asChild><a href="#grid" className="inline-flex items-center"><Megaphone className="h-4 w-4 mr-2" /> New this week</a></Button>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* TILTED PRODUCT RAIL */}
            {/* <section className="py-10 md:py-14">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-6">
                        <h3 className="text-xl md:text-2xl font-black">Editor’s Picks</h3>
                        <a href="#" className="text-sm underline">View all</a>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex gap-4 pr-4">
                            {products2.map((p, idx) => (
                                <div key={p.id} className={`min-w-[220px] max-w-[220px] ${idx % 2 ? 'rotate-2' : '-rotate-2'} transition-transform`}>
                                    <ProductCard p={p} onQuickAdd={addToCart} onQuickView={setQuickView} theme={idx % 2 ? 'light' : 'dark'} clipped={idx % 3 === 0} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section> */}

            <section className="py-10 md:py-14">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-6">
                        <h3 className="text-xl md:text-2xl font-black">Editor’s Picks</h3>
                        <a href="/editors" className="text-sm underline">View all</a>
                    </div>

                    <EditorsRail
                        onQuickAdd={(p) => (1 + 1)} // addToCart
                        onQuickView={(p) => (1 + 1)} // setQuickView
                        fallback={products} // optional fallback to your temp set
                    />
                </div>
            </section>

            {/* MIXTAPE BUNDLE (3 for 99) */}
            {/* <section id="bundle" className="relative py-10 md:py-14 border-y border-neutral-800 bg-neutral-900">
                <div className="absolute inset-x-0 -top-6 h-6 bg-neutral-950" style={{ clipPath: 'polygon(0 0,100% 100%,0 100%)' }} />
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl md:text-2xl font-black">Mixtape Bundle — pick any 3 tees for A$99</h3>
                        <span className="text-xs text-neutral-400">Auto‑applies at checkout</span>
                    </div>
                    <BundleBuilder />
                </div>
                <div className="absolute inset-x-0 -bottom-6 h-6 bg-neutral-950" style={{ clipPath: 'polygon(0 0,100% 0,100% 100%)' }} />
            </section> */}

            {/* CITY SERIES (horizontal) */}
            {/* <section className="py-10 md:py-14">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <h3 className="text-lg font-semibold mb-4">City Series</h3>
                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex gap-4 pr-4">
                            {['Melbourne', 'Sydney', 'Tokyo', 'Berlin', 'LA', 'London', 'Toronto'].map((city, i) => (
                                <div key={city} className="relative min-w-[240px] rounded-xl overflow-hidden border border-neutral-800">
                                    <Image src={`https://picsum.photos/seed/city-${i}/600/400`} alt={city} width={600} height={400} className="h-40 w-[240px] object-cover" />
                                    <div className="absolute inset-0 bg-black/30" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white"><span className="font-medium">{city}</span><span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">Drop</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section> */}

            {/* CHAOS COLLAGE (angled tiles) */}
            {/* <section className="py-10 md:py-14">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <h3 className="text-xl md:text-2xl font-black mb-6">Backstage Polaroids</h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 auto-rows-[120px] gap-3 md:gap-4">
                        {Array.from({ length: 18 }).map((_, i) => {
                            const span = i % 7 === 0 ? 'md:row-span-3 md:col-span-2' : i % 5 === 0 ? 'md:row-span-2' : i % 4 === 0 ? 'md:col-span-2' : '';
                            const rot = i % 2 ? 'rotate-2' : '-rotate-2';
                            return (
                                <div key={i} className={`relative rounded-xl overflow-hidden border border-neutral-800 ${span} ${rot}`}>
                                    <Image src={`https://picsum.photos/seed/pol-${i}/600/600`} alt="Polaroid" fill className="object-cover" />
                                    <div className="absolute bottom-2 left-2 text-[10px] bg-neutral-950/80 px-2 py-0.5 rounded">#{i + 1}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section> */}

            {/* TOUR DATES STRIP */}
            <section id="tour" className="bg-neutral-900 py-12 md:py-16 border-y border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6"><h2 className="text-xl md:text-2xl font-semibold">Tour Dates</h2></div>
                    <div className="grid md:grid-cols-4 gap-4 md:gap-6">
                        {tourDates.map((t, i) => (
                            <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                                <p className="text-red-400 text-sm font-semibold">{t.date}</p>
                                <p className="mt-1 text-lg font-medium">{t.artist}</p>
                                <p className="text-sm text-neutral-400">{t.venue}, {t.city}</p>
                                <Button asChild className="mt-4 w-full">
                                    <a href={t.href} target="_blank" rel="noopener noreferrer">
                                        <Ticket className="h-4 w-4 mr-2" /> Tickets
                                    </a>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAN SHOUTS / REVIEWS */}
            <section className="bg-neutral-950 py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-semibold">Fan shouts</h2>
                        <div className="flex items-center gap-1 text-amber-400"><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /><Star className="h-4 w-4 fill-current" /></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                        {[
                            { name: "@markw", text: "Quality tees. Packaging was ace." },
                            { name: "Azza", text: "Print feels soft, not plasticky. Sick mate." },
                            { name: "Mauro ", text: "Love the design. Wear it all the time." },
                        ].map((t, i) => (
                            <div key={i} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6">
                                <p className="text-sm text-neutral-300">“{t.text}”</p>
                                <p className="mt-3 text-sm font-medium">{t.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* EMAIL SIGNUP */}
            {/* <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 text-center">
                <h3 className="text-2xl font-semibold">Join the list</h3>
                <p className="mt-2 text-neutral-300">First dibs on drops, presales & secret shows.</p>
                <form onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing!"); }} className="mt-5 flex gap-2 max-w-lg mx-auto">
                    <Input type="email" placeholder="Email address" required className="h-11 bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500" />
                    <Button type="submit" className="h-11 px-6">Subscribe</Button>
                </form>
            </section> */}
            <JoinTheList />

            {/* FOOTER */}
            {/* <footer className="border-t border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 grid md:grid-cols-4 gap-8 text-sm">
                    <div><p className="font-black tracking-[0.25em]">{brand.name}</p><p className="mt-3 text-neutral-400 max-w-xs">{brand.tagline}</p></div>
                    <div><p className="font-medium">Shop</p>
                        <ul className="mt-3 space-y-2 text-neutral-400">
                            {nav.slice(0, 5).map((n) => (<li key={n.label}><a href={n.href}>{n.label}</a></li>))}</ul></div>
                    <div><p className="font-medium">Support</p><ul className="mt-3 space-y-2 text-neutral-400"><li><a href="/about">About</a></li><li><a href="/shipping-and-returns">Shipping & returns</a></li><li><a href="size-guide">Size guide</a></li><li><a href="/contact  ">Contact us</a></li></ul></div>
                    <div><p className="font-medium">Follow</p><ul className="mt-3 space-y-2 text-neutral-400"><li><a
                        href="https://www.instagram.com/merchtent.au/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Instagram
                    </a>
                    </li></ul></div>
                </div>
                <div className="border-t border-neutral-800 py-6 text-xs text-neutral-500 text-center">© {new Date().getFullYear()} {brand.name} — All rights reserved.</div>
            </footer> */}

            {/* QUICK VIEW (Sheet) */}
            {/* <Sheet open={!!quickView} onOpenChange={(open) => !open && setQuickView(null)}>
                <SheetContent side="right" className="w-full max-w-lg">
                    <SheetHeader>
                        <SheetTitle>{quickView?.title}</SheetTitle>
                        <SheetDescription>Explore details and add to bag.</SheetDescription>
                    </SheetHeader>
                    {quickView && (
                        <div className="mt-6 grid md:grid-cols-2 gap-6">
                            <div className="relative rounded-2xl overflow-hidden h-72 md:h-96">
                                <Image src={quickView.image} alt={quickView.title} fill className="object-cover" />
                            </div>
                            <div>
                                <p className="text-lg font-medium">${quickView.price.toFixed(2)}</p>
                                {quickView.colors && (
                                    <div className="mt-4"><p className="text-sm mb-2">Color</p><div className="flex gap-2">{quickView.colors.map((c, i) => (<ColorDot key={i} hex={c} />))}</div></div>
                                )}
                                <div className="mt-6 grid grid-cols-4 gap-2">{"XS,S,M,L".split(",").map((s) => (<Button key={s} variant="secondary">{s}</Button>))}</div>
                                <div className="mt-6 flex gap-2"><Button className="flex-1">Add to bag</Button><Button variant="secondary" className="flex-1" onClick={() => setQuickView(null)}>Continue browsing</Button></div>
                                <div className="mt-6 text-sm text-neutral-600"><p>• Free express over $100</p><p>• Easy 30‑day returns</p></div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet> */}
        </div>
    );
}
