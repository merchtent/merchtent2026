// app/contact/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function ContactPage({
    searchParams,
}: {
    searchParams?: Promise<{ sent?: string }>;
}) {
    const sp = (await searchParams) ?? {};
    const sent = sp.sent === "1";

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">Support</p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">Contact Us</h1>
                        </div>
                        <span className="text-xs bg-neutral-900 text-white px-2 py-1 rounded rotate-[-2deg]">
                            HELP
                        </span>
                    </div>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-3">
                {/* Left: info */}
                <div
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                >
                    <h2 className="text-lg font-bold">How can we help?</h2>
                    <p className="text-neutral-300 mt-2">
                        Questions about orders, products, or becoming an artist on the platform? Send us a
                        message and we’ll get back within 1–2 business days.
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                        <div>
                            <span className="text-neutral-400">Email:</span>{" "}
                            <a className="underline" href="mailto:support@merchtentcom.au">
                                support@merchtent.com.au
                            </a>
                        </div>
                        <div>
                            <span className="text-neutral-400">FAQ:</span>{" "}
                            <Link href="/help" className="underline">
                                Browse help articles
                            </Link>
                        </div>
                    </div>

                    <div className="mt-6 text-xs text-neutral-500">
                        <p>Business hours: Mon–Fri, 9am–5pm AEST</p>
                        <p>We’re a small crew—thanks for your patience!</p>
                    </div>
                </div>

                {/* Right: form */}
                <div className="md:col-span-2">
                    {sent ? (
                        <div
                            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
                            style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                        >
                            <h2 className="text-lg font-bold">Thanks, we’ve got your message!</h2>
                            <p className="text-neutral-300 mt-2">
                                We’ll reply to <span className="underline">the email you provided</span> as soon as
                                we can.
                            </p>
                            <div className="mt-4 flex gap-4 text-sm">
                                <Link href="/" className="underline">
                                    Back to shop
                                </Link>
                                <Link href="/orders" className="underline">
                                    View your orders
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form
                            action={submitContact}
                            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4"
                            style={{ clipPath: "polygon(1% 0,100% 0,98% 100%,0 100%)" }}
                        >
                            {/* honeypot */}
                            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" />

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] text-neutral-400 mb-1">Name</label>
                                    <input
                                        name="name"
                                        required
                                        placeholder="Jane Doe"
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-neutral-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="jane@example.com"
                                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 px-3 py-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">Subject</label>
                                <input
                                    name="subject"
                                    placeholder="Order question, artist signup, etc."
                                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] text-neutral-400 mb-1">Message</label>
                                <textarea
                                    name="message"
                                    required
                                    rows={6}
                                    placeholder="Tell us what’s up…"
                                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 px-3 py-2"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-neutral-500">
                                    We’ll only use your email to respond to your request.
                                </p>
                                <button
                                    className="rounded-2xl px-5 py-2.5 bg-red-600 text-white hover:bg-red-500"
                                    type="submit"
                                >
                                    Send message
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

/* ------------------------- Server Action ------------------------- */

async function submitContact(formData: FormData) {
    "use server";

    const supabase = getServerSupabase();

    // simple honeypot
    if (String(formData.get("company") || "").trim()) {
        redirect("/contact?sent=1"); // silently succeed
    }

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
        // Don’t expose errors to end-user here; keep UX simple
        redirect("/contact?sent=1");
    }

    // Insert into Supabase (see SQL below)
    const { error } = await supabase
        .from("contact_messages")
        .insert({ name, email, subject, message });

    // We redirect to success even if there’s a transient DB error to avoid blocking users.
    // You can log error server-side if needed.
    // if (error) console.error("contact insert error", error);

    redirect("/contact?sent=1");
}
