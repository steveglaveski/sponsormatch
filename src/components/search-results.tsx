"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ClubMap } from "@/components/club-map";

interface Club {
  id: string;
  name: string;
  sport: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  distanceKm: number;
  latitude: number | null;
  longitude: number | null;
}

interface SearchResultsProps {
  results: {
    searchId: string;
    address: {
      formattedAddress: string;
      latitude: number;
      longitude: number;
      suburb: string;
      state: string;
    };
    clubs: Club[];
    totalFound: number;
  };
}

export function SearchResults({ results }: SearchResultsProps) {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Get unique sports for filtering
  const sports = Array.from(
    new Set(results.clubs.map((c) => c.sport).filter(Boolean))
  ).sort() as string[];

  // Filter clubs by selected sport
  const filteredClubs = selectedSport
    ? results.clubs.filter((c) => c.sport === selectedSport)
    : results.clubs;

  const handleClubSelect = (clubId: string) => {
    router.push(`/sponsors/${clubId}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {results.totalFound} sports clubs near{" "}
                {results.address.suburb}, {results.address.state}
              </CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </Button>
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sport filter */}
          {sports.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge
                variant={selectedSport === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSport(null)}
              >
                All ({results.clubs.length})
              </Badge>
              {sports.map((sport) => (
                <Badge
                  key={sport}
                  variant={selectedSport === sport ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedSport(sport)}
                >
                  {sport} ({results.clubs.filter((c) => c.sport === sport).length})
                </Badge>
              ))}
            </div>
          )}

          {/* View content */}
          {viewMode === "list" ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-neutral-500">
                        No clubs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClubs.map((club) => (
                      <TableRow key={club.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{club.name}</div>
                            {club.address && (
                              <div className="text-sm text-neutral-500">
                                {club.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {club.sport ? (
                            <Badge variant="secondary">{club.sport}</Badge>
                          ) : (
                            <span className="text-neutral-400">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>{club.distanceKm} km</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {club.website && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={club.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Website
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/sponsors/${club.id}`}>
                                View Sponsors
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ClubMap
              clubs={filteredClubs}
              centerLat={results.address.latitude}
              centerLng={results.address.longitude}
              onClubSelect={handleClubSelect}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
