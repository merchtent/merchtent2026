import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env.server";

export const STRIPE_API_TIMEOUT_MS = 20_000;
export const STRIPE_MAX_NETWORK_RETRIES = 2;

export const stripe = new Stripe(serverEnv.stripeSecretKey(), {
    timeout: STRIPE_API_TIMEOUT_MS,
    maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
});
