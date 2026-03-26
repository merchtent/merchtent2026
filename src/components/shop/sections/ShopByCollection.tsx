"use client";
import tee_cat from '@/images/category_tee.png';
import hoodie_cat from '@/images/category_hoodie.png';
import tank_cat from '@/images/category_tank.png';
import Image from "next/image";
import { ChevronRight } from 'lucide-react';

export default function ShopByCollection() {
    return (
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
    )
}