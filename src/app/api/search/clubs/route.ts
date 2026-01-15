import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress, GeocodingError } from "@/services/geocoding";
import { searchNearbyClubs, inferSportType, PlaceResult } from "@/services/places";
import { DEFAULT_SEARCH_RADIUS_KM } from "@/lib/constants";

const searchSchema = z.object({
  address: z.string().min(5, "Please enter a valid address"),
  radiusKm: z.number().min(1).max(50).optional().default(DEFAULT_SEARCH_RADIUS_KM),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { address, radiusKm } = searchSchema.parse(body);

    // Geocode the address
    const geocoded = await geocodeAddress(address);

    // Search for nearby clubs
    const places = await searchNearbyClubs(
      geocoded.latitude,
      geocoded.longitude,
      radiusKm
    );

    // Save or update clubs in database and create search record
    const clubsData = await Promise.all(
      places.map(async (place) => {
        const sport = inferSportType(place.name, place.types);

        // Upsert club
        const club = await prisma.club.upsert({
          where: { googlePlaceId: place.placeId },
          update: {
            name: place.name,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            website: place.website,
            phone: place.phone,
            sport: sport,
          },
          create: {
            googlePlaceId: place.placeId,
            name: place.name,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            website: place.website,
            phone: place.phone,
            sport: sport,
          },
        });

        return {
          ...club,
          distanceKm: place.distanceKm,
        };
      })
    );

    // Create search record
    const search = await prisma.search.create({
      data: {
        userId: session.user.id,
        searchAddress: geocoded.formattedAddress,
        searchLatitude: geocoded.latitude,
        searchLongitude: geocoded.longitude,
        radiusKm,
        clubsFound: clubsData.length,
        results: {
          create: clubsData.map((club) => ({
            clubId: club.id,
            distanceKm: club.distanceKm,
          })),
        },
      },
    });

    return NextResponse.json({
      searchId: search.id,
      address: geocoded,
      clubs: clubsData.map((club) => ({
        id: club.id,
        name: club.name,
        sport: club.sport,
        address: club.address,
        website: club.website,
        phone: club.phone,
        distanceKm: club.distanceKm,
        latitude: club.latitude,
        longitude: club.longitude,
      })),
      totalFound: clubsData.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    if (error instanceof GeocodingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search for clubs. Please try again." },
      { status: 500 }
    );
  }
}
