import { cn } from "@/lib/utils";

type ProductCardSkeletonProps = {
    className?: string;
    dark?: boolean;
    mediaAspect?: "square" | "compact" | "latest" | "portrait";
};

export function ProductCardSkeleton({ className, dark = false, mediaAspect = "portrait" }: ProductCardSkeletonProps) {
    const mediaClassName = mediaAspect === "square"
        ? "aspect-square"
        : mediaAspect === "compact"
            ? "aspect-[4/4.45]"
            : mediaAspect === "latest"
                ? "aspect-[4/4.5]"
            : "aspect-[4/5]";

    return (
        <div
            aria-hidden="true"
            className={cn(
                "overflow-hidden border motion-safe:animate-pulse",
                dark ? "border-white/10 bg-neutral-950" : "border-black/15 bg-white",
                className,
            )}
        >
            <div className={cn(mediaClassName, dark ? "bg-neutral-900" : "bg-neutral-200")} />
            <div className="space-y-3 p-4">
                <SkeletonLine className="w-2/5" dark={dark} />
                <SkeletonLine className="w-4/5" dark={dark} />
                <SkeletonLine className="w-3/5" dark={dark} />
                <SkeletonLine className="mt-4 h-5 w-1/4" dark={dark} />
            </div>
        </div>
    );
}

export function ProductListSkeleton() {
    return (
        <div aria-hidden="true" className="grid min-h-[114px] grid-cols-[96px_1fr_auto] items-center gap-4 border border-black/15 bg-white p-2 motion-safe:animate-pulse">
            <div className="aspect-square bg-neutral-200" />
            <div className="space-y-3">
                <SkeletonLine className="w-1/3" />
                <SkeletonLine className="w-4/5" />
                <SkeletonLine className="h-5 w-1/4" />
            </div>
            <div className="mr-2 h-5 w-5 bg-neutral-200" />
        </div>
    );
}

export function ArtistCardSkeleton() {
    return (
        <div aria-hidden="true" className="overflow-hidden border border-neutral-800 bg-neutral-950 motion-safe:animate-pulse">
            <div className="aspect-[4/3] bg-neutral-900" />
            <div className="flex h-[57px] items-center justify-between gap-4 p-4">
                <SkeletonLine className="w-1/2" dark />
                <div className="h-4 w-4 bg-neutral-800" />
            </div>
        </div>
    );
}

export function JournalCardSkeleton() {
    return (
        <div aria-hidden="true" className="min-h-[300px] overflow-hidden border border-white/10 bg-black/35 motion-safe:animate-pulse">
            <div className="aspect-[4/3] bg-neutral-900" />
            <div className="space-y-3 p-4">
                <SkeletonLine className="h-5 w-4/5" dark />
                <SkeletonLine className="w-full" dark />
                <SkeletonLine className="w-2/3" dark />
            </div>
        </div>
    );
}

function SkeletonLine({ className, dark = false }: { className?: string; dark?: boolean }) {
    return <div className={cn("h-3", dark ? "bg-neutral-800" : "bg-neutral-200", className)} />;
}
