import { NextResponse, type NextRequest } from "next/server";

function originFromEnvironment(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const supabaseOrigin = originFromEnvironment(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseSocketOrigin = supabaseOrigin?.replace(/^https:/, "wss:");
  const developmentScriptSource = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const upgradeInsecureRequests = process.env.NODE_ENV === "production" ? "upgrade-insecure-requests;" : "";
  const connectSources = [
    "'self'",
    supabaseOrigin,
    supabaseSocketOrigin,
    "https://*.ingest.sentry.io",
  ].filter(Boolean).join(" ");
  const imageSources = [
    "'self'",
    "blob:",
    "data:",
    "https://images.unsplash.com",
    "https://plus.unsplash.com",
    "https://picsum.photos",
    supabaseOrigin,
  ].filter(Boolean).join(" ");

  const contentSecurityPolicy = [
    "default-src 'self';",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptSource};`,
    "style-src 'self' 'unsafe-inline';",
    `img-src ${imageSources};`,
    "font-src 'self' data:;",
    `connect-src ${connectSources};`,
    "media-src 'self' blob:;",
    "worker-src 'self' blob:;",
    "object-src 'none';",
    "base-uri 'self';",
    "form-action 'self' https://checkout.stripe.com;",
    "frame-src https://js.stripe.com https://hooks.stripe.com;",
    "frame-ancestors 'none';",
    upgradeInsecureRequests,
  ].filter(Boolean).join(" ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
