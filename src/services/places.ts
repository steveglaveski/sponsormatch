import { CLUB_SEARCH_KEYWORDS } from "@/lib/constants";
import { calculateDistance } from "./geocoding";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
  website?: string;
  phone?: string;
  distanceKm: number;
}

interface GooglePlacesNearbyResponse {
  results: Array<{
    place_id: string;
    name: string;
    vicinity: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
  }>;
  status: string;
  next_page_token?: string;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    website?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
  };
  status: string;
}

export class PlacesError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PlacesError";
  }
}

/**
 * Search for sports clubs near a location using Google Places API
 */
export async function searchNearbyClubs(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new PlacesError(
      "Google Maps API key not configured",
      "MISSING_API_KEY"
    );
  }

  const radiusMeters = radiusKm * 1000;
  const allResults: PlaceResult[] = [];
  const seenPlaceIds = new Set<string>();

  // Search with multiple keywords to find different types of sports clubs
  for (const keyword of CLUB_SEARCH_KEYWORDS) {
    try {
      const results = await searchWithKeyword(
        latitude,
        longitude,
        radiusMeters,
        keyword,
        apiKey
      );

      for (const result of results) {
        if (!seenPlaceIds.has(result.placeId)) {
          seenPlaceIds.add(result.placeId);

          // Calculate distance
          const distance = calculateDistance(
            latitude,
            longitude,
            result.latitude,
            result.longitude
          );

          // Only include if within radius
          if (distance <= radiusKm) {
            allResults.push({
              ...result,
              distanceKm: Math.round(distance * 10) / 10,
            });
          }
        }
      }
    } catch (error) {
      // Log but continue with other keywords
      console.error(`Error searching for "${keyword}":`, error);
    }
  }

  // Sort by distance
  const sortedResults = allResults.sort((a, b) => a.distanceKm - b.distanceKm);

  // Fetch detailed info (website, phone) for each club
  // Process in batches to avoid overwhelming the API
  const enrichedResults = await enrichWithPlaceDetails(sortedResults, apiKey);

  return enrichedResults;
}

/**
 * Enrich place results with detailed information (website, phone) from Place Details API
 */
async function enrichWithPlaceDetails(
  places: PlaceResult[],
  apiKey: string
): Promise<PlaceResult[]> {
  const BATCH_SIZE = 5;
  const enrichedResults: PlaceResult[] = [];

  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    const batch = places.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (place) => {
        try {
          const details = await fetchPlaceDetails(place.placeId, apiKey);
          if (details) {
            return {
              ...place,
              website: details.website || place.website,
              phone: details.phone || place.phone,
              address: details.address || place.address,
            };
          }
        } catch (error) {
          console.error(`Error fetching details for ${place.name}:`, error);
        }
        return place;
      })
    );

    enrichedResults.push(...batchResults);
  }

  return enrichedResults;
}

/**
 * Fetch place details from Google Place Details API
 */
async function fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{ website?: string; phone?: string; address?: string } | null> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "website,formatted_phone_number,formatted_address"
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== "OK") {
    return null;
  }

  return {
    website: data.result?.website,
    phone: data.result?.formatted_phone_number,
    address: data.result?.formatted_address,
  };
}

async function searchWithKeyword(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  keyword: string,
  apiKey: string
): Promise<Omit<PlaceResult, "distanceKm">[]> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("radius", radiusMeters.toString());
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data: GooglePlacesNearbyResponse = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new PlacesError(
      data.error_message || `Places API error: ${data.status}`,
      data.status
    );
  }

  return data.results.map((place) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    types: place.types,
  }));
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new PlacesError(
      "Google Maps API key not configured",
      "MISSING_API_KEY"
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "place_id,name,formatted_address,formatted_phone_number,website,geometry,types"
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data: GooglePlaceDetailsResponse = await response.json();

  if (data.status !== "OK") {
    return null;
  }

  return {
    placeId: data.result.place_id,
    name: data.result.name,
    address: data.result.formatted_address,
    latitude: data.result.geometry.location.lat,
    longitude: data.result.geometry.location.lng,
    types: data.result.types,
    website: data.result.website,
    phone: data.result.formatted_phone_number,
    distanceKm: 0, // Will be calculated by caller
  };
}

/**
 * Infer sport type from place name and types
 */
export function inferSportType(name: string, types: string[]): string | null {
  const nameLower = name.toLowerCase();

  const sportPatterns: Array<{ pattern: RegExp; sport: string }> = [
    { pattern: /\bafl\b|aussie rules|australian football/i, sport: "AFL" },
    { pattern: /\bsoccer\b|football club(?!.*australian)/i, sport: "Soccer" },
    { pattern: /\brugby league\b|league club/i, sport: "Rugby League" },
    { pattern: /\brugby union\b|rugby club/i, sport: "Rugby Union" },
    { pattern: /\bcricket\b/i, sport: "Cricket" },
    { pattern: /\btennis\b/i, sport: "Tennis" },
    { pattern: /\bbasketball\b/i, sport: "Basketball" },
    { pattern: /\bnetball\b/i, sport: "Netball" },
    { pattern: /\bhockey\b/i, sport: "Hockey" },
    { pattern: /\bswim/i, sport: "Swimming" },
    { pattern: /\bathletic/i, sport: "Athletics" },
    { pattern: /\bgym/i, sport: "Gymnastics" },
    { pattern: /\bbowl/i, sport: "Bowling" },
    { pattern: /\bgolf\b/i, sport: "Golf" },
    { pattern: /\bsurf\b|slsc\b|surf life/i, sport: "Surf" },
    { pattern: /\bvolleyball\b/i, sport: "Volleyball" },
    { pattern: /\bbaseball\b/i, sport: "Baseball" },
    { pattern: /\bsoftball\b/i, sport: "Softball" },
    { pattern: /\btable tennis\b|ping pong/i, sport: "Table Tennis" },
    { pattern: /\bbadminton\b/i, sport: "Badminton" },
    { pattern: /\bsquash\b/i, sport: "Squash" },
    { pattern: /\bmartial art|karate|judo|taekwondo|jiu.?jitsu/i, sport: "Martial Arts" },
    { pattern: /\bbox/i, sport: "Boxing" },
    { pattern: /\bdance\b/i, sport: "Dance" },
  ];

  for (const { pattern, sport } of sportPatterns) {
    if (pattern.test(nameLower)) {
      return sport;
    }
  }

  // Check if it's a general sports club
  if (/sports? club|recreation|rsl/i.test(nameLower)) {
    return "Multi-Sport";
  }

  return null;
}
