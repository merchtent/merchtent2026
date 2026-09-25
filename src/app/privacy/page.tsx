import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "How Merch Tent collects, uses and protects customer and artist information.",
    alternates: { canonical: "/privacy" },
};

export const revalidate = 60;

const sections = [
    ["What we collect", "Account details, order details, shipping information, artist profile content, uploaded assets and basic analytics about how the platform is used."],
    ["How we use it", "We use information to process orders, run artist accounts, support payouts, improve the platform, send service updates and send marketing only where permitted."],
    ["Who helps us run it", "We work with trusted providers for payments, printing, fulfilment, email, hosting and analytics. We do not sell personal information."],
    ["Security", "We use secured services and encrypted transport. No online service is risk-free, but we keep access limited to what is needed to operate Merch Tent."],
    ["Product and artwork retention", "Deleted products can be restored as drafts for 14 days. Original artwork remains protected while linked products are live, draft or within that recovery period. After every linked product has passed its recovery period, the artist can permanently remove the original upload in the Artwork Gallery. Separate order, payment, production and legal records may be retained where reasonably required, and temporary backup copies expire through normal backup cycles."],
    ["Cookies", "Cookies and similar tools help keep sessions working, understand traffic and improve product discovery. Browser settings can limit cookies, but some features may be affected."],
    ["Your choices", "You can contact us to request access, correction or deletion where available under applicable law."],
];

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Legal</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Privacy policy.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        How Merch Tent collects, uses and protects information when fans shop and artists run their stores.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.75fr_1.25fr] md:px-8 md:py-16">
                <aside className="border border-white/10 bg-black p-6">
                    <ShieldCheck className="h-8 w-8 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-4xl font-black uppercase leading-[0.9]">
                        We keep data tied to the job it does.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                        Orders need delivery data. Artist accounts need profile and payout context. We keep the policy readable so the trust part is not buried.
                    </p>
                    <a href="mailto:privacy@merchtent.com.au" className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase text-[#b6ff3f]">
                        <Mail className="h-4 w-4" /> privacy@merchtent.com.au
                    </a>
                </aside>

                <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
                    {sections.map(([title, body]) => (
                        <article key={title} className="bg-[#f4f1e8] p-6 text-black">
                            <LockKeyhole className="h-6 w-6 text-[#477a00]" />
                            <h2 className="mt-4 text-2xl font-black uppercase leading-tight">{title}</h2>
                            <p className="mt-3 text-sm leading-6 text-black/65">{body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="border-y border-white/10 bg-black">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                        Last updated: 25 September 2026
                    </p>
                    <Link href="/terms" className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#b6ff3f]">
                        Terms and conditions <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
