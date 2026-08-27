export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred") {
    return error instanceof Error ? error.message : fallback;
}
