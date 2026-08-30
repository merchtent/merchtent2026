// app/contact/page.tsx
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { getPublicServerSupabase } from "@/lib/supabase/public-server";
import { checkDurableRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ArrowRight, Headphones, Mail, MessageSquare, PackageCheck, ShieldCheck, UserRound } from "lucide-react";

export const revalidate = 0;

const contactSchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.email().max(320),
    subject: z.string().trim().max(300).optional(),
    message: z.string().trim().min(1).max(5000),
});

const contactReasons = [
    {
        title: "Order support",
        body: "Questions about purchase status, shipping, or returns.",
        Icon: PackageCheck,
    },
    {
        title: "Artist account",
        body: "Profile, product designer, catalogue, or storefront questions.",
        Icon: UserRound,
    },
    {
        title: "Payments",
        body: "Receipts, checkout issues, credits, or payout support.",
        Icon: ShieldCheck,
    },
];

export default async function ContactPage({
    searchParams,
}: {
    searchParams?: Promise<{ sent?: string }>;
}) {
    const sp = (await searchParams) ?? {};
    const sent = sp.sent === "1";

    return (
        <main className="min-h-screen bg-black text-white">
            <section className="relative overflow-hidden border-b border-neutral-800">
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1800&q=80"
                        alt="Live music stage lights"
                        fill
                        sizes="100vw"
                        className="object-cover opacity-35"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35" />
                </div>

                <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1fr_0.78fr] lg:items-end">
                    <div>
                        <p className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-black">
                            Contact Merch Tent
                        </p>
                        <h1 className="mt-5 max-w-4xl text-6xl font-black uppercase leading-[0.86] md:text-8xl">
                            Need a hand with an order or account?
                        </h1>
                        <p className="mt-6 max-w-2xl text-base font-bold leading-7 text-neutral-200 md:text-lg">
                            Message us about orders, artist accounts, product listings, payments, or platform support.
                            We’ll get the right context and reply by email.
                        </p>
                    </div>

                    <div className="border border-white/15 bg-black/70 p-5 backdrop-blur">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Support hours</p>
                        <p className="mt-3 text-3xl font-black uppercase leading-none">Mon-Fri, 9am-5pm AEST</p>
                        <a
                            href="mailto:support@merchtent.com.au"
                            className="mt-5 inline-flex items-center gap-2 text-sm font-black text-lime-300 hover:text-white"
                        >
                            support@merchtent.com.au
                            <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-[#f3f1e8] text-black">
                <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.45fr_0.55fr]">
                    <aside className="border-b border-neutral-300 p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-600">What to send</p>
                        <h2 className="mt-3 text-5xl font-black uppercase leading-[0.88] md:text-6xl">
                            Give us the details once.
                        </h2>
                        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-700">
                            Include the order number, artist name, product link, or account email if you have it.
                            The clearer the message, the faster we can get you sorted.
                        </p>

                        <div className="mt-8 grid gap-px bg-neutral-300">
                            {contactReasons.map(({ title, body, Icon }) => (
                                <div key={title} className="bg-[#f3f1e8] p-5">
                                    <div className="flex items-start gap-4">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center bg-lime-300 text-black">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <h3 className="text-xl font-black uppercase leading-none">{title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-neutral-700">{body}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="p-5 md:p-8">
                    {sent ? (
                        <div className="border border-neutral-300 bg-white p-6 md:p-8">
                            <span className="inline-flex bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-black">
                                Message received
                            </span>
                            <h2 className="mt-4 text-4xl font-black uppercase leading-none">Thanks, we’ve got it.</h2>
                            <p className="mt-3 max-w-2xl text-neutral-700">
                                We’ll reply to the email you provided as soon as we can.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3 text-sm">
                                <Link href="/" className="inline-flex items-center gap-2 bg-black px-5 py-3 font-black uppercase tracking-[0.08em] text-white hover:bg-red-600">
                                    Back to shop
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link href="/dashboard/orders" className="inline-flex items-center gap-2 border border-black px-5 py-3 font-black uppercase tracking-[0.08em] text-black hover:bg-lime-300">
                                    View your orders
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form
                            action={submitContact}
                            className="border border-neutral-300 bg-white p-5 shadow-[10px_10px_0_#d9d6ca] md:p-7"
                        >
                            {/* honeypot */}
                            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" />

                            <div className="mb-6 flex items-start justify-between gap-4 border-b border-neutral-300 pb-5">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-600">Support form</p>
                                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">Tell us what’s up.</h2>
                                </div>
                                <MessageSquare className="h-8 w-8 text-lime-500" />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">Name</label>
                                    <input
                                        name="name"
                                        required
                                        placeholder="Jane Doe"
                                        className="w-full border border-neutral-300 bg-[#f3f1e8] px-4 py-3 text-black outline-none placeholder:text-neutral-500 focus:border-red-600"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="jane@example.com"
                                        className="w-full border border-neutral-300 bg-[#f3f1e8] px-4 py-3 text-black outline-none placeholder:text-neutral-500 focus:border-red-600"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">Subject</label>
                                <input
                                    name="subject"
                                    placeholder="Order question, artist signup, etc."
                                    className="w-full border border-neutral-300 bg-[#f3f1e8] px-4 py-3 text-black outline-none placeholder:text-neutral-500 focus:border-red-600"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">Message</label>
                                <textarea
                                    name="message"
                                    required
                                    rows={7}
                                    placeholder="Tell us what’s up..."
                                    className="w-full border border-neutral-300 bg-[#f3f1e8] px-4 py-3 text-black outline-none placeholder:text-neutral-500 focus:border-red-600"
                                />
                            </div>

                            <div className="mt-5 flex flex-col gap-4 border-t border-neutral-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="max-w-md text-xs font-bold leading-5 text-neutral-500">
                                    We’ll only use your email to respond to your request.
                                </p>
                                <button
                                    className="inline-flex items-center justify-center gap-2 bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-white hover:bg-red-500"
                                    type="submit"
                                >
                                    Send message
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </form>
                    )}
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 bg-black">
                <div className="mx-auto grid max-w-7xl gap-px bg-neutral-800 md:grid-cols-3">
                    {[
                        ["Fast context helps", "Order number, product name, artist name, or account email are the quickest clues."],
                        ["No public surprises", "Use this form for private account, checkout, or order questions."],
                        ["Scene support", "Artists and fans can both use the same channel. We route it from there."],
                    ].map(([title, body]) => (
                        <article key={title} className="bg-neutral-950 p-5 md:p-7">
                            <Headphones className="h-6 w-6 text-lime-300" />
                            <h3 className="mt-10 text-2xl font-black uppercase leading-none">{title}</h3>
                            <p className="mt-3 text-sm leading-6 text-neutral-400">{body}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

/* ------------------------- Server Action ------------------------- */

async function submitContact(formData: FormData) {
    "use server";

    // simple honeypot
    if (String(formData.get("company") || "").trim()) {
        redirect("/contact?sent=1"); // silently succeed
    }

    const parsed = contactSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        subject: formData.get("subject"),
        message: formData.get("message"),
    });

    if (!parsed.success) {
        // Don’t expose errors to end-user here; keep UX simple
        redirect("/contact?sent=1");
    }

    const headerStore = await headers();
    const ip =
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip") ||
        "unknown";
    const rateLimitSupabase = getPublicServerSupabase();

    if (!(await checkDurableRateLimit(rateLimitSupabase, `contact:${ip}`, 5, 60_000, "check_public_rate_limit", { fallback: "deny" }))) {
        redirect("/contact?sent=1");
    }

    const { name, email, subject, message } = parsed.data;
    const { error } = await rateLimitSupabase.rpc("public_submit_contact_message", {
        p_name: name,
        p_email: email,
        p_subject: subject ?? null,
        p_message: message,
    });

    // We redirect to success even if there’s a transient DB error to avoid blocking users.
    if (error) {
        logger.error("contact message insert failed", {
            subject_present: Boolean(subject),
            message_length: message.length,
            error: error.message,
        });
    }

    redirect("/contact?sent=1");
}
