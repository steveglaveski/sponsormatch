"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Email {
  id: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string | null;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  sourceClubName: string | null;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  QUEUED: { label: "Queued", variant: "outline" },
  SENT: { label: "Sent", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "default" },
  OPENED: { label: "Opened", variant: "default" },
  REPLIED: { label: "Replied", variant: "default" },
  BOUNCED: { label: "Bounced", variant: "destructive" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export default function EmailHistoryPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/email/history");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch emails");
        return;
      }

      setEmails(data.emails);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email History</h1>
          <p className="text-neutral-600 mt-1">Track your outreach emails</p>
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email History</h1>
          <p className="text-neutral-600 mt-1">
            Track your outreach emails ({emails.length} total)
          </p>
        </div>
        <Button asChild>
          <Link href="/search">Find More Sponsors</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sent Emails</CardTitle>
          <CardDescription>
            View and track all your sponsorship outreach
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-neutral-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium">No emails yet</h3>
              <p className="mt-1 text-neutral-500">
                Start by searching for sponsors and sending your first outreach
                email.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/search">Find Sponsors</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => {
                    const statusInfo = STATUS_BADGES[email.status] || {
                      label: email.status,
                      variant: "outline" as const,
                    };

                    return (
                      <TableRow key={email.id}>
                        <TableCell>
                          <div className="font-medium">{email.sponsorName}</div>
                          {email.sourceClubName && (
                            <div className="text-sm text-neutral-500">
                              via {email.sourceClubName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {email.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-neutral-500">
                          {formatDate(email.sentAt || email.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Email to {email.sponsorName}</DialogTitle>
                                <DialogDescription>
                                  Sent {formatDate(email.sentAt || email.createdAt)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm font-medium text-neutral-500">
                                    Subject
                                  </div>
                                  <div>{email.subject}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-neutral-500">
                                    Message
                                  </div>
                                  <div className="mt-2 rounded-md bg-neutral-50 p-4 text-sm whitespace-pre-wrap">
                                    {email.body}
                                  </div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                  <div>
                                    <span className="text-neutral-500">Status:</span>{" "}
                                    <Badge variant={statusInfo.variant}>
                                      {statusInfo.label}
                                    </Badge>
                                  </div>
                                  {email.openedAt && (
                                    <div>
                                      <span className="text-neutral-500">Opened:</span>{" "}
                                      {formatDate(email.openedAt)}
                                    </div>
                                  )}
                                  {email.repliedAt && (
                                    <div>
                                      <span className="text-neutral-500">Replied:</span>{" "}
                                      {formatDate(email.repliedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
