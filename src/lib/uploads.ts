const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function validateImageFile(file: File) {
    if (file.size <= 0) {
        throw new Error("Image file is empty");
    }

    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image file must be 8MB or smaller");
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error("Image file must be a JPEG, PNG, or WebP");
    }
}

export function requestExceedsImageUploadLimit(request: Request) {
    const rawContentLength = request.headers.get("content-length");
    if (!rawContentLength) return false;

    const contentLength = Number(rawContentLength);
    return Number.isFinite(contentLength) && contentLength > MAX_IMAGE_MULTIPART_BYTES;
}

export function validateImageBytes(bytes: ArrayBuffer | ArrayBufferView, declaredType: string) {
    const signature = bytes instanceof ArrayBuffer
        ? new Uint8Array(bytes)
        : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const detectedType = detectImageMimeType(signature);

    if (!detectedType) {
        throw new Error("Image file contents must be a JPEG, PNG, or WebP");
    }

    if (declaredType && declaredType !== detectedType) {
        throw new Error("Image file type does not match its contents");
    }

    return detectedType;
}

export function safeUploadFilename(name: string) {
    const cleaned = name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return cleaned || "upload";
}

export function imageExtensionForMimeType(contentType: string) {
    switch (contentType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        default:
            throw new Error("Unsupported image content type");
    }
}

export function safeImageUploadFilename(name: string, contentType: string) {
    const safeName = safeUploadFilename(name);
    const baseName = safeName.replace(/\.[^.]+$/, "") || "upload";
    return `${baseName}.${imageExtensionForMimeType(contentType)}`;
}

export function decodeStrictBase64ImagePayload(value: string) {
    if (!value || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
        throw new Error("Image data must be valid base64");
    }

    return Buffer.from(value, "base64");
}

function detectImageMimeType(signature: Uint8Array) {
    if (
        signature.length >= 3 &&
        signature[0] === 0xff &&
        signature[1] === 0xd8 &&
        signature[2] === 0xff
    ) {
        return "image/jpeg";
    }

    if (
        signature.length >= PNG_SIGNATURE.length &&
        PNG_SIGNATURE.every((byte, index) => signature[index] === byte)
    ) {
        return "image/png";
    }

    if (
        signature.length >= 12 &&
        signature[0] === 0x52 &&
        signature[1] === 0x49 &&
        signature[2] === 0x46 &&
        signature[3] === 0x46 &&
        signature[8] === 0x57 &&
        signature[9] === 0x45 &&
        signature[10] === 0x42 &&
        signature[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}
