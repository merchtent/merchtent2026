"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
    CalendarDays,
    Check,
    Copy,
    Download,
    ExternalLink,
    Film,
    ImageIcon,
    LoaderCircle,
    Megaphone,
    QrCode,
    Smartphone,
} from "lucide-react";

import { saveLaunchKitProgress } from "./actions";

export type LaunchKitProduct = {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    productUrl: string;
    images: string[];
    qrDataUrl: string;
    completedSteps: number[];
};

type LaunchKitClientProps = {
    artistName: string;
    products: LaunchKitProduct[];
};

const schedule = [
    { day: "3 days before", channel: "Instagram + Facebook", task: "Announce the drop with the strongest product image." },
    { day: "1 day before", channel: "Stories", task: "Post the story graphic and add the product link sticker." },
    { day: "Launch day", channel: "Email + socials", task: "Send the launch message, then pin the main post." },
    { day: "Day 2", channel: "TikTok / Reels", task: "Post the short promo clip with the shop link in bio." },
    { day: "Day 3", channel: "Gig audience", task: "Put the QR code at the merch table and mention it on stage." },
    { day: "Day 5", channel: "Facebook", task: "Share a closer product shot and ask fans which item they chose." },
    { day: "Day 7", channel: "Stories + email", task: "Run a final reminder while the launch is still fresh." },
];

function safeFileName(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "merch-drop";
}

function triggerDownload(url: string, fileName: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

async function loadCanvasImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image could not be loaded."));
        image.src = src;
    });
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawPromoFrame(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    product: LaunchKitProduct,
    artistName: string,
    progress = 0
) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    const zoom = 1 + progress * 0.06;
    ctx.translate(width / 2, 700);
    ctx.scale(zoom, zoom);
    drawImageCover(ctx, image, -width / 2, -700, width, 1400);
    ctx.restore();
    ctx.fillStyle = "#b7ff3c";
    ctx.fillRect(0, 1400, width, 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 72px Arial";
    ctx.fillText(artistName.toUpperCase(), 76, 1535, width - 152);
    ctx.font = "900 94px Arial";
    ctx.fillText(product.title.toUpperCase(), 76, 1665, width - 152);
    ctx.fillStyle = "#b7ff3c";
    ctx.font = "900 46px Arial";
    ctx.fillText("SHOP THE DROP", 76, 1790);
    ctx.fillStyle = "#a3a3a3";
    ctx.font = "700 28px Arial";
    ctx.fillText(new URL(product.productUrl).host.toUpperCase(), 76, 1855);
}

function drawAnimatedVideoFrame(
    ctx: CanvasRenderingContext2D,
    images: HTMLImageElement[],
    product: LaunchKitProduct,
    artistName: string,
    progress: number
) {
    const width = ctx.canvas.width;
    const imageProgress = progress * images.length;
    const imageIndex = Math.min(Math.floor(imageProgress), images.length - 1);
    const localProgress = imageProgress - imageIndex;
    const nextImage = images[Math.min(imageIndex + 1, images.length - 1)];

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, ctx.canvas.height);

    const paintImage = (image: HTMLImageElement, alpha: number, phase: number, direction: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        const zoom = 1.04 + phase * 0.14;
        const panX = direction * (-64 + phase * 128);
        ctx.translate(width / 2 + panX, 700);
        ctx.scale(zoom, zoom);
        drawImageCover(ctx, image, -width / 2, -700, width, 1400);
        ctx.restore();
    };

    const crossfade = nextImage !== images[imageIndex] && localProgress > 0.72
        ? (localProgress - 0.72) / 0.28
        : 0;
    const direction = imageIndex % 2 === 0 ? 1 : -1;
    paintImage(images[imageIndex], 1, localProgress, direction);
    if (crossfade > 0) paintImage(nextImage, crossfade, 0, -direction);

    ctx.fillStyle = "rgba(5,5,5,0.94)";
    ctx.fillRect(0, 1378, width, 542);
    ctx.fillStyle = "#b7ff3c";
    ctx.fillRect(0, 1378, width, 24);

    const labelProgress = Math.min(progress / 0.12, 1);
    const labelX = 72 - (1 - labelProgress) * 440;
    ctx.fillStyle = "#ef233c";
    ctx.fillRect(labelX, 1450, 330, 76);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 38px Arial";
    ctx.fillText("NEW DROP", labelX + 28, 1502);

    const copyProgress = Math.min(progress / 0.2, 1);
    ctx.globalAlpha = copyProgress;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 64px Arial";
    ctx.fillText(artistName.toUpperCase(), 72, 1618, width - 144);
    ctx.font = "900 88px Arial";
    ctx.fillText(product.title.toUpperCase(), 72, 1740, width - 144);
    ctx.fillStyle = "#b7ff3c";
    ctx.font = "900 42px Arial";
    ctx.fillText("SHOP THE DROP", 72, 1840);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#262626";
    ctx.fillRect(0, 1892, width, 28);
    ctx.fillStyle = "#b7ff3c";
    ctx.fillRect(0, 1892, width * progress, 28);
}

function captionSet(artistName: string, product: LaunchKitProduct) {
    const title = product.title;
    const link = product.productUrl;
    return [
        {
            channel: "Instagram",
            text: `${title} is live. Built with ${artistName} for the fans who keep showing up. Shop the drop: ${link}\n\n#bandmerch #newmerch #supportartists`,
        },
        {
            channel: "TikTok",
            text: `POV: the new ${artistName} merch just landed. ${title} is live now. ${link} #bandtok #merchdrop`,
        },
        {
            channel: "Facebook",
            text: `Our new drop is here: ${title}. Thanks for backing ${artistName} and helping us keep making things. See it here: ${link}`,
        },
        {
            channel: "Email",
            text: `Subject: ${artistName}'s new merch is live\n\n${title} has landed. Take a look, pick your favourite, and help us send this drop into the world.\n\nShop now: ${link}`,
        },
    ];
}

export default function LaunchKitClient({ artistName, products }: LaunchKitClientProps) {
    const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
    const [copied, setCopied] = useState<string | null>(null);
    const [completedByProduct, setCompletedByProduct] = useState<Record<string, number[]>>(() =>
        Object.fromEntries(products.map((item) => [item.id, item.completedSteps]))
    );
    const [savingProgress, setSavingProgress] = useState(false);
    const [progressError, setProgressError] = useState<string | null>(null);
    const [creatingAsset, setCreatingAsset] = useState<"story" | "video" | null>(null);
    const [assetError, setAssetError] = useState<string | null>(null);
    const product = products.find((item) => item.id === selectedId) ?? products[0];
    const completed = product ? completedByProduct[product.id] ?? [] : [];
    const captions = useMemo(() => product ? captionSet(artistName, product) : [], [artistName, product]);

    async function copyText(key: string, value: string) {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800);
    }

    async function toggleSchedule(index: number) {
        if (!product || savingProgress) return;
        const previous = completed;
        const next = completed.includes(index)
            ? completed.filter((item) => item !== index)
            : [...completed, index];
        setCompletedByProduct((current) => ({ ...current, [product.id]: next }));
        setSavingProgress(true);
        setProgressError(null);
        try {
            await saveLaunchKitProgress({ productId: product.id, completedSteps: next });
        } catch {
            setCompletedByProduct((current) => ({ ...current, [product.id]: previous }));
            setProgressError("Progress was not saved. Please try that checkmark again.");
        } finally {
            setSavingProgress(false);
        }
    }

    async function downloadStoryGraphic() {
        if (!product?.images[0]) return;
        setCreatingAsset("story");
        setAssetError(null);
        try {
        const image = await loadCanvasImage(product.images[0]);
            const canvas = document.createElement("canvas");
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Story canvas is unavailable.");
            drawPromoFrame(ctx, image, product, artistName);
            triggerDownload(canvas.toDataURL("image/jpeg", 0.92), `${safeFileName(product.title)}-story.jpg`);
        } catch {
            setAssetError("That image could not be turned into a story graphic. You can still download the original below.");
        } finally {
            setCreatingAsset(null);
        }
    }

    async function downloadPromoVideo() {
        if (!product?.images[0]) return;
        setCreatingAsset("video");
        setAssetError(null);
        try {
        const images = await Promise.all(product.images.slice(0, 3).map(loadCanvasImage));
            const canvas = document.createElement("canvas");
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext("2d");
            if (!ctx || !canvas.captureStream || typeof MediaRecorder === "undefined") {
                throw new Error("Video recording is unavailable.");
            }
            const stream = canvas.captureStream(30);
            const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
            const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size) chunks.push(event.data);
            };
            const finished = new Promise<void>((resolve) => {
                recorder.onstop = () => resolve();
            });
            recorder.start();
            const startedAt = performance.now();
            await new Promise<void>((resolve) => {
                const paint = (now: number) => {
                    const progress = Math.min((now - startedAt) / 6000, 1);
                    drawAnimatedVideoFrame(ctx, images, product, artistName, progress);
                    videoTrack.requestFrame?.();
                    if (progress < 1) window.setTimeout(() => requestAnimationFrame(paint), 1000 / 30);
                    else resolve();
                };
                requestAnimationFrame(paint);
            });
            recorder.stop();
            await finished;
            stream.getTracks().forEach((track) => track.stop());
            const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
            triggerDownload(url, `${safeFileName(product.title)}-promo.webm`);
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setAssetError("Video creation is not available in this browser. The story graphic and original images are ready to use.");
        } finally {
            setCreatingAsset(null);
        }
    }

    if (!product) {
        return (
            <main className="min-h-screen bg-black text-white">
                <LaunchHeader />
                <section className="p-5 md:p-8">
                    <div className="border border-neutral-800 bg-neutral-950 p-6">
                        <p className="text-lg font-black">Your launch kit starts with a product.</p>
                        <p className="mt-2 text-sm text-neutral-400">Create your first drop, then return here for ready-to-post assets and copy.</p>
                        <Link href="/dashboard/products/designer" className="mt-5 inline-flex bg-lime-300 px-4 py-3 text-sm font-black uppercase text-black">
                            Design a product
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const progress = Math.round((completed.length / schedule.length) * 100);

    return (
        <main className="min-h-screen bg-black text-white">
            <LaunchHeader />

            <section className="border-b border-neutral-800">
                <div className="grid max-w-6xl lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="p-5 md:p-8">
                    <label htmlFor="launch-product" className="block text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">Drop</label>
                    <select
                        id="launch-product"
                        value={product.id}
                        onChange={(event) => {
                            setSelectedId(event.target.value);
                            setProgressError(null);
                        }}
                        className="mt-3 block h-12 w-full max-w-xl border border-neutral-700 bg-black px-3 text-sm font-bold text-white outline-none focus:border-lime-300"
                    >
                        {products.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                    </select>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`border px-2 py-1 font-black uppercase ${product.isPublished ? "border-lime-300/50 text-lime-200" : "border-yellow-500/50 text-yellow-300"}`}>
                            {product.isPublished ? "Live" : "Draft"}
                        </span>
                        <span className="text-neutral-500">{product.images.length} ready image{product.images.length === 1 ? "" : "s"}</span>
                    </div>
                </div>
                <div className="border-t border-neutral-800 p-5 md:p-8 lg:border-l lg:border-t-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">Posting run</p>
                    <p className="mt-2 text-4xl font-black">{progress}%</p>
                    <div className="mt-3 h-2 bg-neutral-900"><div className="h-full bg-lime-300" style={{ width: `${progress}%` }} /></div>
                    <p className="mt-2 text-xs text-neutral-500">{completed.length} of {schedule.length} posts done</p>
                    <p className="mt-1 text-[11px] text-neutral-600">Saved to this drop</p>
                </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 p-5 md:p-8">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Share link</p>
                        <h2 className="mt-2 text-2xl font-black uppercase">Send fans straight to the drop.</h2>
                    </div>
                </div>
                <div className="mt-5 grid max-w-5xl border border-neutral-800 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 p-4 md:p-5">
                        <p className="break-all text-sm text-neutral-300">{product.productUrl}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <ActionButton icon={copied === "link" ? Check : Copy} label={copied === "link" ? "Copied" : "Copy link"} onClick={() => copyText("link", product.productUrl)} />
                            <a href={product.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 border border-neutral-700 px-3 text-xs font-black uppercase hover:border-lime-300 hover:text-lime-300">
                                <ExternalLink className="h-4 w-4" /> Open drop
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-neutral-800 bg-white p-4 text-black lg:border-l lg:border-t-0">
                        <Image src={product.qrDataUrl} alt={`QR code for ${product.title}`} width={112} height={112} className="h-28 w-28" unoptimized />
                        <button type="button" onClick={() => triggerDownload(product.qrDataUrl, `${safeFileName(product.title)}-qr.png`)} className="text-left text-xs font-black uppercase leading-5 hover:underline">
                            <QrCode className="mb-2 h-5 w-5" /> Download QR
                        </button>
                    </div>
                </div>
            </section>

            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Ready-to-post assets</p>
                <div className="mt-4 grid border border-neutral-800 md:grid-cols-2">
                    <AssetAction
                        icon={Smartphone}
                        title="Story graphic"
                        body="1080 × 1920 graphic using the first product mockup, artist name and shop callout."
                        disabled={!product.images[0] || creatingAsset !== null}
                        busy={creatingAsset === "story"}
                        action="Download JPG"
                        onClick={downloadStoryGraphic}
                    />
                    <AssetAction
                        icon={Film}
                        title="Short promo video"
                        body="Six-second vertical clip with product cuts, animated pan and zoom, launch title and shop callout."
                        disabled={!product.images[0] || creatingAsset !== null}
                        busy={creatingAsset === "video"}
                        action="Create video"
                        onClick={downloadPromoVideo}
                    />
                </div>
                {assetError ? <p className="mt-3 text-sm text-red-300">{assetError}</p> : null}

                <div className="mt-6">
                    <h3 className="text-sm font-black uppercase">Product images</h3>
                    {product.images.length ? (
                        <ul className="mt-3 grid border-l border-t border-neutral-800 sm:grid-cols-2 xl:grid-cols-4">
                            {product.images.map((image, index) => (
                                <li key={image} className="border-b border-r border-neutral-800 bg-neutral-950">
                                    <Image src={image} alt={`${product.title} promotional image ${index + 1}`} width={800} height={800} className="aspect-square w-full object-cover" />
                                    <a href={image} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-between px-3 text-xs font-black uppercase hover:bg-lime-300 hover:text-black">
                                        Image {index + 1} <Download className="h-4 w-4" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="mt-3 flex items-center gap-3 border border-neutral-800 p-5 text-sm text-neutral-400">
                            <ImageIcon className="h-5 w-5" /> Product imagery is still being prepared for this drop.
                        </div>
                    )}
                </div>
            </section>

            <section className="border-b border-neutral-800 p-5 md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Captions</p>
                <h2 className="mt-2 text-2xl font-black uppercase">Start with this. Make it yours.</h2>
                <div className="mt-5 grid border-l border-t border-neutral-800 lg:grid-cols-2">
                    {captions.map((caption) => (
                        <article key={caption.channel} className="border-b border-r border-neutral-800 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-black">{caption.channel}</h3>
                                <button type="button" onClick={() => copyText(caption.channel, caption.text)} aria-label={`Copy ${caption.channel} caption`} className="grid h-9 w-9 place-items-center border border-neutral-700 hover:border-lime-300 hover:text-lime-300">
                                    {copied === caption.channel ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-neutral-300">{caption.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="p-5 md:p-8">
                <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-lime-300" />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-300">Posting schedule</p>
                        <h2 className="mt-1 text-2xl font-black uppercase">Seven useful touches. No spam.</h2>
                    </div>
                </div>
                <ol className="mt-5 border border-neutral-800">
                    {schedule.map((item, index) => {
                        const done = completed.includes(index);
                        return (
                            <li key={item.day} className="grid border-b border-neutral-800 last:border-b-0 md:grid-cols-[150px_190px_1fr_64px] md:items-center">
                                <p className="border-b border-neutral-800 px-4 py-3 text-xs font-black uppercase text-lime-300 md:border-b-0 md:border-r">{item.day}</p>
                                <p className="border-b border-neutral-800 px-4 py-3 text-xs font-bold text-neutral-400 md:border-b-0 md:border-r">{item.channel}</p>
                                <p className={`px-4 py-3 text-sm ${done ? "text-neutral-600 line-through" : "text-neutral-200"}`}>{item.task}</p>
                                <button type="button" disabled={savingProgress} onClick={() => toggleSchedule(index)} aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${item.task}`} className={`m-2 grid h-10 w-10 place-items-center border disabled:cursor-wait disabled:opacity-60 ${done ? "border-lime-300 bg-lime-300 text-black" : "border-neutral-700 hover:border-lime-300"}`}>
                                    <Check className="h-4 w-4" />
                                </button>
                            </li>
                        );
                    })}
                </ol>
                {progressError ? <p role="alert" className="mt-3 text-sm text-red-300">{progressError}</p> : null}
            </section>
        </main>
    );
}

function LaunchHeader() {
    return (
        <section className="border-b border-neutral-800 bg-black p-5 md:p-8">
            <div className="flex items-start gap-4">
                <Megaphone className="mt-1 h-6 w-6 text-red-500" />
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-300">Your audience</p>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight md:text-5xl">Launch kit.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
                        Everything you need to put a drop in front of followers, mailing lists and the room at your next show.
                    </p>
                </div>
            </div>
        </section>
    );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-2 bg-lime-300 px-3 text-xs font-black uppercase text-black hover:bg-lime-200">
            <Icon className="h-4 w-4" /> {label}
        </button>
    );
}

function AssetAction({
    icon: Icon,
    title,
    body,
    action,
    disabled,
    busy,
    onClick,
}: {
    icon: typeof Film;
    title: string;
    body: string;
    action: string;
    disabled: boolean;
    busy: boolean;
    onClick: () => void;
}) {
    return (
        <div className="border-b border-r border-neutral-800 p-5">
            <Icon className="h-6 w-6 text-red-500" />
            <h3 className="mt-4 text-lg font-black uppercase">{title}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-400">{body}</p>
            <button type="button" disabled={disabled} onClick={onClick} className="mt-5 inline-flex h-10 items-center gap-2 border border-neutral-700 px-3 text-xs font-black uppercase hover:border-lime-300 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {busy ? "Creating" : action}
            </button>
        </div>
    );
}
