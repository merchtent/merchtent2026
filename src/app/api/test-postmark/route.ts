// app/api/test-basic-postmark/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServerClient } from "postmark";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    const expectedSecret = process.env.POSTMARK_TEST_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serverToken = process.env.POSTMARK_SERVER_TOKEN;
    const from = process.env.POSTMARK_FROM;
    const to =
        process.env.POSTMARK_TEST_CUSTOMER_EMAIL ||
        process.env.POSTMARK_ADMIN_TO ||
        null;

    if (!serverToken || !from || !to) {
        return NextResponse.json(
            {
                error: "Missing POSTMARK_SERVER_TOKEN, POSTMARK_FROM, or recipient email.",
            },
            { status: 500 }
        );
    }

    const client = new ServerClient(serverToken);

    try {
        const response = await client.sendEmailWithTemplate({
            From: from,
            To: to,
            TemplateAlias: "order-confirmation", // <-- make sure this matches your Postmark template alias
            TemplateModel: {
                order_number: "TEST-ORDER-1234",
                store_name: process.env.STORE_NAME || "Merch Tent",
            },
        });

        return NextResponse.json({
            ok: true,
            to,
            postmarkMessageId: response.MessageID,
        });
    } catch (err: any) {
        console.error("❌ Postmark basic test failed:", err);
        return NextResponse.json(
            {
                error: "Failed to send Postmark test email",
                detail: err?.message ?? String(err),
            },
            { status: 500 }
        );
    }
}
