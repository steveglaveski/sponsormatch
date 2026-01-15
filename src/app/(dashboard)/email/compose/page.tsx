"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SponsorInfo {
  id: string;
  name: string;
  email: string | null;
  contactName: string | null;
}

function EmailComposerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sponsorId = searchParams.get("sponsorId");
  const clubName = searchParams.get("clubName");

  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Generate email on load if we have a sponsorId
  useEffect(() => {
    if (sponsorId) {
      generateEmail();
    }
  }, [sponsorId]);

  async function generateEmail() {
    if (!sponsorId) return;

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId,
          clubName,
          customNotes: customNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INCOMPLETE_PROFILE") {
          setError("Please complete your club profile in Settings before sending emails.");
        } else {
          setError(data.error || "Failed to generate email");
        }
        return;
      }

      setSponsor(data.sponsor);
      setSubject(data.subject);
      setBody(data.body);

      if (data.sponsor.email) {
        setRecipientEmail(data.sponsor.email);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSend() {
    if (!sponsorId || !recipientEmail || !subject || !body) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId,
          recipientEmail,
          subject,
          body,
          sourceClubName: clubName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_LIMIT_REACHED") {
          setError(
            `You've reached your email limit. ${
              data.remaining === 0 ? "Upgrade to send more." : ""
            }`
          );
        } else {
          setError(data.error || "Failed to send email");
        }
        return;
      }

      setSuccess(
        `Email sent successfully! ${
          typeof data.remaining === "number"
            ? `${data.remaining} emails remaining this month.`
            : ""
        }`
      );

      // Clear form after short delay
      setTimeout(() => {
        router.push("/email/history");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  if (!sponsorId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium">No sponsor selected</h3>
            <p className="mt-1 text-neutral-500">
              Please select a sponsor from the search results to compose an email.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/search">Search for Sponsors</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Composer */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Compose Email</CardTitle>
            <CardDescription>
              {sponsor
                ? `Sending to ${sponsor.name}`
                : "Loading sponsor details..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="recipient">Recipient Email *</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="contact@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isGenerating || isSending}
              />
              {!recipientEmail && sponsor && !sponsor.email && (
                <p className="text-xs text-amber-600">
                  No email on file. Please enter the recipient&apos;s email address.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Sponsorship Opportunity"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isGenerating || isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Your email message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isGenerating || isSending}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateEmail}
                disabled={isGenerating || isSending}
              >
                {isGenerating ? "Regenerating..." : "Regenerate"}
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  isGenerating ||
                  isSending ||
                  !recipientEmail ||
                  !subject ||
                  !body
                }
                className="flex-1"
              >
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customise Generation</CardTitle>
            <CardDescription>
              Add notes to influence the AI-generated email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Mention our upcoming tournament in March, emphasise our junior program..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              disabled={isGenerating || isSending}
              className="min-h-[80px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={generateEmail}
              disabled={isGenerating || isSending}
            >
              Regenerate with Notes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <Badge variant="outline">How it will appear</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-8 w-8 animate-spin text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-neutral-500">
                    Generating personalised email...
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-4">
                <div className="mb-4 border-b pb-4">
                  <div className="text-sm text-neutral-500">To:</div>
                  <div className="font-medium">
                    {recipientEmail || "recipient@example.com"}
                  </div>
                </div>
                <div className="mb-4 border-b pb-4">
                  <div className="text-sm text-neutral-500">Subject:</div>
                  <div className="font-medium">
                    {subject || "Your subject line"}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  {body ? (
                    body.split("\n").map((line, i) => (
                      <p key={i} className={line === "" ? "h-4" : ""}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-neutral-400">Your email content...</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips for Success</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                Personalise the greeting if you know a contact name
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                Add specific details about your club&apos;s achievements
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                Mention specific sponsorship packages if you have them
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                Follow up if you don&apos;t hear back within 2 weeks
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EmailComposePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compose Email</h1>
        <p className="text-neutral-600 mt-1">
          Send a personalised sponsorship inquiry
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <p className="text-neutral-500">Loading...</p>
          </div>
        }
      >
        <EmailComposerContent />
      </Suspense>
    </div>
  );
}
