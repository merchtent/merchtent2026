import Link from "next/link";

type BrandLogoProps = {
    className?: string;
    compact?: boolean;
};

export default function BrandLogo({ className = "", compact = false }: BrandLogoProps) {
    return (
        <Link
            href="/"
            aria-label="Merch Tent home"
            className={`group inline-flex items-center justify-center gap-2.5 text-left ${className}`}
        >
            <span className="relative h-11 w-11 shrink-0">
                <span className="absolute inset-0 translate-x-1 translate-y-1 border border-white/20 bg-black transition-transform duration-200 group-hover:translate-x-1.5 group-hover:translate-y-1.5" />
                <span className="relative grid h-10 w-10 place-items-center overflow-hidden border border-red-400 bg-red-600 text-white shadow-[0_0_24px_rgba(239,68,68,0.34)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-2deg]">
                    <span className="absolute inset-x-0 top-0 h-1 bg-white" />
                    <span className="absolute inset-y-0 right-0 w-2 bg-black/45" />
                    <span className="absolute -left-3 top-1 h-3 w-14 rotate-[-18deg] bg-black/25" />
                    <span className="absolute bottom-1 left-1 h-1 w-4 bg-white/80" />
                    <span className="relative text-sm font-black leading-none tracking-[-0.03em] [text-shadow:2px_1px_0_#000]">
                        MT
                    </span>
                </span>
            </span>
            {!compact && (
                <span className="relative leading-none">
                    <span className="absolute -left-1 top-1 h-[2.2rem] w-[2px] bg-red-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <span className="block text-[0.98rem] font-black uppercase text-white transition-colors [text-shadow:2px_1px_0_#000] group-hover:text-red-100">
                        Merch
                    </span>
                    <span className="block -translate-y-0.5 text-[0.98rem] font-black uppercase text-red-500 transition-colors [text-shadow:2px_1px_0_#000] group-hover:text-white">
                        Tent
                    </span>
                </span>
            )}
        </Link>
    );
}
