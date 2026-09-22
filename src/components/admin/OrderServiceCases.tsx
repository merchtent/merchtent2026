"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardPlus, PackageCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type CaseType = "return" | "reprint" | "refund" | "cancellation";
type CaseStatus = "open" | "awaiting_customer" | "awaiting_supplier" | "approved" | "in_progress" | "resolved" | "rejected" | "cancelled";

type ServiceCase = {
    id: string;
    case_number: string;
    case_type: CaseType;
    status: CaseStatus;
    priority: "low" | "normal" | "high" | "urgent";
    summary: string;
    customer_request: string | null;
    resolution: string | null;
    supplier_reference: string | null;
    order_item_ids: string[];
    created_at: string;
    updated_at: string;
};

type OrderItem = { id: string; title: string | null; size: string | null; colorLabel: string | null };
type CaseEvent = {
    id: string;
    service_case_id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    created_at: string;
};

const statusOptions: CaseStatus[] = [
    "open", "awaiting_customer", "awaiting_supplier", "approved",
    "in_progress", "resolved", "rejected", "cancelled",
];

export default function OrderServiceCases({
    orderId,
    cases,
    items,
    events,
}: {
    orderId: string;
    cases: ServiceCase[];
    items: OrderItem[];
    events: CaseEvent[];
}) {
    const router = useRouter();
    const toast = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [caseType, setCaseType] = useState<CaseType>("return");
    const [priority, setPriority] = useState("normal");
    const [summary, setSummary] = useState("");
    const [customerRequest, setCustomerRequest] = useState("");
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
    const [nextStatus, setNextStatus] = useState<CaseStatus>("in_progress");
    const [note, setNote] = useState("");
    const [supplierReference, setSupplierReference] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const createCase = () => {
        if (summary.trim().length < 5) {
            setError("Add a clear summary of the customer issue.");
            return;
        }
        setError(null);
        startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/cases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseType, priority, summary, customerRequest, orderItemIds: selectedItems }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                setError(payload?.error ?? "The service case could not be created.");
                return;
            }
            toast({ title: "Service case opened", description: "The case and its audit trail are ready for the support team." });
            setShowCreate(false);
            setSummary("");
            setCustomerRequest("");
            setSelectedItems([]);
            router.refresh();
        });
    };

    const updateCase = (caseId: string) => {
        if (note.trim().length < 3) {
            setError("Add a note explaining this update.");
            return;
        }
        setError(null);
        startTransition(async () => {
            const response = await fetch(`/api/admin/order-cases/${caseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus, note, supplierReference }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                setError(payload?.error ?? "The service case could not be updated.");
                return;
            }
            toast({ title: "Case updated", description: "Status, reprint tracking and audit history are current." });
            setEditingCaseId(null);
            setNote("");
            setSupplierReference("");
            router.refresh();
        });
    };

    return (
        <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">Customer care</p>
                    <h2 className="mt-1 text-xl font-black uppercase">Returns, reprints and resolutions</h2>
                </div>
                <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 bg-lime-300 px-4 py-2 text-sm font-black text-black">
                    <ClipboardPlus className="h-4 w-4" /> New case
                </button>
            </div>

            {showCreate ? (
                <div className="mt-5 grid gap-4 border border-neutral-700 bg-neutral-950 p-4 lg:grid-cols-2">
                    <label className="text-xs font-black uppercase text-neutral-400">Case type
                        <select value={caseType} onChange={(event) => setCaseType(event.target.value as CaseType)} className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm font-normal normal-case text-white">
                            <option value="return">Return</option><option value="reprint">Reprint</option>
                            <option value="refund">Refund review</option><option value="cancellation">Cancellation review</option>
                        </select>
                    </label>
                    <label className="text-xs font-black uppercase text-neutral-400">Priority
                        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm font-normal normal-case text-white">
                            <option value="low">Low</option><option value="normal">Normal</option>
                            <option value="high">High</option><option value="urgent">Urgent</option>
                        </select>
                    </label>
                    <label className="text-xs font-black uppercase text-neutral-400 lg:col-span-2">Summary
                        <input value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm font-normal normal-case text-white" />
                    </label>
                    <label className="text-xs font-black uppercase text-neutral-400 lg:col-span-2">Customer request
                        <textarea value={customerRequest} onChange={(event) => setCustomerRequest(event.target.value)} rows={3} maxLength={2000} className="mt-2 w-full border border-neutral-700 bg-black p-3 text-sm font-normal normal-case text-white" />
                    </label>
                    <fieldset className="lg:col-span-2">
                        <legend className="text-xs font-black uppercase text-neutral-400">Affected items</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {items.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 border border-neutral-800 p-3 text-sm">
                                    <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={(event) => setSelectedItems((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                                    <span>{item.title ?? "Order item"}{item.colorLabel ? ` · ${item.colorLabel}` : ""}{item.size ? ` · ${item.size}` : ""}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="flex gap-2 lg:col-span-2">
                        <button type="button" disabled={pending} onClick={createCase} className="bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{pending ? "Opening..." : "Open case"}</button>
                        <button type="button" disabled={pending} onClick={() => setShowCreate(false)} className="border border-neutral-700 px-4 py-2 text-sm font-bold">Cancel</button>
                    </div>
                </div>
            ) : null}

            {error ? <p className="mt-3 border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}

            <div className="mt-5 space-y-3">
                {cases.length === 0 ? <p className="text-sm text-neutral-500">No customer-service cases for this order.</p> : cases.map((serviceCase) => (
                    <article key={serviceCase.id} className="border border-neutral-800 bg-neutral-950 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs text-lime-300">{serviceCase.case_number}</span>
                                    <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-black uppercase">{serviceCase.case_type}</span>
                                    <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-black uppercase">{serviceCase.status.replaceAll("_", " ")}</span>
                                </div>
                                <p className="mt-2 font-semibold text-white">{serviceCase.summary}</p>
                                {serviceCase.customer_request ? <p className="mt-1 text-sm text-neutral-400">{serviceCase.customer_request}</p> : null}
                                <p className="mt-2 text-xs text-neutral-500">Priority {serviceCase.priority} · Opened {new Date(serviceCase.created_at).toLocaleString("en-AU")}{serviceCase.supplier_reference ? ` · Supplier ${serviceCase.supplier_reference}` : ""}</p>
                                <div className="mt-3 space-y-1 border-l border-neutral-700 pl-3">
                                    {events.filter((event) => event.service_case_id === serviceCase.id).map((event) => (
                                        <p key={event.id} className="text-xs text-neutral-500">
                                            <span className="font-semibold text-neutral-300">{event.event_type.replaceAll("_", " ")}</span>
                                            {event.from_status || event.to_status ? ` · ${event.from_status ?? "new"} → ${event.to_status ?? "-"}` : ""}
                                            {event.note ? ` · ${event.note}` : ""}
                                            {` · ${new Date(event.created_at).toLocaleString("en-AU")}`}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <button type="button" onClick={() => { setEditingCaseId(serviceCase.id); setNextStatus(serviceCase.status === "open" ? "in_progress" : serviceCase.status); setSupplierReference(serviceCase.supplier_reference ?? ""); }} className="inline-flex items-center gap-2 border border-neutral-700 px-3 py-2 text-xs font-black uppercase hover:border-lime-300">
                                <PackageCheck className="h-4 w-4" /> Update
                            </button>
                        </div>
                        {editingCaseId === serviceCase.id ? (
                            <div className="mt-4 grid gap-3 border-t border-neutral-800 pt-4 sm:grid-cols-2">
                                <label className="text-xs font-black uppercase text-neutral-400">Next status
                                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as CaseStatus)} className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm font-normal normal-case text-white">
                                        {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                                    </select>
                                </label>
                                <label className="text-xs font-black uppercase text-neutral-400">Supplier reference
                                    <input value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} maxLength={255} className="mt-2 h-11 w-full border border-neutral-700 bg-black px-3 text-sm font-normal normal-case text-white" />
                                </label>
                                <label className="text-xs font-black uppercase text-neutral-400 sm:col-span-2">Update note
                                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} className="mt-2 w-full border border-neutral-700 bg-black p-3 text-sm font-normal normal-case text-white" />
                                </label>
                                <div className="flex gap-2 sm:col-span-2">
                                    <button type="button" disabled={pending} onClick={() => updateCase(serviceCase.id)} className="bg-lime-300 px-4 py-2 text-sm font-black text-black disabled:opacity-50">{pending ? "Saving..." : "Save update"}</button>
                                    <button type="button" disabled={pending} onClick={() => setEditingCaseId(null)} className="border border-neutral-700 px-4 py-2 text-sm font-bold">Close</button>
                                </div>
                            </div>
                        ) : null}
                    </article>
                ))}
            </div>
        </section>
    );
}
