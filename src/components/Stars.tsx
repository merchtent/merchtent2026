export default function Stars({ rating = 5 }: { rating?: number }) {
    return (
        <div className="flex items-center gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= rating ? "opacity-100" : "opacity-20"}>
                    ★
                </span>
            ))}
        </div>
    );
}