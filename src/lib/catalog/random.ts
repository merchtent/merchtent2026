import "server-only";

import { randomInt } from "node:crypto";

export function shuffleWithCrypto<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(index + 1);
        [shuffled[index], shuffled[swapIndex]] = [
            shuffled[swapIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}
