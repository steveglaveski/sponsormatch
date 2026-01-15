// Define SubscriptionTier locally to avoid dependency on generated Prisma client
export type SubscriptionTier = "FREE" | "STARTER" | "PRO" | "UNLIMITED";

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    price: number;
    emailsPerMonth: number;
    searchesPerMonth: number;
    sponsorDetailsVisible: number;
  }
> = {
  FREE: {
    price: 0,
    emailsPerMonth: 5,
    searchesPerMonth: 10,
    sponsorDetailsVisible: 20,
  },
  STARTER: {
    price: 29, // AUD per month
    emailsPerMonth: 50,
    searchesPerMonth: 50,
    sponsorDetailsVisible: 100,
  },
  PRO: {
    price: 79, // AUD per month
    emailsPerMonth: 200,
    searchesPerMonth: -1, // unlimited
    sponsorDetailsVisible: -1, // unlimited
  },
  UNLIMITED: {
    price: 149, // AUD per month
    emailsPerMonth: -1, // unlimited
    searchesPerMonth: -1,
    sponsorDetailsVisible: -1,
  },
};

// Credit packs for one-time purchases
export const CREDIT_PACKS = [
  { emails: 20, price: 19 },
  { emails: 50, price: 39 },
  { emails: 100, price: 69 },
] as const;

export function canSendEmail(
  tier: SubscriptionTier,
  emailsSent: number
): boolean {
  const limit = SUBSCRIPTION_LIMITS[tier].emailsPerMonth;
  return limit === -1 || emailsSent < limit;
}

export function getRemainingEmails(
  tier: SubscriptionTier,
  emailsSent: number
): number | "unlimited" {
  const limit = SUBSCRIPTION_LIMITS[tier].emailsPerMonth;
  if (limit === -1) return "unlimited";
  return Math.max(0, limit - emailsSent);
}
