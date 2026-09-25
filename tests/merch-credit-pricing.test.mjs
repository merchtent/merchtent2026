import assert from "node:assert/strict";
import test from "node:test";

import {
  merchCreditDiscountCents,
  MERCH_CREDIT_REDEMPTION_CENTS,
  MERCH_CREDIT_REDEMPTION_POINTS,
} from "../src/lib/merch-credits/constants.ts";

test("20 merch credits are worth a fixed AUD $20 merchandise discount", () => {
  assert.equal(MERCH_CREDIT_REDEMPTION_POINTS, 20);
  assert.equal(MERCH_CREDIT_REDEMPTION_CENTS, 2_000);
  assert.equal(
    merchCreditDiscountCents({ subtotalCents: 3_900, creditBalance: 20 }),
    2_000
  );
});

test("merch credits do not redeem with an insufficient balance or merchandise subtotal", () => {
  assert.equal(
    merchCreditDiscountCents({ subtotalCents: 3_900, creditBalance: 19 }),
    0
  );
  assert.equal(
    merchCreditDiscountCents({ subtotalCents: 1_999, creditBalance: 20 }),
    0
  );
});
