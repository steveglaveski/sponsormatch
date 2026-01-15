import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        emailsSent: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get search count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const searchesThisMonth = await prisma.search.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Get total searches
    const totalSearches = await prisma.search.count({
      where: { userId },
    });

    // Get email stats
    const emailStats = await prisma.emailOutreach.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    });

    const emailsByStatus: Record<string, number> = {};
    emailStats.forEach((stat) => {
      emailsByStatus[stat.status] = stat._count;
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSearches = await prisma.search.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const recentEmails = await prisma.emailOutreach.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Get unique sponsors contacted
    const uniqueSponsorsContacted = await prisma.emailOutreach.groupBy({
      by: ["sponsorId"],
      where: { userId },
    });

    // Get clubs discovered (from search results)
    const clubsDiscovered = await prisma.searchResult.count({
      where: {
        search: { userId },
      },
    });

    // Calculate limits
    const tier = user.subscriptionTier as SubscriptionTier;
    const limits = SUBSCRIPTION_LIMITS[tier];

    return NextResponse.json({
      usage: {
        // Current period usage
        emailsSent: user.emailsSent,
        emailLimit: limits.emailsPerMonth,
        searchesThisMonth,
        searchLimit: limits.searchesPerMonth,

        // All-time stats
        totalSearches,
        totalEmails: Object.values(emailsByStatus).reduce((a, b) => a + b, 0),
        emailsByStatus,
        uniqueSponsorsContacted: uniqueSponsorsContacted.length,
        clubsDiscovered,

        // Recent activity
        recentSearches,
        recentEmails,

        // Account info
        subscriptionTier: tier,
        memberSince: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Usage fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
