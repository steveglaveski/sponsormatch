"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SPORT_TYPES } from "@/lib/constants";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  clubName: string | null;
  clubSport: string | null;
  clubAddress: string | null;
  subscriptionTier: string;
  emailsSent: number;
  createdAt: string;
  gmailConnected: boolean;
  gmailEmail: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubSport, setClubSport] = useState("");
  const [clubAddress, setClubAddress] = useState("");

  // Handle Gmail OAuth callback params
  useEffect(() => {
    const gmailConnected = searchParams.get("gmail_connected");
    const gmailError = searchParams.get("gmail_error");

    if (gmailConnected === "true") {
      setSuccess("Gmail connected successfully! Emails will now be sent from your Gmail account.");
      // Clear URL params
      router.replace("/settings");
    } else if (gmailError) {
      const errorMessages: Record<string, string> = {
        access_denied: "You declined Gmail access. You can try again anytime.",
        missing_params: "Something went wrong. Please try again.",
        invalid_state: "Session expired. Please try again.",
        expired_state: "Session expired. Please try again.",
        token_exchange_failed: "Failed to connect Gmail. Please try again.",
        no_refresh_token: "Failed to get Gmail permissions. Please try again.",
        userinfo_failed: "Failed to get Gmail info. Please try again.",
        callback_failed: "Something went wrong. Please try again.",
      };
      setError(errorMessages[gmailError] || "Failed to connect Gmail. Please try again.");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load profile");
        return;
      }

      setUser(data.user);
      setName(data.user.name || "");
      setClubName(data.user.clubName || "");
      setClubSport(data.user.clubSport || "");
      setClubAddress(data.user.clubAddress || "");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          clubName,
          clubSport,
          clubAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save profile");
        return;
      }

      setUser(data.user);
      setSuccess("Profile saved successfully!");

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnectGmail() {
    setIsDisconnectingGmail(true);
    setError("");

    try {
      const response = await fetch("/api/gmail/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to disconnect Gmail");
        return;
      }

      // Update local state
      if (user) {
        setUser({ ...user, gmailConnected: false, gmailEmail: null });
      }
      setSuccess("Gmail disconnected. Emails will now be sent via SponsorMatch.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsDisconnectingGmail(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-neutral-500">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Club Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Club Profile</CardTitle>
              <CardDescription>
                This information is used to personalise your sponsorship outreach
                emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-neutral-500">
                    Used in email signatures
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name *</Label>
                  <Input
                    id="clubName"
                    placeholder="Melbourne City FC"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubSport">Sport *</Label>
                  <Select
                    value={clubSport}
                    onValueChange={setClubSport}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="clubSport">
                      <SelectValue placeholder="Select a sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_TYPES.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubAddress">Club Location *</Label>
                  <Input
                    id="clubAddress"
                    placeholder="123 Main St, Melbourne VIC 3000"
                    value={clubAddress}
                    onChange={(e) => setClubAddress(e.target.value)}
                    required
                    disabled={isSaving}
                  />
                  <p className="text-xs text-neutral-500">
                    Full address including suburb and state
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving || !clubName || !clubSport || !clubAddress}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-neutral-500">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-neutral-500">Member Since</Label>
                <p className="font-medium">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Current Plan</span>
                <Badge variant="secondary" className="capitalize">
                  {user?.subscriptionTier?.toLowerCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Emails Sent</span>
                <span className="font-medium">{user?.emailsSent || 0}</span>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push("/settings/billing")}
              >
                {user?.subscriptionTier === "FREE" ? "Upgrade Plan" : "Manage Billing"}
              </Button>
            </CardContent>
          </Card>

          {/* Gmail Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Email Sending</CardTitle>
              <CardDescription>
                Connect Gmail to send emails directly from your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.gmailConnected ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm text-green-700">Gmail Connected</span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Emails sent from: <span className="font-medium">{user.gmailEmail}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleDisconnectGmail}
                    disabled={isDisconnectingGmail}
                  >
                    {isDisconnectingGmail ? "Disconnecting..." : "Disconnect Gmail"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-600">
                    Connect your Gmail to send sponsorship emails directly from your own email address.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => window.location.href = "/api/gmail/connect"}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect Gmail
                  </Button>
                  <p className="text-xs text-neutral-500">
                    We only request permission to send emails on your behalf.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Complete your profile to enable AI email generation
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Use your official club name for credibility
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  Include suburb and state in your address
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
