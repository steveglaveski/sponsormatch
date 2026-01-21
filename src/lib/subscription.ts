// Define SubscriptionTier locally to avoid dependency on generated Prisma client
export type SubscriptionTier = "FREE" | "STARTER" | "PRO" | "UNLIMITED";

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionTier,
  {
    price: number;
    emailsPerMonth: number;
    searchesPerMonth: number;
    clubsWithSponsorsVisible: number;
    contactRevealsPerMonth: number;
  }
> = {
  FREE: {
    price: 0,
    emailsPerMonth: 5,
    searchesPerMonth: 10,
    clubsWithSponsorsVisible: 5,
    contactRevealsPerMonth: 5,
  },
  STARTER: {
    price: 29, // AUD per month
    emailsPerMonth: 50,
    searchesPerMonth: 50,
    clubsWithSponsorsVisible: 50,
    contactRevealsPerMonth: 100,
  },
  PRO: {
    price: 79, // AUD per month
    emailsPerMonth: 200,
    searchesPerMonth: -1, // unlimited
    clubsWithSponsorsVisible: -1, // unlimited
    contactRevealsPerMonth: -1, // unlimited
  },
  UNLIMITED: {
    price: 149, // AUD per month
    emailsPerMonth: -1, // unlimited
    searchesPerMonth: -1,
    clubsWithSponsorsVisible: -1,
    contactRevealsPerMonth: -1, // unlimited
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

export function canViewClubSponsors(
  tier: SubscriptionTier,
  clubsViewed: string[],
  clubId: string
): boolean {
  // If already viewed this club, always allow
  if (clubsViewed.includes(clubId)) return true;

  const limit = SUBSCRIPTION_LIMITS[tier].clubsWithSponsorsVisible;
  // Unlimited
  if (limit === -1) return true;
  // Check if under limit
  return clubsViewed.length < limit;
}

export function getRemainingClubViews(
  tier: SubscriptionTier,
  clubsViewedCount: number
): number | "unlimited" {
  const limit = SUBSCRIPTION_LIMITS[tier].clubsWithSponsorsVisible;
  if (limit === -1) return "unlimited";
  return Math.max(0, limit - clubsViewedCount);
}

export function canRevealContact(
  tier: SubscriptionTier,
  contactReveals: number
): boolean {
  const limit = SUBSCRIPTION_LIMITS[tier].contactRevealsPerMonth;
  return limit === -1 || contactReveals < limit;
}

export function getRemainingContactReveals(
  tier: SubscriptionTier,
  contactReveals: number
): number | "unlimited" {
  const limit = SUBSCRIPTION_LIMITS[tier].contactRevealsPerMonth;
  if (limit === -1) return "unlimited";
  return Math.max(0, limit - contactReveals);
}
