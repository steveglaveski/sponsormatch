import { SUPPORTED_COUNTRIES } from "@/lib/constants";

export interface GeocodingResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

interface GoogleGeocodingResponse {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: string;
  error_message?: string;
}

export class GeocodingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "GeocodingError";
  }
}

/**
 * Geocode an address using Google Maps Geocoding API
 * Supports Australian and US addresses
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new GeocodingError(
      "Google Maps API key not configured",
      "MISSING_API_KEY"
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  const data: GoogleGeocodingResponse = await response.json();

  if (data.status === "ZERO_RESULTS") {
    throw new GeocodingError(
      "Address not found. Please enter a valid address.",
      "NOT_FOUND"
    );
  }

  if (data.status !== "OK") {
    throw new GeocodingError(
      data.error_message || "Failed to geocode address",
      data.status
    );
  }

  const result = data.results[0];
  if (!result) {
    throw new GeocodingError("No results found", "NO_RESULTS");
  }

  // Extract address components
  const components = result.address_components;
  const suburb =
    components.find((c) => c.types.includes("locality"))?.long_name || "";
  const state =
    components.find((c) => c.types.includes("administrative_area_level_1"))
      ?.short_name || "";
  const postcode =
    components.find((c) => c.types.includes("postal_code"))?.long_name || "";
  const country =
    components.find((c) => c.types.includes("country"))?.short_name || "";

  // Validate it's in a supported country
  if (!SUPPORTED_COUNTRIES.includes(country as (typeof SUPPORTED_COUNTRIES)[number])) {
    throw new GeocodingError(
      "We currently support Australia and the United States. Please enter an address in one of these countries.",
      "UNSUPPORTED_COUNTRY"
    );
  }

  return {
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    suburb,
    state,
    postcode,
    country,
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
