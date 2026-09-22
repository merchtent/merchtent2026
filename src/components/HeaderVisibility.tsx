"use client";

import { usePathname } from "next/navigation";

export default function HeaderVisibility({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDesignerWorkspace = pathname.startsWith("/dashboard/products/designer/");

    return isDesignerWorkspace ? null : children;
}
