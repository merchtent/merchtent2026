import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { updateTaxSettings } from "@/app/admin/settings/tax-actions";

type TaxSettings = {
    gst_registered: boolean;
    gst_effective_from: string | null;
    gst_rate_bps: number;
    pricing_mode: "absorb" | "preserve_margins";
    legal_name: string;
    abn: string | null;
};

type Turnover = {
    current_turnover_cents: number;
    projected_turnover_cents: number;
    alert_level: "normal" | "watch" | "high" | "urgent";
};

function money(cents: number) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

export default function TaxSettingsPanel({
    settings,
    turnover,
    saved,
}: {
    settings: TaxSettings;
    turnover: Turnover;
    saved: boolean;
}) {
    const needsAttention = turnover.alert_level !== "normal";
    const effectiveDate = settings.gst_effective_from?.slice(0, 10) ?? "";

    return (
        <section className="border border-neutral-800 bg-neutral-950">
            <div className="flex flex-col gap-4 border-b border-neutral-800 p-5 md:flex-row md:items-start md:justify-between md:p-6">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#b7ff3c]">GST readiness</p>
                    <h2 className="mt-2 text-3xl font-black uppercase">Tax and pricing</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                        Customer prices remain GST-inclusive. Changes apply to new orders only; every order keeps its original tax snapshot.
                    </p>
                </div>
                {saved ? (
                    <div className="inline-flex items-center gap-2 border border-lime-400/40 px-3 py-2 text-xs font-black uppercase text-lime-300">
                        <CheckCircle2 className="h-4 w-4" /> Saved
                    </div>
                ) : null}
            </div>

            <div className="grid gap-px bg-neutral-800 p-px md:grid-cols-3">
                <div className="bg-black p-5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">Rolling 12 months</div>
                    <div className="mt-2 text-3xl font-black">{money(turnover.current_turnover_cents)}</div>
                </div>
                <div className="bg-black p-5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">90-day annualised</div>
                    <div className="mt-2 text-3xl font-black">{money(turnover.projected_turnover_cents)}</div>
                </div>
                <div className="bg-black p-5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">Alert level</div>
                    <div className={`mt-2 flex items-center gap-2 text-2xl font-black uppercase ${needsAttention ? "text-amber-300" : "text-lime-300"}`}>
                        {needsAttention ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        {turnover.alert_level}
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">Warnings step up at $55k, $65k and $70k.</p>
                </div>
            </div>

            <form action={updateTaxSettings} className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
                <label className="flex items-start gap-3 border border-neutral-800 bg-black p-4 md:col-span-2">
                    <input
                        type="checkbox"
                        name="gst_registered"
                        defaultChecked={settings.gst_registered}
                        className="mt-1 h-4 w-4 accent-[#b7ff3c]"
                    />
                    <span>
                        <span className="block font-black uppercase">GST registered</span>
                        <span className="mt-1 block text-sm text-neutral-400">Enable only after registration is confirmed. GST is then captured from the effective date.</span>
                    </span>
                </label>

                <label className="text-sm font-bold">
                    Seller legal name
                    <input name="legal_name" defaultValue={settings.legal_name} required className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white" />
                </label>
                <label className="text-sm font-bold">
                    ABN
                    <input name="abn" defaultValue={settings.abn ?? ""} inputMode="numeric" placeholder="11 digits" className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white" />
                </label>
                <label className="text-sm font-bold">
                    GST effective date
                    <input type="date" name="gst_effective_from" defaultValue={effectiveDate} className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white" />
                </label>
                <label className="text-sm font-bold">
                    GST pricing mode
                    <select name="pricing_mode" defaultValue={settings.pricing_mode} className="mt-2 w-full border border-neutral-700 bg-black px-4 py-3 text-white">
                        <option value="preserve_margins">Increase retail to preserve payouts and margin</option>
                        <option value="absorb">Keep retail unchanged and absorb GST</option>
                    </select>
                </label>

                <div className="flex flex-col gap-3 border-t border-neutral-800 pt-5 md:col-span-2 md:flex-row md:items-center md:justify-between">
                    <p className="max-w-2xl text-xs leading-5 text-neutral-500">
                        The GST rate is fixed at 10%. Margin-preserving mode grosses up future catalogue retail prices once registration becomes effective.
                    </p>
                    <button type="submit" className="bg-[#b7ff3c] px-5 py-3 text-sm font-black uppercase text-black hover:bg-white">
                        Save tax settings
                    </button>
                </div>
            </form>
        </section>
    );
}
