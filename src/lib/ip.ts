import { headers } from "next/headers";
import { prisma } from "./prisma";
import { MAX_ACCOUNTS_PER_IP, WHITELISTED_IPS } from "./constants";

/**
 * Get the client IP address from request headers
 * Checks x-forwarded-for (for proxied requests) and x-real-ip
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  // Check x-forwarded-for first (common for proxied requests like Vercel)
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first is the client
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // Check x-real-ip
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback headers used by various providers
  const cfConnectingIp = headersList.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIp) return cfConnectingIp;

  return null;
}

/**
 * Check if an IP is whitelisted
 */
export function isIpWhitelisted(ip: string): boolean {
  return WHITELISTED_IPS.includes(ip as any);
}

/**
 * Check if a new signup should be allowed from this IP
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function canSignupFromIp(ip: string | null): Promise<{
  allowed: boolean;
  reason?: string;
  existingAccounts?: number;
}> {
  // If we couldn't determine IP, allow signup but log it
  if (!ip) {
    console.warn("Could not determine client IP for signup check");
    return { allowed: true };
  }

  // Whitelisted IPs always allowed
  if (isIpWhitelisted(ip)) {
    return { allowed: true };
  }

  // Count existing accounts from this IP
  const existingAccounts = await prisma.user.count({
    where: { signupIp: ip },
  });

  if (existingAccounts >= MAX_ACCOUNTS_PER_IP) {
    return {
      allowed: false,
      reason: `Maximum accounts (${MAX_ACCOUNTS_PER_IP}) already created from this network. Please contact support if you need assistance.`,
      existingAccounts,
    };
  }

  return { allowed: true, existingAccounts };
}
