"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SalesFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const current = searchParams.get("range") ?? "all";

    const handleChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === "all") params.delete("range");
        else params.set("range", value);
        router.replace(`/dashboard/sales?${params.toString()}`);
    };

    return (
        <div className="flex gap-2 items-center text-sm">
            <span className="text-gray-600">Range:</span>
            <select
                value={current}
                onChange={(e) => handleChange(e.target.value)}
                className="border rounded-lg px-2 py-1"
            >
                <option value="all">All time</option>
                <option value="30d">Last 30 days</option>
                <option value="7d">Last 7 days</option>
            </select>
        </div>
    );
}
