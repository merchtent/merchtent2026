"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function FooterVisibility() {
    const pathname = usePathname();
    const isDesignerWorkspace = pathname.startsWith("/dashboard/products/designer/");

    return isDesignerWorkspace ? null : <Footer />;
}
