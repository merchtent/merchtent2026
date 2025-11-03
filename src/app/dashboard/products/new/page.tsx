// app/dashboard/products/new/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import NewProductFormClient from "./NewProductFormClient";

export default function NewProductPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* angled banner */}
            <section className="relative py-0">
                <div className="-skew-y-2 bg-neutral-100 text-neutral-900 border-b border-neutral-200">
                    <div className="skew-y-2 max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
                        <div>
                            <p className="uppercase tracking-[0.25em] text-xs text-red-600">
                                Artist Dashboard
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black leading-[0.95]">
                                Add product
                            </h1>
                        </div>
                        <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-neutral-900 text-white text-xs">
                            NEW
                        </span>
                    </div>
                </div>
            </section>

            {/* form */}
            <section className="max-w-5xl mx-auto px-4 py-8">
                <Card
                    className="bg-neutral-900 border-neutral-800"
                    style={{ clipPath: "polygon(1% 0,100% 0,99% 100%,0 100%)" }}
                >
                    <CardContent className="p-6 md:p-8">
                        <NewProductFormClient />
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
