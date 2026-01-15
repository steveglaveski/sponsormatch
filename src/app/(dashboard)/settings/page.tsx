"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubSport, setClubSport] = useState("");
  const [clubAddress, setClubAddress] = useState("");

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
