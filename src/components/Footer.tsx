const brand = {
    name: "MERCH TENT",
    tagline: "Band Merch for local & unsigned bands",
    accent: "#ef4444", // tailwind red-500
};

const nav = [
    // { label: "New", href: "#new" },
    { label: "Tees", href: "/category/tees" },
    { label: "Hoodies", href: "/category/hoodies" },
    { label: "Artists", href: "/artists" }
];

const aboutNav = [
    { label: "About", href: "/about" },
    { label: "Sustainability", href: "/sustainability" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
];

import React from 'react'

const Footer = () => {
    return (
        <footer className="border-t border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 grid md:grid-cols-4 gap-8 text-sm">
                <div><p className="font-black tracking-[0.25em]">{brand.name}</p><p className="mt-3 text-neutral-400 max-w-xs">{brand.tagline}</p></div>
                <div><p className="font-medium">Shop</p>
                    <ul className="mt-3 space-y-2 text-neutral-400">
                        {nav.slice(0, 5).map((n) => (<li key={n.label}><a href={n.href}>{n.label}</a></li>))}</ul></div>
                <div><p className="font-medium">Support</p><ul className="mt-3 space-y-2 text-neutral-400"><li><a href="/shipping-and-returns">Shipping & Returns</a></li><li><a href="size-guide">Size guide</a></li><li><a href="/contact  ">Contact us</a></li></ul></div>
                {/* <div><p className="font-medium">About</p><ul className="mt-3 space-y-2 text-neutral-400"><li><a
                    href="https://www.instagram.com/merchtent.au/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Instagram
                </a>
                </li></ul></div> */}
                <div><p className="font-medium">About Us</p>
                    <ul className="mt-3 space-y-2 text-neutral-400">
                        {aboutNav.slice(0, 5).map((n) => (<li key={n.label}><a href={n.href}>{n.label}</a></li>))}</ul></div>
            </div>
            <div className="border-t border-neutral-800 py-6 text-xs text-neutral-500 text-center">© {new Date().getFullYear()} {brand.name} — All rights reserved.</div>
        </footer>
    )
}

export default Footer