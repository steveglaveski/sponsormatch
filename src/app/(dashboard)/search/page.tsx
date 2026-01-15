"use client";

import { useState } from "react";
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
import { SearchResults } from "@/components/search-results";

interface SearchResult {
  searchId: string;
  address: {
    formattedAddress: string;
    latitude: number;
    longitude: number;
    suburb: string;
    state: string;
  };
  clubs: Array<{
    id: string;
    name: string;
    sport: string | null;
    address: string | null;
    website: string | null;
    phone: string | null;
    distanceKm: number;
    latitude: number | null;
    longitude: number | null;
  }>;
  totalFound: number;
}

export default function SearchPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState("10");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSearching(true);
    setResults(null);

    try {
      const response = await fetch("/api/search/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          radiusKm: parseInt(radius),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Search failed");
        return;
      }

      setResults(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Find Sponsors</h1>
        <p className="text-neutral-600 mt-1">
          Enter your club&apos;s address to discover sponsors of nearby sports clubs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Location</CardTitle>
          <CardDescription>
            We&apos;ll find sports clubs near this address and identify their sponsors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[1fr_150px_auto]">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main St, Melbourne VIC 3000"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={isSearching}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Search Radius</Label>
                <Select
                  value={radius}
                  onValueChange={setRadius}
                  disabled={isSearching}
                >
                  <SelectTrigger id="radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="15">15 km</SelectItem>
                    <SelectItem value="20">20 km</SelectItem>
                    <SelectItem value="30">30 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={isSearching} className="w-full md:w-auto">
                  {isSearching ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
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
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {results && <SearchResults results={results} />}
    </div>
  );
}
