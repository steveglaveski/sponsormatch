"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Search {
  id: string;
  searchAddress: string;
  radiusKm: number;
  clubsFound: number;
  sponsorsFound: number;
  createdAt: string;
}

export function RecentSearches() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSearches() {
      try {
        const response = await fetch("/api/search/recent");
        const data = await response.json();
        if (response.ok) {
          setSearches(data.searches);
        }
      } catch {
        console.error("Failed to fetch recent searches");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSearches();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Searches</CardTitle>
          <CardDescription>Your latest sponsor searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-neutral-500 py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Searches</CardTitle>
          <CardDescription>Your latest sponsor searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-neutral-500 mb-2">No searches yet</p>
            <Link
              href="/search"
              className="text-sm text-blue-600 hover:underline"
            >
              Start your first search
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Searches</CardTitle>
        <CardDescription>Your latest sponsor searches</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {searches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{search.searchAddress}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {search.radiusKm} km
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {search.clubsFound} clubs
                  </span>
                  <span className="text-xs text-neutral-500">
                    {search.sponsorsFound} sponsors
                  </span>
                </div>
              </div>
              <div className="text-xs text-neutral-400 ml-4">
                {formatRelativeTime(new Date(search.createdAt))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
