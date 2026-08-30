"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { saveDefaultAddress, type SavedActionState } from "./actions";

export type DefaultAddress = {
    id?: string | null;
    label?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    phone?: string | null;
};

export default function AddressFormClient({ address }: { address: DefaultAddress | null }) {
    const [state, action, isPending] = useActionState<SavedActionState, FormData>(saveDefaultAddress, {});

    return (
        <form action={action} className="border border-neutral-800 bg-neutral-950 p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff3c]">
                        Default delivery address
                    </p>
                    <h2 className="mt-2 text-4xl font-black uppercase leading-none">
                        Fill checkout faster.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                        Save the address you normally ship to. When you&apos;re signed in, checkout will load it first.
                    </p>
                </div>
                {state.ok ? (
                    <p className="border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-300">
                        Address saved
                    </p>
                ) : null}
            </div>

            <input type="hidden" name="id" defaultValue={address?.id ?? ""} />
            <input type="hidden" name="label" defaultValue={address?.label ?? "Default"} />

            <div className="mt-6 grid gap-3 md:grid-cols-2">
                <TextInput name="first_name" label="First name" defaultValue={address?.first_name} required />
                <TextInput name="last_name" label="Last name" defaultValue={address?.last_name} required />
            </div>
            <div className="mt-3 grid gap-3">
                <TextInput name="line1" label="Address line 1" defaultValue={address?.line1} required />
                <TextInput name="line2" label="Address line 2" defaultValue={address?.line2} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
                <TextInput name="city" label="City / suburb" defaultValue={address?.city} required />
                <TextInput name="state" label="State" defaultValue={address?.state} required />
                <TextInput name="postal_code" label="Postcode" defaultValue={address?.postal_code} required />
                <TextInput name="country" label="Country" defaultValue={address?.country ?? "AU"} maxLength={2} required />
            </div>
            <div className="mt-3">
                <TextInput name="phone" label="Phone for delivery" defaultValue={address?.phone} />
            </div>

            {state.error ? <p className="mt-4 text-sm text-red-300">{state.error}</p> : null}

            <button
                type="submit"
                disabled={isPending}
                className="mt-5 inline-flex items-center gap-2 bg-lime-300 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-lime-200 disabled:opacity-60"
            >
                {isPending ? "Saving..." : "Save default address"}
                <ArrowRight className="h-4 w-4" />
            </button>
        </form>
    );
}

function TextInput({
    name,
    label,
    defaultValue,
    required,
    maxLength,
}: {
    name: string;
    label: string;
    defaultValue?: string | null;
    required?: boolean;
    maxLength?: number;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                {label}
            </span>
            <input
                name={name}
                defaultValue={defaultValue ?? ""}
                required={required}
                maxLength={maxLength}
                className="w-full border border-neutral-700 bg-black px-3 py-3 text-sm text-white outline-none focus:border-red-500"
            />
        </label>
    );
}
