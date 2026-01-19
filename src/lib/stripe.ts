import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: STRIPE_SECRET_KEY not set. Stripe features disabled.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

// Stripe Price IDs - set these in your Stripe dashboard and add to .env
export const STRIPE_PRICES = {
  STARTER: process.env.STRIPE_PRICE_STARTER || "",
  PRO: process.env.STRIPE_PRICE_PRO || "",
  UNLIMITED: process.env.STRIPE_PRICE_UNLIMITED || "",
} as const;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Map price IDs back to tiers
export function getTierFromPriceId(
  priceId: string
): "STARTER" | "PRO" | "UNLIMITED" | null {
  if (priceId === STRIPE_PRICES.STARTER) return "STARTER";
  if (priceId === STRIPE_PRICES.PRO) return "PRO";
  if (priceId === STRIPE_PRICES.UNLIMITED) return "UNLIMITED";
  return null;
}
