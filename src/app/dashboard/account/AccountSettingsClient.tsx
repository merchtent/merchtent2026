"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LogOut, Mail, ShieldAlert, UserRound } from "lucide-react";
import { passwordResetErrorMessage } from "@/lib/auth/supabase-client-errors";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { requestAccountClosure, updateDisplayName, type AccountActionState } from "./actions";

type AccountSettingsClientProps = {
    initialEmail: string;
    initialDisplayName: string;
};

const initialActionState: AccountActionState = {};

export default function AccountSettingsClient({
    initialEmail,
    initialDisplayName,
}: AccountSettingsClientProps) {
    const router = useRouter();
    const supabase = getBrowserSupabase();
    const [displayNameState, displayNameAction, displayNamePending] = useActionState(updateDisplayName, initialActionState);
    const [closureState, closureAction, closurePending] = useActionState(requestAccountClosure, initialActionState);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [emailMessage, setEmailMessage] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [sessionMessage, setSessionMessage] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const updateEmail = () => {
        setEmailError(null);
        setEmailMessage(null);

        startTransition(async () => {
            const targetEmail = email.trim().toLowerCase();
            if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
                setEmailError("Enter a valid email address.");
                return;
            }

            if (targetEmail === initialEmail.toLowerCase()) {
                setEmailError("That is already the email on this account.");
                return;
            }

            const { error } = await supabase.auth.updateUser(
                { email: targetEmail },
                { emailRedirectTo: `${window.location.origin}/auth/callback` }
            );

            if (error) {
                setEmailError(error.message || "Could not start email change.");
                return;
            }

            setEmailMessage("Check both email addresses to confirm the change.");
        });
    };

    const updatePassword = () => {
        setPasswordError(null);
        setPasswordMessage(null);

        startTransition(async () => {
            if (password.length < 8) {
                setPasswordError("Use at least 8 characters.");
                return;
            }

            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                setPasswordError(error.message || "Could not update password.");
                return;
            }

            setPassword("");
            setPasswordMessage("Password updated. Use it to sign in next time.");
        });
    };

    const sendRecoveryLink = () => {
        setPasswordError(null);
        setPasswordMessage(null);

        startTransition(async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(initialEmail, {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/account`,
            });

            if (error) {
                setPasswordError(passwordResetErrorMessage(error));
                return;
            }

            setPasswordMessage("Password setup email sent. Open the link to sign in temporarily and return here.");
        });
    };

    const signOutEverywhere = () => {
        setSessionError(null);
        setSessionMessage(null);

        startTransition(async () => {
            const { error } = await supabase.auth.signOut({ scope: "global" });

            if (error) {
                setSessionError(error.message || "Could not sign out other sessions.");
                return;
            }

            await fetch("/auth/sign-out", { method: "POST" }).catch(() => null);
            setSessionMessage("Signed out everywhere. Redirecting...");
            router.replace("/");
        });
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <form action={displayNameAction} className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                <AccountPanelHeading
                    icon={<UserRound className="h-5 w-5" />}
                    kicker="Profile"
                    title="Public account identity."
                    body="This name appears around your dashboard and may be used on artist or fan surfaces."
                />
                <label htmlFor="displayName" className="mt-6 block text-xs font-black uppercase text-neutral-400">
                    Display name
                </label>
                <input
                    id="displayName"
                    name="displayName"
                    defaultValue={initialDisplayName}
                    minLength={2}
                    maxLength={80}
                    className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                />
                <ActionFeedback state={displayNameState} success="Display name updated." />
                <button
                    type="submit"
                    disabled={displayNamePending}
                    className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
                >
                    {displayNamePending ? "Saving..." : "Save profile"}
                    <ArrowRight className="h-4 w-4" />
                </button>
            </form>

            <section className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                <AccountPanelHeading
                    icon={<Mail className="h-5 w-5" />}
                    kicker="Email"
                    title="Change sign-in email."
                    body="Supabase will confirm ownership before the account email changes."
                />
                <label htmlFor="email" className="mt-6 block text-xs font-black uppercase text-neutral-400">
                    Email address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                />
                <InlineFeedback error={emailError} message={emailMessage} />
                <button
                    type="button"
                    disabled={isPending}
                    onClick={updateEmail}
                    className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
                >
                    Send confirmation
                    <ArrowRight className="h-4 w-4" />
                </button>
            </section>

            <section className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                <AccountPanelHeading
                    icon={<KeyRound className="h-5 w-5" />}
                    kicker="Password"
                    title="Set or change password."
                    body="Use a strong password for direct email/password sign-in. If you email yourself a setup link, opening it signs you in temporarily and brings you back here."
                />
                <label htmlFor="password" className="mt-6 block text-xs font-black uppercase text-neutral-400">
                    New password
                </label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                />
                <InlineFeedback error={passwordError} message={passwordMessage} />
                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={updatePassword}
                        className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
                    >
                        Save password
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={sendRecoveryLink}
                        className="inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-white hover:border-red-500 disabled:opacity-60"
                    >
                        Email setup link
                    </button>
                </div>
            </section>

            <section className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
                <AccountPanelHeading
                    icon={<LogOut className="h-5 w-5" />}
                    kicker="Sessions"
                    title="Reset active sessions."
                    body="Use this if a shared device, old browser, or suspicious session needs cutting off."
                />
                <InlineFeedback error={sessionError} message={sessionMessage} />
                <button
                    type="button"
                    disabled={isPending}
                    onClick={signOutEverywhere}
                    className="mt-6 inline-flex items-center gap-2 border border-neutral-700 px-5 py-3 text-sm font-black text-white hover:border-red-500 disabled:opacity-60"
                >
                    Sign out everywhere
                    <ArrowRight className="h-4 w-4" />
                </button>
            </section>

            <form action={closureAction} className="border border-red-900/70 bg-red-950/20 p-5 md:p-6 xl:col-span-2">
                <AccountPanelHeading
                    icon={<ShieldAlert className="h-5 w-5" />}
                    kicker="Danger zone"
                    title="Request account closure."
                    body="This records a reviewed closure request so support can preserve order, payout, tax, and fulfilment records correctly."
                />
                <label htmlFor="reason" className="mt-6 block text-xs font-black uppercase text-neutral-400">
                    Reason, optional
                </label>
                <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    maxLength={1000}
                    className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                />
                <label htmlFor="confirmation" className="mt-5 block text-xs font-black uppercase text-neutral-400">
                    Type CLOSE ACCOUNT
                </label>
                <input
                    id="confirmation"
                    name="confirmation"
                    className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                />
                <ActionFeedback state={closureState} success="Closure request recorded. Support can now review it." />
                <button
                    type="submit"
                    disabled={closurePending}
                    className="mt-5 inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-60"
                >
                    {closurePending ? "Recording..." : "Request closure"}
                    <ArrowRight className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}

function AccountPanelHeading({
    icon,
    kicker,
    title,
    body,
}: {
    icon: ReactNode;
    kicker: string;
    title: string;
    body: string;
}) {
    return (
        <div>
            <div className="flex items-center gap-3 text-red-400">
                {icon}
                <p className="text-[11px] font-black uppercase text-red-400">{kicker}</p>
            </div>
            <h2 className="mt-3 text-3xl font-black uppercase leading-none text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{body}</p>
        </div>
    );
}

function ActionFeedback({ state, success }: { state: AccountActionState; success: string }) {
    if (state.error) return <p className="mt-4 text-sm font-bold text-red-300">{state.error}</p>;
    if (state.ok) return <p className="mt-4 text-sm font-bold text-green-300">{success}</p>;
    return null;
}

function InlineFeedback({ error, message }: { error: string | null; message: string | null }) {
    if (error) return <p className="mt-4 text-sm font-bold text-red-300">{error}</p>;
    if (message) return <p className="mt-4 text-sm font-bold text-green-300">{message}</p>;
    return null;
}
