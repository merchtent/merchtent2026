"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlignCenter,
    Image as ImageIcon,
    Layers,
    Loader2,
    RotateCw,
    Save,
    Shirt,
    Trash2,
    Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDesignedProductAction } from "./actions";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1200;
const PRINT_ASSET_WIDTH = 2400;
const PRINT_ASSET_HEIGHT = 3200;

type Side = "front" | "back";
type GarmentKind = "tee" | "hoodie";

type DesignLayer = {
    id: string;
    side: Side;
    type: "image" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    text?: string;
    fill?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    src?: string;
};

type DragState = {
    id: string;
    offsetX: number;
    offsetY: number;
};

const PRINT_AREAS: Record<Side, { x: number; y: number; width: number; height: number }> = {
    front: { x: 280, y: 315, width: 340, height: 430 },
    back: { x: 280, y: 300, width: 340, height: 460 },
};

const GARMENT_COLORS = [
    { label: "Black", value: "#111111" },
    { label: "White", value: "#f7f7f2" },
    { label: "Grey", value: "#777777" },
    { label: "Red", value: "#b91c1c" },
    { label: "Navy", value: "#111827" },
    { label: "Forest", value: "#14532d" },
];

function uid() {
    return globalThis.crypto.randomUUID();
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function drawGarment(
    ctx: CanvasRenderingContext2D,
    kind: GarmentKind,
    side: Side,
    color: string
) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#2a2a2a");
    gradient.addColorStop(1, "#0f0f0f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(0, kind === "hoodie" ? 20 : 0);

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 5;

    if (kind === "hoodie") {
        ctx.beginPath();
        ctx.moveTo(318, 170);
        ctx.quadraticCurveTo(450, 72, 582, 170);
        ctx.lineTo(646, 304);
        ctx.lineTo(758, 405);
        ctx.lineTo(662, 575);
        ctx.lineTo(612, 980);
        ctx.quadraticCurveTo(450, 1045, 288, 980);
        ctx.lineTo(238, 575);
        ctx.lineTo(142, 405);
        ctx.lineTo(254, 304);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.moveTo(350, 225);
        ctx.quadraticCurveTo(450, 320, 550, 225);
        ctx.quadraticCurveTo(506, 355, 450, 390);
        ctx.quadraticCurveTo(394, 355, 350, 225);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.moveTo(365, 700);
        ctx.quadraticCurveTo(450, 750, 535, 700);
        ctx.lineTo(535, 820);
        ctx.quadraticCurveTo(450, 870, 365, 820);
        ctx.closePath();
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(318, 160);
        ctx.quadraticCurveTo(450, 96, 582, 160);
        ctx.lineTo(742, 300);
        ctx.lineTo(646, 472);
        ctx.lineTo(590, 980);
        ctx.quadraticCurveTo(450, 1038, 310, 980);
        ctx.lineTo(254, 472);
        ctx.lineTo(158, 300);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.beginPath();
        ctx.arc(450, 177, 92, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.stroke();
    }

    if (side === "back") {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.moveTo(326, kind === "hoodie" ? 245 : 196);
        ctx.quadraticCurveTo(450, kind === "hoodie" ? 318 : 250, 574, kind === "hoodie" ? 245 : 196);
        ctx.stroke();
    }

    ctx.restore();
}

async function drawLayer(ctx: CanvasRenderingContext2D, layer: DesignLayer) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    if (layer.type === "text") {
        ctx.fillStyle = layer.fill ?? "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${layer.fontWeight ?? "800"} ${layer.fontSize ?? 72}px ${layer.fontFamily ?? "Arial"}`;
        const text = layer.text ?? "";
        const lines = text.split("\n");
        lines.forEach((line, index) => {
            ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * (layer.fontSize ?? 72) * 1.12);
        });
    } else if (layer.src) {
        const image = await loadImage(layer.src);
        ctx.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }

    ctx.restore();
}

async function renderDesign(
    canvas: HTMLCanvasElement,
    layers: DesignLayer[],
    side: Side,
    kind: GarmentKind,
    garmentColor: string,
    showGuides: boolean
) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawGarment(ctx, kind, side, garmentColor);

    for (const layer of layers.filter((item) => item.side === side)) {
        await drawLayer(ctx, layer);
    }

    if (showGuides) {
        const area = PRINT_AREAS[side];
        ctx.save();
        ctx.strokeStyle = "rgba(248,113,113,0.9)";
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 4;
        ctx.strokeRect(area.x, area.y, area.width, area.height);
        ctx.restore();
    }
}

async function renderPrintAsset(layers: DesignLayer[], side: Side) {
    const canvas = document.createElement("canvas");
    const area = PRINT_AREAS[side];
    const scaleX = PRINT_ASSET_WIDTH / area.width;
    const scaleY = PRINT_ASSET_HEIGHT / area.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (PRINT_ASSET_WIDTH - area.width * scale) / 2;
    const offsetY = (PRINT_ASSET_HEIGHT - area.height * scale) / 2;
    const ctx = canvas.getContext("2d");

    canvas.width = PRINT_ASSET_WIDTH;
    canvas.height = PRINT_ASSET_HEIGHT;

    if (!ctx) return canvas.toDataURL("image/png");

    ctx.clearRect(0, 0, PRINT_ASSET_WIDTH, PRINT_ASSET_HEIGHT);
    ctx.save();
    ctx.translate(offsetX - area.x * scale, offsetY - area.y * scale);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();

    for (const layer of layers.filter((item) => item.side === side)) {
        await drawLayer(ctx, layer);
    }

    ctx.restore();
    return canvas.toDataURL("image/png");
}

export default function DesignerClient() {
    const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const dragRef = useRef<DragState | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("39.00");
    const [category, setCategory] = useState("tees");
    const [publish, setPublish] = useState(false);
    const [activeSide, setActiveSide] = useState<Side>("front");
    const [garmentKind, setGarmentKind] = useState<GarmentKind>("tee");
    const [garmentColor, setGarmentColor] = useState("#111111");
    const [layers, setLayers] = useState<DesignLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [newText, setNewText] = useState("BAND NAME");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedLayer = useMemo(
        () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
        [layers, selectedLayerId]
    );
    const activeLayers = layers.filter((layer) => layer.side === activeSide);
    const hasBackDesign = layers.some((layer) => layer.side === "back");

    useEffect(() => {
        let cancelled = false;

        async function render() {
            if (frontCanvasRef.current) {
                await renderDesign(frontCanvasRef.current, layers, "front", garmentKind, garmentColor, activeSide === "front");
            }
            if (backCanvasRef.current) {
                await renderDesign(backCanvasRef.current, layers, "back", garmentKind, garmentColor, activeSide === "back");
            }
        }

        render().catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : "Could not render design preview");
            }
        });

        return () => {
            cancelled = true;
        };
    }, [activeSide, garmentColor, garmentKind, layers]);

    function updateLayer(id: string, patch: Partial<DesignLayer>) {
        setLayers((current) =>
            current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))
        );
    }

    function addTextLayer() {
        const layer: DesignLayer = {
            id: uid(),
            side: activeSide,
            type: "text",
            x: 302,
            y: 420,
            width: 296,
            height: 120,
            rotation: 0,
            opacity: 1,
            text: newText,
            fill: "#ffffff",
            fontSize: 76,
            fontFamily: "Arial",
            fontWeight: "900",
        };

        setLayers((current) => [...current, layer]);
        setSelectedLayerId(layer.id);
    }

    function addImageLayer(file: File | null) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const src = String(reader.result || "");
            const layer: DesignLayer = {
                id: uid(),
                side: activeSide,
                type: "image",
                x: 315,
                y: 365,
                width: 270,
                height: 270,
                rotation: 0,
                opacity: 1,
                src,
            };
            setLayers((current) => [...current, layer]);
            setSelectedLayerId(layer.id);
        };
        reader.readAsDataURL(file);
    }

    function removeSelectedLayer() {
        if (!selectedLayerId) return;
        setLayers((current) => current.filter((layer) => layer.id !== selectedLayerId));
        setSelectedLayerId(null);
    }

    function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        };
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        const point = getCanvasPoint(event);
        const hit = [...activeLayers]
            .reverse()
            .find(
                (layer) =>
                    point.x >= layer.x &&
                    point.x <= layer.x + layer.width &&
                    point.y >= layer.y &&
                    point.y <= layer.y + layer.height
            );

        if (!hit) {
            setSelectedLayerId(null);
            return;
        }

        setSelectedLayerId(hit.id);
        dragRef.current = {
            id: hit.id,
            offsetX: point.x - hit.x,
            offsetY: point.y - hit.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
        const drag = dragRef.current;
        if (!drag) return;
        const point = getCanvasPoint(event);
        const layer = layers.find((item) => item.id === drag.id);
        if (!layer) return;

        updateLayer(drag.id, {
            x: clamp(point.x - drag.offsetX, 0, CANVAS_WIDTH - layer.width),
            y: clamp(point.y - drag.offsetY, 0, CANVAS_HEIGHT - layer.height),
        });
    }

    function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }

    async function renderForSave(side: Side) {
        const canvas = document.createElement("canvas");
        await renderDesign(canvas, layers, side, garmentKind, garmentColor, false);
        return canvas.toDataURL("image/png");
    }

    async function handleSave(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            const frontRender = await renderForSave("front");
            const backRender = hasBackDesign ? await renderForSave("back") : "";
            const frontPrintAsset = await renderPrintAsset(layers, "front");
            const backPrintAsset = hasBackDesign ? await renderPrintAsset(layers, "back") : "";
            const selectedColor = GARMENT_COLORS.find((item) => item.value === garmentColor);
            const designPayload = {
                version: 1,
                templateKey: `merch-tent-${garmentKind}-v1`,
                canvas: {
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                },
                printAsset: {
                    width: PRINT_ASSET_WIDTH,
                    height: PRINT_ASSET_HEIGHT,
                    format: "image/png",
                },
                garment: {
                    kind: garmentKind,
                    color: garmentColor,
                },
                printAreas: PRINT_AREAS,
                layers,
            };

            const formData = new FormData();
            formData.set("title", title);
            formData.set("description", description);
            formData.set("price", price);
            formData.set("category", category);
            formData.set("garment_color", garmentColor);
            formData.set("garment_label", selectedColor?.label ?? "Designed");
            formData.set("design_json", JSON.stringify(designPayload));
            formData.set("front_render", frontRender);
            formData.set("back_render", backRender);
            formData.set("front_print_asset", frontPrintAsset);
            formData.set("back_print_asset", backPrintAsset);
            if (publish) formData.set("publish", "on");

            await createDesignedProductAction(formData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not save design");
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
            <section className="space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <Shirt className="h-4 w-4 text-red-400" />
                        Product
                    </div>

                    <label className="block">
                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                            Title
                        </span>
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            required
                            disabled={isSaving}
                            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
                            placeholder="Tour tee"
                        />
                    </label>

                    <label className="block">
                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                            Description
                        </span>
                        <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            disabled={isSaving}
                            rows={4}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                            placeholder="Drop details"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                                Price
                            </span>
                            <input
                                value={price}
                                onChange={(event) => setPrice(event.target.value)}
                                required
                                min="1"
                                step="0.01"
                                type="number"
                                disabled={isSaving}
                                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
                            />
                        </label>

                        <label className="block">
                            <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                                Category
                            </span>
                            <select
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                disabled={isSaving}
                                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
                            >
                                <option value="tees">Tees</option>
                                <option value="hoodies">Hoodies</option>
                                <option value="tanks">Tanks</option>
                                <option value="posters">Posters</option>
                                <option value="accessories">Accessories</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={publish}
                            disabled={isSaving}
                            onChange={(event) => setPublish(event.target.checked)}
                            className="h-4 w-4 accent-red-600"
                        />
                        Publish now
                    </label>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <AlignCenter className="h-4 w-4 text-red-400" />
                        Garment
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {(["tee", "hoodie"] as GarmentKind[]).map((kind) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => {
                                    setGarmentKind(kind);
                                    setCategory(kind === "hoodie" ? "hoodies" : "tees");
                                }}
                                className={`h-10 rounded-lg border text-sm capitalize ${garmentKind === kind
                                    ? "border-red-500 bg-red-500/15 text-red-100"
                                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                                    }`}
                            >
                                {kind}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {GARMENT_COLORS.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setGarmentColor(item.value)}
                                className={`flex h-10 items-center gap-2 rounded-lg border px-2 text-xs ${garmentColor === item.value
                                    ? "border-red-500 bg-red-500/15"
                                    : "border-neutral-700 bg-neutral-900"
                                    }`}
                            >
                                <span
                                    className="h-4 w-4 rounded-full border border-white/20"
                                    style={{ backgroundColor: item.value }}
                                />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <Layers className="h-4 w-4 text-red-400" />
                        Layers
                    </div>

                    {activeLayers.length === 0 ? (
                        <p className="text-sm text-neutral-500">No {activeSide} layers yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {activeLayers.map((layer) => (
                                <button
                                    key={layer.id}
                                    type="button"
                                    onClick={() => setSelectedLayerId(layer.id)}
                                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${selectedLayerId === layer.id
                                        ? "border-red-500 bg-red-500/10"
                                        : "border-neutral-800 bg-neutral-900"
                                        }`}
                                >
                                    <span className="truncate">
                                        {layer.type === "text" ? layer.text || "Text" : "Image"}
                                    </span>
                                    <span className="text-[11px] uppercase text-neutral-500">{layer.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1">
                        {(["front", "back"] as Side[]).map((side) => (
                            <button
                                key={side}
                                type="button"
                                onClick={() => setActiveSide(side)}
                                className={`h-9 rounded-md px-4 text-sm capitalize ${activeSide === side
                                    ? "bg-red-600 text-white"
                                    : "text-neutral-400 hover:text-white"
                                    }`}
                            >
                                {side}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-neutral-800 px-3 text-sm hover:bg-neutral-700">
                            <ImageIcon className="h-4 w-4" />
                            Image
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                    addImageLayer(event.target.files?.[0] ?? null);
                                    event.target.value = "";
                                }}
                            />
                        </label>
                        <Button type="button" onClick={addTextLayer} variant="secondary">
                            <Type className="mr-2 h-4 w-4" />
                            Text
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className={activeSide === "front" ? "block" : "hidden lg:block opacity-40"}>
                        <canvas
                            ref={frontCanvasRef}
                            className="aspect-[3/4] w-full touch-none rounded-xl border border-neutral-800 bg-neutral-950"
                            onPointerDown={activeSide === "front" ? handlePointerDown : undefined}
                            onPointerMove={activeSide === "front" ? handlePointerMove : undefined}
                            onPointerUp={activeSide === "front" ? handlePointerUp : undefined}
                            onPointerCancel={activeSide === "front" ? handlePointerUp : undefined}
                        />
                        <p className="mt-2 text-center text-xs uppercase tracking-wide text-neutral-500">Front</p>
                    </div>

                    <div className={activeSide === "back" ? "block" : "hidden lg:block opacity-40"}>
                        <canvas
                            ref={backCanvasRef}
                            className="aspect-[3/4] w-full touch-none rounded-xl border border-neutral-800 bg-neutral-950"
                            onPointerDown={activeSide === "back" ? handlePointerDown : undefined}
                            onPointerMove={activeSide === "back" ? handlePointerMove : undefined}
                            onPointerUp={activeSide === "back" ? handlePointerUp : undefined}
                            onPointerCancel={activeSide === "back" ? handlePointerUp : undefined}
                        />
                        <p className="mt-2 text-center text-xs uppercase tracking-wide text-neutral-500">Back</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <RotateCw className="h-4 w-4 text-red-400" />
                        Selection
                    </div>

                    {!selectedLayer ? (
                        <p className="text-sm text-neutral-500">Select a layer to edit it.</p>
                    ) : (
                        <div className="space-y-4">
                            {selectedLayer.type === "text" ? (
                                <>
                                    <label className="block">
                                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                                            Text
                                        </span>
                                        <textarea
                                            value={selectedLayer.text ?? ""}
                                            rows={3}
                                            onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
                                            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                                            Colour
                                        </span>
                                        <input
                                            type="color"
                                            value={selectedLayer.fill ?? "#ffffff"}
                                            onChange={(event) => updateLayer(selectedLayer.id, { fill: event.target.value })}
                                            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900"
                                        />
                                    </label>
                                    <RangeControl
                                        label="Font size"
                                        min={24}
                                        max={160}
                                        value={selectedLayer.fontSize ?? 76}
                                        onChange={(value) =>
                                            updateLayer(selectedLayer.id, {
                                                fontSize: value,
                                                height: value * 1.6,
                                            })
                                        }
                                    />
                                </>
                            ) : null}

                            <RangeControl
                                label="Width"
                                min={80}
                                max={520}
                                value={Math.round(selectedLayer.width)}
                                onChange={(value) => updateLayer(selectedLayer.id, { width: value })}
                            />
                            <RangeControl
                                label="Height"
                                min={60}
                                max={520}
                                value={Math.round(selectedLayer.height)}
                                onChange={(value) => updateLayer(selectedLayer.id, { height: value })}
                            />
                            <RangeControl
                                label="Rotation"
                                min={-45}
                                max={45}
                                value={Math.round(selectedLayer.rotation)}
                                onChange={(value) => updateLayer(selectedLayer.id, { rotation: value })}
                            />
                            <RangeControl
                                label="Opacity"
                                min={10}
                                max={100}
                                value={Math.round(selectedLayer.opacity * 100)}
                                onChange={(value) => updateLayer(selectedLayer.id, { opacity: value / 100 })}
                            />

                            <button
                                type="button"
                                onClick={removeSelectedLayer}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-200 hover:bg-red-500/20"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove layer
                            </button>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                    <label className="block">
                        <span className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                            New text
                        </span>
                        <input
                            value={newText}
                            onChange={(event) => setNewText(event.target.value)}
                            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
                        />
                    </label>

                    {error ? (
                        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </p>
                    ) : null}

                    <Button
                        type="submit"
                        disabled={isSaving || !title || layers.length === 0}
                        className="h-11 w-full bg-red-600 font-black hover:bg-red-500"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save design
                            </>
                        )}
                    </Button>
                </div>
            </section>
        </form>
    );
}

function RangeControl({
    label,
    min,
    max,
    value,
    onChange,
}: {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-neutral-400">
                {label}
                <span>{value}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-red-600"
            />
        </label>
    );
}
