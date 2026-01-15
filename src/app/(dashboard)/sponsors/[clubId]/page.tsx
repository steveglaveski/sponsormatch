"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface Sponsor {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  contactEmail: string | null;
  contactName: string | null;
  tier: string | null;
  seasonYear: number;
  isCurrentSeason: boolean;
  sourceUrl: string | null;
}

interface ClubData {
  club: {
    id: string;
    name: string;
    sport: string | null;
    address: string | null;
    website: string | null;
    phone: string | null;
    lastScraped: string | null;
  };
  sponsors: Sponsor[];
  totalSponsors: number;
  scrapedNew: boolean;
}

export default function ClubSponsorsPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.clubId as string;

  const [data, setData] = useState<ClubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescraping, setIsRescraping] = useState(false);
  const [error, setError] = useState("");
  const [discoveringContacts, setDiscoveringContacts] = useState<Set<string>>(new Set());
  const [discoveredContacts, setDiscoveredContacts] = useState<Map<string, { email?: string; phone?: string; name?: string }>>(new Map());

  useEffect(() => {
    fetchSponsors();
  }, [clubId]);

  async function fetchSponsors() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/sponsors/${clubId}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to fetch sponsors");
        return;
      }

      setData(result);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRescrape() {
    setIsRescraping(true);

    try {
      const response = await fetch(`/api/sponsors/${clubId}`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to rescrape");
        return;
      }

      // Refresh data
      await fetchSponsors();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsRescraping(false);
    }
  }

  const handleDiscoverContact = useCallback(async (sponsorId: string) => {
    setDiscoveringContacts((prev) => new Set(prev).add(sponsorId));

    try {
      const response = await fetch("/api/contacts/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId }),
      });

      const result = await response.json();

      if (response.ok && result.contacts?.length > 0) {
        const bestContact = result.contacts.find(
          (c: { confidence: string; email?: string }) => c.confidence === "high" && c.email
        ) || result.contacts.find((c: { email?: string }) => c.email);

        if (bestContact) {
          setDiscoveredContacts((prev) => {
            const updated = new Map(prev);
            updated.set(sponsorId, {
              email: bestContact.email,
              phone: bestContact.phone,
              name: bestContact.contactName,
            });
            return updated;
          });
        }
      }
    } catch {
      console.error("Failed to discover contacts");
    } finally {
      setDiscoveringContacts((prev) => {
        const updated = new Set(prev);
        updated.delete(sponsorId);
        return updated;
      });
    }
  }, []);

  // Group sponsors by year
  const sponsorsByYear = new Map<number, Sponsor[]>();
  if (data?.sponsors) {
    for (const sponsor of data.sponsors) {
      const year = sponsor.seasonYear;
      if (!sponsorsByYear.has(year)) {
        sponsorsByYear.set(year, []);
      }
      sponsorsByYear.get(year)!.push(sponsor);
    }
  }

  const sortedYears = Array.from(sponsorsByYear.keys()).sort((a, b) => b - a);

  if (isLoading) {
    return (
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
            Searching for sponsors...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          &larr; Back
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" className="mb-2" onClick={() => router.back()}>
            &larr; Back to Search
          </Button>
          <h1 className="text-3xl font-bold">{data.club.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {data.club.sport && (
              <Badge variant="secondary">{data.club.sport}</Badge>
            )}
            {data.club.address && (
              <span className="text-neutral-500">{data.club.address}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.club.website && (
            <Button variant="outline" asChild>
              <a
                href={data.club.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRescrape}
            disabled={isRescraping || !data.club.website}
          >
            {isRescraping ? "Scanning..." : "Rescan for Sponsors"}
          </Button>
        </div>
      </div>

      {data.scrapedNew && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Found new sponsors from {data.club.name}&apos;s website!
        </div>
      )}

      {!data.club.website && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-amber-800">
              This club doesn&apos;t have a website on record. Sponsor
              information cannot be automatically discovered.
            </p>
          </CardContent>
        </Card>
      )}

      {data.totalSponsors === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium">No sponsors found</h3>
              <p className="mt-1 text-neutral-500">
                {data.club.website
                  ? "We couldn't find any sponsors on this club's website. Try rescanning or check manually."
                  : "This club doesn't have a website listed."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sponsors ({data.totalSponsors})</CardTitle>
              <CardDescription>
                Companies sponsoring {data.club.name}
                {data.club.lastScraped && (
                  <span className="ml-2 text-neutral-400">
                    Last updated:{" "}
                    {new Date(data.club.lastScraped).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedYears.map((year) => (
                <div key={year} className="mb-6 last:mb-0">
                  <h3 className="mb-3 font-semibold">
                    {year} Season
                    {year === new Date().getFullYear() && (
                      <Badge className="ml-2" variant="default">
                        Current
                      </Badge>
                    )}
                  </h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sponsor</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sponsorsByYear.get(year)!.map((sponsor) => (
                          <TableRow key={`${sponsor.id}-${year}`}>
                            <TableCell>
                              <div className="font-medium">{sponsor.name}</div>
                              {sponsor.industry && (
                                <div className="text-sm text-neutral-500">
                                  {sponsor.industry}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {sponsor.tier ? (
                                <Badge variant="outline">{sponsor.tier}</Badge>
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const discovered = discoveredContacts.get(sponsor.id);
                                const email = discovered?.email || sponsor.contactEmail;
                                const name = discovered?.name || sponsor.contactName;
                                const isDiscovering = discoveringContacts.has(sponsor.id);

                                if (email) {
                                  return (
                                    <div>
                                      {name && (
                                        <div className="text-sm">{name}</div>
                                      )}
                                      <div className="text-sm text-blue-600">
                                        {email}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDiscoverContact(sponsor.id)}
                                    disabled={isDiscovering}
                                    className="text-neutral-500 hover:text-neutral-700"
                                  >
                                    {isDiscovering ? (
                                      <>
                                        <svg
                                          className="mr-1 h-3 w-3 animate-spin"
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
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                          />
                                        </svg>
                                        Finding...
                                      </>
                                    ) : (
                                      "Find Contact"
                                    )}
                                  </Button>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {sponsor.website && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a
                                      href={sponsor.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Website
                                    </a>
                                  </Button>
                                )}
                                <Button variant="default" size="sm" asChild>
                                  <Link href={`/email/compose?sponsorId=${sponsor.id}&clubName=${encodeURIComponent(data.club.name)}`}>
                                    Draft Email
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
