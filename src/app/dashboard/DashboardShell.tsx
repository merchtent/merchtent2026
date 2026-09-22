"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DashboardShell({
    sidebar,
    children,
}: {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isDesignerWorkspace = pathname.startsWith("/dashboard/products/designer/");

    useEffect(() => {
        if (!isDesignerWorkspace) return;

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
        };
    }, [isDesignerWorkspace]);

    return (
        <div
            className={
                isDesignerWorkspace
                    ? "operational-surface fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-black text-white lg:grid lg:grid-cols-[248px_1fr]"
                    : "operational-surface min-h-screen bg-black text-white lg:grid lg:grid-cols-[248px_1fr]"
            }
        >
            {sidebar}
            <div className={isDesignerWorkspace ? "min-h-0 min-w-0 flex-1 overflow-hidden" : "min-w-0"}>
                {children}
            </div>
        </div>
    );
}
