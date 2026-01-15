"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SUBSCRIPTION_LIMITS,
  SubscriptionTier,
} from "@/lib/subscription";

interface UserBilling {
  subscriptionTier: SubscriptionTier;
  emailsSent: number;
  stripeCustomerId: string | null;
}

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    "5 emails per month",
    "10 sponsor searches",
    "View 20 sponsor details",
    "Basic email templates",
  ],
  STARTER: [
    "50 emails per month",
    "50 sponsor searches",
    "View 100 sponsor details",
    "AI-powered email generation",
    "Email tracking",
  ],
  PRO: [
    "200 emails per month",
    "Unlimited searches",
    "Unlimited sponsor details",
    "AI-powered email generation",
    "Priority support",
  ],
  UNLIMITED: [
    "Unlimited emails",
    "Unlimited searches",
    "Unlimited sponsor details",
    "AI-powered email generation",
    "Priority support",
    "Dedicated account manager",
  ],
};

function BillingContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserBilling | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setMessage({ type: "success", text: "Subscription activated successfully!" });
    } else if (searchParams.get("cancelled") === "true") {
      setMessage({ type: "error", text: "Checkout was cancelled." });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  async function fetchBillingInfo() {
    try {
      const response = await fetch("/api/user/profile");
      const data = await response.json();
      if (response.ok) {
        setUser({
          subscriptionTier: data.user.subscriptionTier,
          emailsSent: data.user.emailsSent,
          stripeCustomerId: data.user.stripeCustomerId,
        });
      }
    } catch {
      console.error("Failed to fetch billing info");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpgrade(tier: SubscriptionTier) {
    if (tier === "FREE") return;

    setUpgrading(tier);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || "Failed to start checkout" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    setManagingBilling(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || "Failed to open billing portal" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setManagingBilling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTier = user?.subscriptionTier || "FREE";
  const tierOrder: SubscriptionTier[] = ["FREE", "STARTER", "PRO", "UNLIMITED"];
  const currentTierIndex = tierOrder.indexOf(currentTier);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing</h1>
        {user?.stripeCustomerId && (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={managingBilling}
          >
            {managingBilling ? "Loading..." : "Manage Billing"}
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className="text-lg px-4 py-1" variant="secondary">
              {currentTier}
            </Badge>
            <span className="text-neutral-500">
              {SUBSCRIPTION_LIMITS[currentTier].price === 0
                ? "Free"
                : `$${SUBSCRIPTION_LIMITS[currentTier].price}/month`}
            </span>
          </div>
          <div className="mt-4 text-sm text-neutral-600">
            <p>
              Emails used this month:{" "}
              <span className="font-medium">
                {user?.emailsSent || 0} /{" "}
                {SUBSCRIPTION_LIMITS[currentTier].emailsPerMonth === -1
                  ? "Unlimited"
                  : SUBSCRIPTION_LIMITS[currentTier].emailsPerMonth}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tierOrder.map((tier, index) => {
          const limits = SUBSCRIPTION_LIMITS[tier];
          const features = TIER_FEATURES[tier];
          const isCurrent = tier === currentTier;
          const isDowngrade = index < currentTierIndex;
          const isPopular = tier === "PRO";

          return (
            <Card
              key={tier}
              className={`relative ${
                isPopular ? "border-blue-500 border-2" : ""
              } ${isCurrent ? "bg-neutral-50" : ""}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-500">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tier}
                  {isCurrent && (
                    <Badge variant="outline" className="ml-auto">
                      Current
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {limits.price === 0 ? (
                    <span className="text-2xl font-bold text-neutral-900">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-neutral-900">
                        ${limits.price}
                      </span>
                      <span className="text-neutral-500">/month</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 shrink-0 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={!user?.stripeCustomerId || managingBilling}
                  >
                    Downgrade
                  </Button>
                ) : tier === "FREE" ? (
                  <Button className="w-full" variant="outline" disabled>
                    Free Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading === tier}
                  >
                    {upgrading === tier ? "Loading..." : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Billing FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">When do my email limits reset?</h3>
            <p className="text-sm text-neutral-600">
              Email limits reset on the first day of each billing cycle.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Can I cancel anytime?</h3>
            <p className="text-sm text-neutral-600">
              Yes, you can cancel your subscription at any time. You&apos;ll
              continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium">What payment methods do you accept?</h3>
            <p className="text-sm text-neutral-600">
              We accept all major credit cards including Visa, Mastercard, and
              American Express.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Billing</h1>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-neutral-500">Loading...</div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
