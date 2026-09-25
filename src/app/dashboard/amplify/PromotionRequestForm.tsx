"use client";

import { useActionState } from "react";
import { requestAmplifyPromotion, type AmplifyPromotionState } from "./actions";

type ProductOption = { id: string; title: string };

export default function PromotionRequestForm({ products }: { products: ProductOption[] }) {
    const [state, action, pending] = useActionState(
        async (_state: AmplifyPromotionState, formData: FormData) => requestAmplifyPromotion(formData),
        {} as AmplifyPromotionState
    );

    return (
        <form action={action} className="grid gap-4 border border-neutral-800 p-5 md:grid-cols-2">
            <label className="text-xs font-bold text-neutral-300">
                Product
                <select name="product_id" className="mt-2 w-full border border-neutral-700 bg-black p-3 text-white">
                    <option value="">Artist campaign</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
                </select>
            </label>
            <label className="text-xs font-bold text-neutral-300">
                Channel
                <select name="channel" className="mt-2 w-full border border-neutral-700 bg-black p-3 text-white">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                    <option value="email">Email</option>
                    <option value="other">Other</option>
                </select>
            </label>
            <label className="text-xs font-bold text-neutral-300">
                Preferred date
                <input name="requested_for" type="date" className="mt-2 w-full border border-neutral-700 bg-black p-3 text-white" />
            </label>
            <label className="text-xs font-bold text-neutral-300 md:col-span-2">
                What should we highlight?
                <textarea name="brief" maxLength={2000} rows={4} className="mt-2 w-full border border-neutral-700 bg-black p-3 text-white" />
            </label>
            <div className="md:col-span-2">
                <button disabled={pending} className="bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:opacity-60">
                    {pending ? "Submitting..." : "Request promotion"}
                </button>
                {state.error ? <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p> : null}
                {state.ok ? <p className="mt-3 text-sm text-lime-300">Promotion request submitted.</p> : null}
            </div>
        </form>
    );
}
