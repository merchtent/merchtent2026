import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description: "Terms governing shopping, artist accounts, artwork and use of Merch Tent.",
    alternates: { canonical: "/terms" },
};

export const revalidate = 60;

const sections = [
    ["1. Overview", "Merch Tent operates a marketplace and self-service artist platform for music merch. We support product creation, storefronts, payment flow, order handling and fulfilment routing."],
    ["2. Artist accounts", "Artists are responsible for accurate account details and for ensuring uploaded names, artwork and content do not infringe third-party rights. We may remove content or suspend access where required."],
    ["3. Orders and payments", "Products are printed on demand. Once an order is placed, it may move into production quickly and may not be cancellable. Merch Tent is the seller to the customer and is responsible for the customer transaction, subject to these terms and applicable consumer law."],
    ["4. Intellectual property", "Artists retain ownership of their designs. By uploading content, artists grant Merch Tent permission to display, promote, print and sell that content through the platform."],
    ["5. Artist earnings and GST", "Unless a separate written artist agreement says otherwise, artist earnings are contractual creator royalties paid for the licence in section 4. They are not customer sale proceeds, commissions collected for the artist, or payments to the artist as a product supplier. Displayed artist earnings are GST-inclusive. Artists must tell Merch Tent if they are GST-registered, provide their ABN and issue any valid tax invoice required for a GST component to be recognised. No additional GST is payable to an artist who is not GST-registered."],
    ["6. Limitation of liability", "To the fullest extent permitted by law, Merch Tent is not liable for indirect or consequential losses. Our liability for a claim is limited to the amount paid for the relevant order or service."],
    ["7. Termination", "We may suspend or terminate access if activity breaches these terms, creates operational risk, or creates legal or reputational risk for the platform."],
    ["8. Changes", "We may update these terms from time to time. Continued use of the site after changes are posted means you accept the updated terms."],
];

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#060606] text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(180,255,55,0.14),transparent_30%),linear-gradient(180deg,#080808,#111)]">
                <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b6ff3f]">Legal</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.86] md:text-7xl">
                        Terms and conditions.
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                        These terms govern shopping, artist accounts, uploaded artwork and use of Merch Tent services.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.75fr_1.25fr] md:px-8 md:py-16">
                <aside className="border border-white/10 bg-black p-6">
                    <FileText className="h-8 w-8 text-[#b6ff3f]" />
                    <h2 className="mt-5 text-4xl font-black uppercase leading-[0.9]">
                        The plain version.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-white/62">
                        Use the platform honestly, only upload content you are allowed to use, and understand that made-to-order merch starts moving after checkout.
                    </p>
                    <Link href="/privacy" className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase text-[#b6ff3f]">
                        Privacy policy <ArrowRight className="h-4 w-4" />
                    </Link>
                </aside>

                <div className="grid gap-px border border-white/10 bg-white/10">
                    {sections.map(([title, body]) => (
                        <article key={title} className="bg-[#f4f1e8] p-6 text-black">
                            <h2 className="text-2xl font-black uppercase leading-tight">{title}</h2>
                            <p className="mt-3 text-sm leading-6 text-black/65">{body}</p>
                        </article>
                    ))}
                    <p className="bg-black p-5 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                        Last updated: September 2026
                    </p>
                </div>
            </section>
        </main>
    );
}
