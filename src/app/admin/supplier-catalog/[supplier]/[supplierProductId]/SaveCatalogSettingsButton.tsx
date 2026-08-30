"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function SaveCatalogSettingsButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 self-end bg-red-600 px-5 text-sm font-black uppercase hover:bg-red-500 disabled:cursor-wait disabled:bg-red-900 disabled:text-white/70"
        >
            {pending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save
                </>
            )}
        </button>
    );
}
