import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("order service cases cover returns, reprints, refunds and cancellations", async () => {
  const migration = await read("supabase/migrations/202609220002_order_service_cases.sql");
  const createRoute = await read("src/app/api/admin/orders/[id]/cases/route.ts");
  const updateRoute = await read("src/app/api/admin/order-cases/[caseId]/route.ts");
  const component = await read("src/components/admin/OrderServiceCases.tsx");

  for (const type of ["return", "reprint", "refund", "cancellation"]) {
    assert.match(migration, new RegExp(`'${type}'`));
  }
  assert.match(migration, /order_service_case_events/);
  assert.match(migration, /order_reprint_jobs/);
  assert.match(migration, /order_service_case_operational_exceptions/);
  assert.match(migration, /security definer[\s\S]*set search_path = public/i);
  assert.match(migration, /revoke all on function public\.admin_create_order_service_case/);
  assert.match(createRoute, /requireAdmin\(request\)/);
  assert.match(updateRoute, /requireAdmin\(request\)/);
  assert.match(component, /Affected items/);
  assert.match(component, /Supplier reference/);
});

test("refund and cancellation actions create resolved service cases", async () => {
  const route = await read("src/app/api/admin/orders/[id]/terminal-action/route.ts");
  assert.match(route, /admin_complete_order_terminal_action/);
  assert.match(route, /admin_create_order_service_case/);
  assert.match(route, /admin_update_order_service_case/);
  assert.match(route, /p_status: "resolved"/);
});

test("Sentry captures Next.js server, edge, route and browser failures", async () => {
  const instrumentation = await read("src/instrumentation.ts");
  const client = await read("src/instrumentation-client.ts");
  const server = await read("sentry.server.config.ts");
  const edge = await read("sentry.edge.config.ts");
  const globalError = await read("src/app/global-error.tsx");
  const logger = await read("src/lib/logger.ts");
  const nextConfig = await read("next.config.ts");
  const testRoute = await read("src/app/api/admin/monitoring/test/route.ts");

  assert.match(instrumentation, /captureRequestError/);
  assert.match(client, /captureRouterTransitionStart/);
  assert.match(server, /sendDefaultPii: false/);
  assert.match(edge, /sendDefaultPii: false/);
  assert.match(globalError, /captureException\(error\)/);
  assert.match(logger, /captureMessage\(payload\.message, "error"\)/);
  assert.match(nextConfig, /withSentryConfig/);
  assert.match(testRoute, /requireAdmin\(request\)/);
  assert.match(testRoute, /captureMessage/);
});

test("release gates require current restore and supplier outage drill evidence", async () => {
  const checklist = await read("PRODUCTION_RELEASE_CHECKLIST.md");
  const recovery = await read("PRODUCTION_RECOVERY_DRILL.md");
  const validator = await read("scripts/validate-operational-drills.mjs");

  assert.match(checklist, /npm run ops:drills:check/);
  assert.match(checklist, /Supplier outage drill/);
  assert.match(recovery, /## Supplier Outage Drill/);
  assert.match(validator, /backup_restore/);
  assert.match(validator, /supplier_outage/);
  assert.match(validator, /older than/);
});
