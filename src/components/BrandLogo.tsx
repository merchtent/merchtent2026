import Link from "next/link";
import Image from "next/image";

type BrandLogoProps = {
    className?: string;
    compact?: boolean;
};

export default function BrandLogo({ className = "", compact = false }: BrandLogoProps) {
    const logoSize = compact ? "h-11 w-11" : "h-24 w-24 md:h-28 md:w-28";
    const imageSize = compact ? "44px" : "(min-width: 768px) 112px, 96px";

    return (
        <Link
            href="/"
            aria-label="Merch Tent home"
            className={`group inline-flex items-center justify-center ${className}`}
        >
            <span className={`relative shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-2deg] ${logoSize}`}>
                <Image
                    src="/images/merch-tent-logo-badge.png"
                    alt=""
                    fill
                    sizes={imageSize}
                    className="object-contain drop-shadow-[0_8px_24px_rgba(239,0,0,0.25)]"
                />
            </span>
        </Link>
    );
}
