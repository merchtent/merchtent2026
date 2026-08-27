import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";

const SMS_REQUEST_TIMEOUT_MS = 15_000;

async function readProviderResponse(response: Response) {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export async function sendSms(to: string, message: string, ref?: string) {
    try {
        const username = serverEnv.mobileMessageUsername();
        const password = serverEnv.mobileMessagePassword();

        const body = {
            enable_unicode: true,
            messages: [
                {
                    to,
                    message,
                    sender: "61485900133",
                    custom_ref: ref ?? undefined
                }
            ]
        };

        const auth = Buffer.from(`${username}:${password}`).toString("base64");

        const res = await fetch("https://api.mobilemessage.com.au/v1/messages", {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS)
        });

        const providerResponse = await readProviderResponse(res);

        if (!res.ok) {
            throw new Error(`MobileMessage request failed with ${res.status}`);
        }

        return providerResponse;
    } catch (err) {
        logger.error("SMS send failed", {
            error: err instanceof Error ? err.message : String(err),
        });
        throw new Error("Could not send SMS message.");
    }
}

export function normalisePhone(phone?: string | null): string | null {
    if (!phone) return null;

    let p = phone.replace(/\s+/g, "");

    // convert 04xxxxxxxx → 614xxxxxxxx
    if (p.startsWith("04")) {
        p = "61" + p.substring(1);
    }

    // convert +614 → 614
    if (p.startsWith("+61")) {
        p = p.substring(1);
    }

    return p;
}
