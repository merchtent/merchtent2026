import "server-only";

const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

export function csvCell(value: string) {
    const safeValue = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
}
