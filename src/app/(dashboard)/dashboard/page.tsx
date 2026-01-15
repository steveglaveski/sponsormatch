import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_LIMITS, type SubscriptionTier } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecentSearches } from "@/components/recent-searches";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      clubName: true,
      clubSport: true,
      subscriptionTier: true,
      emailsSent: true,
      _count: {
        select: {
          searches: true,
          emailOutreach: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const limits = SUBSCRIPTION_LIMITS[user.subscriptionTier as SubscriptionTier];
  const emailsRemaining =
    limits.emailsPerMonth === -1
      ? "Unlimited"
      : Math.max(0, limits.emailsPerMonth - user.emailsSent);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-neutral-600 mt-1">
          {user.clubName
            ? `Managing sponsorships for ${user.clubName}`
            : "Set up your club details to get started"}
        </p>
      </div>

      {!user.clubName && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg">Complete your profile</CardTitle>
            <CardDescription>
              Add your club details to get personalised sponsor recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings">Add Club Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Emails Sent</CardDescription>
            <CardTitle className="text-4xl">{user.emailsSent}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">
              {emailsRemaining} remaining this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Searches</CardDescription>
            <CardTitle className="text-4xl">{user._count.searches}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">Total sponsor searches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan</CardDescription>
            <CardTitle className="text-4xl capitalize">
              {user.subscriptionTier.toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.subscriptionTier === "FREE" && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/billing">Upgrade</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Find Sponsors</CardTitle>
            <CardDescription>
              Discover companies sponsoring sports clubs in your area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/search">Start Search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
            <CardDescription>
              View and track your outreach emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/email/history">View History</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <RecentSearches />
    </div>
  );
}
