type Point = { x: number; y: number };

type RawImage = {
    data: Buffer;
    width: number;
    height: number;
};

type Vertex = Point & { u: number; v: number };

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function sampleArtwork(image: RawImage, x: number, y: number) {
    const x0 = clamp(Math.floor(x), 0, image.width - 1);
    const y0 = clamp(Math.floor(y), 0, image.height - 1);
    const x1 = Math.min(x0 + 1, image.width - 1);
    const y1 = Math.min(y0 + 1, image.height - 1);
    const dx = x - x0;
    const dy = y - y0;
    const samples = [
        { offset: (y0 * image.width + x0) * 4, weight: (1 - dx) * (1 - dy) },
        { offset: (y0 * image.width + x1) * 4, weight: dx * (1 - dy) },
        { offset: (y1 * image.width + x0) * 4, weight: (1 - dx) * dy },
        { offset: (y1 * image.width + x1) * 4, weight: dx * dy },
    ];
    const alpha = samples.reduce((sum, sample) => sum + image.data[sample.offset + 3] * sample.weight, 0);
    const color = [0, 1, 2].map((channel) => alpha === 0 ? 0 : samples.reduce(
        (sum, sample) => sum + image.data[sample.offset + channel] * image.data[sample.offset + 3] * sample.weight,
        0
    ) / alpha);
    return [...color, alpha];
}

function luminance(data: Buffer, offset: number) {
    return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
}

export function warpArtworkOntoPhoto(photo: RawImage, artwork: RawImage, mesh: Point[][]) {
    const rows = mesh.length;
    const columns = mesh[0]?.length ?? 0;
    if (rows < 2 || columns < 2 || mesh.some((row) => row.length !== columns)) {
        throw new Error("Lifestyle mockup print mesh is invalid.");
    }

    const result = Buffer.alloc(photo.width * photo.height * 4);
    const vertices = mesh.map((row, rowIndex) => row.map((point, columnIndex) => ({
        ...point,
        u: columnIndex * (artwork.width - 1) / (columns - 1),
        v: rowIndex * (artwork.height - 1) / (rows - 1),
    })));
    const photoLuminance = mesh.flat().reduce((sum, point) => {
        const x = clamp(Math.round(point.x), 0, photo.width - 1);
        const y = clamp(Math.round(point.y), 0, photo.height - 1);
        return sum + luminance(photo.data, (y * photo.width + x) * 4);
    }, 0) / (rows * columns);

    function fillTriangle(a: Vertex, b: Vertex, c: Vertex) {
        const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(denominator) < 0.001) return;
        const minX = clamp(Math.floor(Math.min(a.x, b.x, c.x)), 0, photo.width - 1);
        const maxX = clamp(Math.ceil(Math.max(a.x, b.x, c.x)), 0, photo.width - 1);
        const minY = clamp(Math.floor(Math.min(a.y, b.y, c.y)), 0, photo.height - 1);
        const maxY = clamp(Math.ceil(Math.max(a.y, b.y, c.y)), 0, photo.height - 1);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5;
                const py = y + 0.5;
                const weightA = ((b.y - c.y) * (px - c.x) + (c.x - b.x) * (py - c.y)) / denominator;
                const weightB = ((c.y - a.y) * (px - c.x) + (a.x - c.x) * (py - c.y)) / denominator;
                const weightC = 1 - weightA - weightB;
                if (weightA < 0 || weightB < 0 || weightC < 0) continue;

                const u = clamp(weightA * a.u + weightB * b.u + weightC * c.u, 0, artwork.width - 1);
                const v = clamp(weightA * a.v + weightB * b.v + weightC * c.v, 0, artwork.height - 1);
                const ink = sampleArtwork(artwork, u, v);
                const offset = (y * photo.width + x) * 4;
                const fabricLight = luminance(photo.data, offset);
                const lighting = clamp((fabricLight + 28) / (photoLuminance + 28), 0.74, 1.18);

                result[offset] = clamp(Math.round(ink[0] * lighting), 0, 255);
                result[offset + 1] = clamp(Math.round(ink[1] * lighting), 0, 255);
                result[offset + 2] = clamp(Math.round(ink[2] * lighting), 0, 255);
                result[offset + 3] = Math.round(ink[3] * 0.94);
            }
        }
    }

    for (let row = 0; row < rows - 1; row++) {
        for (let column = 0; column < columns - 1; column++) {
            const topLeft = vertices[row][column];
            const topRight = vertices[row][column + 1];
            const bottomLeft = vertices[row + 1][column];
            const bottomRight = vertices[row + 1][column + 1];
            fillTriangle(topLeft, topRight, bottomRight);
            fillTriangle(topLeft, bottomRight, bottomLeft);
        }
    }

    return result;
}
