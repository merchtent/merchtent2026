const baseUrl = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
const operationalHealthSecret = process.env.OPERATIONAL_HEALTH_SECRET || "";

if (!baseUrl) {
  console.error("Set SMOKE_BASE_URL or NEXT_PUBLIC_SITE_URL before running smoke checks.");
  process.exit(1);
}

const origin = new URL(baseUrl);
origin.pathname = "/";
origin.search = "";
origin.hash = "";

const checks = [
  {
    name: "home",
    path: "/",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertIncludes(body, "<html", "homepage html shell");
    },
  },
  {
    name: "shop catalog",
    path: "/new",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertIncludes(body, "<html", "new products html shell");
    },
  },
  {
    name: "cart",
    path: "/cart",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertIncludes(body, "<html", "cart html shell");
    },
  },
  {
    name: "checkout",
    path: "/checkout",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertIncludes(body, "<html", "checkout html shell");
    },
  },
  {
    name: "health",
    path: "/api/health",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertNoStore(response);
      const payload = JSON.parse(body);
      if (payload.ok !== true || payload.status !== "ok") {
        throw new Error(`health returned degraded payload: ${body}`);
      }
    },
  },
  {
    name: "operational health",
    path: "/api/health/operations",
    headers: operationalHealthSecret
      ? { Authorization: `Bearer ${operationalHealthSecret}` }
      : {},
    expect: async (response, body) => {
      if (!operationalHealthSecret) {
        assertStatus(response, 401);
        return;
      }

      assertStatus(response, 200);
      assertNoStore(response);
      const payload = JSON.parse(body);
      if (payload.ok !== true || payload.status !== "ok") {
        throw new Error(`operational health returned degraded payload: ${body}`);
      }
    },
  },
  {
    name: "operations maintenance",
    path: "/api/operations/maintenance",
    method: "POST",
    headers: operationalHealthSecret
      ? { Authorization: `Bearer ${operationalHealthSecret}` }
      : {},
    expect: async (response, body) => {
      if (!operationalHealthSecret) {
        assertStatus(response, 401);
        return;
      }

      assertStatus(response, 200);
      assertNoStore(response);
      const payload = JSON.parse(body);
      if (payload.ok !== true || payload.status !== "ok" || !Array.isArray(payload.tasks)) {
        throw new Error(`operations maintenance returned degraded payload: ${body}`);
      }
      if (payload.audit_logged !== true) {
        throw new Error(`operations maintenance did not confirm audit logging: ${body}`);
      }
      assertMaintenanceTasks(payload.tasks, [
        "expire_stale_merch_credit_reservations",
        "mark_stale_stripe_webhooks_failed",
        "mark_stale_notification_deliveries_failed",
        "mark_stale_printify_order_syncs_failed",
        "mark_stale_printify_product_syncs_failed",
        "mark_stale_product_generations_failed",
      ]);
    },
  },
  {
    name: "dev-only Postmark endpoint unavailable",
    path: "/api/test-postmark",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-postmark-test-secret": "smoke-check",
    },
    body: "{}",
    expect: async (response) => {
      assertStatus(response, 404);
      assertNoStore(response);
    },
  },
  {
    name: "robots",
    path: "/robots.txt",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertIncludes(body, "Sitemap:", "robots sitemap declaration");
    },
  },
  {
    name: "sitemap",
    path: "/sitemap.xml",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertIncludes(body, "<urlset", "sitemap urlset");
    },
  },
  {
    name: "products api",
    path: "/api/products",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertPublicApiCache(response);
      const payload = JSON.parse(body);
      if (!Array.isArray(payload.products)) {
        throw new Error("products api did not return a products array");
      }
    },
  },
  {
    name: "artists api",
    path: "/api/artists",
    expect: async (response, body) => {
      assertStatus(response, 200);
      assertSecurityHeaders(response);
      assertPublicApiCache(response);
      const payload = JSON.parse(body);
      if (!Array.isArray(payload.artists)) {
        throw new Error("artists api did not return an artists array");
      }
    },
  },
];

for (const check of checks) {
  const url = new URL(check.path, origin).toString();

  try {
    const response = await fetch(url, {
      method: check.method ?? "GET",
      headers: {
        "User-Agent": "MerchTentSmokeCheck/1.0",
        ...(check.headers ?? {}),
      },
      body: check.body,
    });
    const body = await response.text();
    await check.expect(response, body);
    console.log(`ok ${check.name} ${url}`);
  } catch (error) {
    console.error(`failed ${check.name} ${url}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function assertStatus(response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(`expected HTTP ${expectedStatus}, received HTTP ${response.status}`);
  }
}

function assertIncludes(body, expected, label) {
  if (!body.includes(expected)) {
    throw new Error(`missing ${label}`);
  }
}

function assertSecurityHeaders(response) {
  assertHeaderIncludes(
    response,
    "strict-transport-security",
    "max-age=63072000",
    "strict transport security"
  );
  assertHeaderEquals(response, "x-content-type-options", "nosniff");
  assertHeaderEquals(response, "x-frame-options", "DENY");
  assertHeaderIncludes(response, "referrer-policy", "strict-origin-when-cross-origin", "referrer policy");
  assertHeaderIncludes(response, "permissions-policy", "camera=()", "permissions policy");
}

function assertHeaderEquals(response, header, expected) {
  const actual = response.headers.get(header);
  if (actual !== expected) {
    throw new Error(`expected ${header} header ${expected}, received ${actual ?? "missing"}`);
  }
}

function assertHeaderIncludes(response, header, expected, label) {
  const actual = response.headers.get(header);
  if (!actual?.includes(expected)) {
    throw new Error(`missing ${label} header value ${expected}`);
  }
}

function assertNoStore(response) {
  assertHeaderIncludes(response, "cache-control", "no-store", "no-store cache control");
  assertHeaderIncludes(response, "cache-control", "max-age=0", "no-store max-age");
  assertHeaderEquals(response, "pragma", "no-cache");
  assertHeaderEquals(response, "expires", "0");
}

function assertPublicApiCache(response) {
  assertHeaderIncludes(response, "cache-control", "s-maxage=60", "public api cache control");
  assertHeaderIncludes(response, "cache-control", "stale-while-revalidate=300", "public api cache control");
  assertHeaderIncludes(response, "vary", "Accept", "public api vary");
  assertHeaderEquals(response, "x-content-type-options", "nosniff");
}

function assertMaintenanceTasks(tasks, expectedNames) {
  const tasksByName = new Map(
    tasks
      .filter((task) => task?.name)
      .map((task) => [task.name, task])
  );

  for (const expectedName of expectedNames) {
    const task = tasksByName.get(expectedName);

    if (!task) {
      throw new Error(`operations maintenance response missing task ${expectedName}`);
    }

    if (task.ok !== true) {
      throw new Error(`operations maintenance task ${expectedName} did not report ok`);
    }

    if (!Number.isFinite(task.count) || task.count < 0) {
      throw new Error(`operations maintenance task ${expectedName} returned invalid count`);
    }

    if (!Number.isFinite(task.duration_ms) || task.duration_ms < 0) {
      throw new Error(`operations maintenance task ${expectedName} returned invalid duration_ms`);
    }
  }
}
