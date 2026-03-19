export async function sendSms(to: string, message: string, ref?: string) {
    try {
        const username = process.env.MOBILEMESSAGE_USERNAME!;
        const password = process.env.MOBILEMESSAGE_PASSWORD!;

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
            body: JSON.stringify(body)
        });

        const json = await res.json();

        console.log("SMS response", json);

        return json;
    } catch (err) {
        console.error("SMS send failed", err);
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