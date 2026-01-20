import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeClubSponsors } from "@/services/scraper";
import { getPlaceDetails } from "@/services/places";
import { CACHE_TTL_DAYS } from "@/lib/constants";
import { canViewClubSponsors, SUBSCRIPTION_LIMITS } from "@/lib/subscription";

interface RouteParams {
  params: Promise<{ clubId: string }>;
}

/**
 * GET /api/sponsors/[clubId]
 * Get sponsors for a club, scraping if needed
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clubId } = await params;

    // Get user to check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        clubsViewed: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can view this club's sponsors
    const canView = canViewClubSponsors(
      user.subscriptionTier,
      user.clubsViewed,
      clubId
    );

    if (!canView) {
      const limit = SUBSCRIPTION_LIMITS[user.subscriptionTier].clubsWithSponsorsVisible;
      return NextResponse.json(
        {
          error: "Club limit reached",
          message: `You've reached your limit of ${limit} clubs. Upgrade your plan to view more sponsors.`,
          upgradeRequired: true,
          clubsViewed: user.clubsViewed.length,
          limit,
        },
        { status: 403 }
      );
    }

    // Get club with existing sponsors
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
          orderBy: [
            { isCurrentSeason: "desc" },
            { seasonYear: "desc" },
          ],
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // If club has no website but has a Google Place ID, try to fetch website from Google
    if (!club.website && club.googlePlaceId) {
      try {
        const placeDetails = await getPlaceDetails(club.googlePlaceId);
        if (placeDetails?.website) {
          // Update club with website
          await prisma.club.update({
            where: { id: clubId },
            data: {
              website: placeDetails.website,
              phone: placeDetails.phone || club.phone,
            },
          });
          // Update local reference
          club.website = placeDetails.website;
          club.phone = placeDetails.phone || club.phone;
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }

    // Check if we need to scrape (no sponsors or data is stale)
    const shouldScrape =
      club.website &&
      (club.sponsors.length === 0 ||
        !club.lastScraped ||
        isStale(club.lastScraped));

    let scrapedNew = false;

    if (shouldScrape && club.website) {
      // Scrape sponsors
      const scrapeResult = await scrapeClubSponsors(club.website);

      if (scrapeResult.sponsors.length > 0) {
        const currentYear = new Date().getFullYear();

        // Save sponsors to database
        for (const scraped of scrapeResult.sponsors) {
          // Upsert sponsor
          const sponsor = await prisma.sponsor.upsert({
            where: {
              companyName_website: {
                companyName: scraped.name,
                website: scraped.websiteUrl || "",
              },
            },
            update: {},
            create: {
              companyName: scraped.name,
              website: scraped.websiteUrl,
            },
          });

          // Create club-sponsor relationship if not exists
          await prisma.clubSponsor.upsert({
            where: {
              clubId_sponsorId_seasonYear: {
                clubId: club.id,
                sponsorId: sponsor.id,
                seasonYear: currentYear,
              },
            },
            update: {
              isCurrentSeason: true,
              sourceUrl: scraped.sourceUrl,
              sponsorshipType: scraped.tier,
            },
            create: {
              clubId: club.id,
              sponsorId: sponsor.id,
              seasonYear: currentYear,
              isCurrentSeason: true,
              sourceUrl: scraped.sourceUrl,
              sponsorshipType: scraped.tier,
            },
          });
        }

        // Update club's lastScraped
        await prisma.club.update({
          where: { id: clubId },
          data: { lastScraped: new Date() },
        });

        scrapedNew = true;
      }
    }

    // Fetch updated sponsors
    const updatedClub = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
          orderBy: [
            { isCurrentSeason: "desc" },
            { seasonYear: "desc" },
          ],
        },
      },
    });

    // Track this club view if not already viewed
    if (!user.clubsViewed.includes(clubId)) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          clubsViewed: {
            push: clubId,
          },
        },
      });
    }

    // Calculate remaining club views
    const updatedClubsViewedCount = user.clubsViewed.includes(clubId)
      ? user.clubsViewed.length
      : user.clubsViewed.length + 1;
    const limit = SUBSCRIPTION_LIMITS[user.subscriptionTier].clubsWithSponsorsVisible;
    const remainingClubViews = limit === -1 ? "unlimited" : Math.max(0, limit - updatedClubsViewedCount);

    return NextResponse.json({
      club: {
        id: updatedClub?.id,
        name: updatedClub?.name,
        sport: updatedClub?.sport,
        address: updatedClub?.address,
        website: updatedClub?.website,
        phone: updatedClub?.phone,
        lastScraped: updatedClub?.lastScraped,
      },
      sponsors: (updatedClub?.sponsors || []).map((cs) => ({
        id: cs.sponsor.id,
        name: cs.sponsor.companyName,
        website: cs.sponsor.website,
        industry: cs.sponsor.industry,
        contactEmail: cs.sponsor.contactEmail,
        contactName: cs.sponsor.contactName,
        tier: cs.sponsorshipType,
        seasonYear: cs.seasonYear,
        isCurrentSeason: cs.isCurrentSeason,
        sourceUrl: cs.sourceUrl,
      })),
      totalSponsors: updatedClub?.sponsors.length || 0,
      scrapedNew,
      clubsViewed: updatedClubsViewedCount,
      remainingClubViews,
    });
  } catch (error) {
    console.error("Error fetching sponsors:", error);
    return NextResponse.json(
      { error: "Failed to fetch sponsors" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sponsors/[clubId]
 * Force re-scrape sponsors for a club
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clubId } = await params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // If club has no website but has a Google Place ID, try to fetch website from Google
    if (!club.website && club.googlePlaceId) {
      try {
        const placeDetails = await getPlaceDetails(club.googlePlaceId);
        if (placeDetails?.website) {
          await prisma.club.update({
            where: { id: clubId },
            data: {
              website: placeDetails.website,
              phone: placeDetails.phone || club.phone,
            },
          });
          club.website = placeDetails.website;
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }

    if (!club.website) {
      return NextResponse.json(
        { error: "Club has no website to scrape" },
        { status: 400 }
      );
    }

    // Force scrape
    const scrapeResult = await scrapeClubSponsors(club.website);

    if (scrapeResult.errors.length > 0) {
      console.error("Scrape errors:", scrapeResult.errors);
    }

    const currentYear = new Date().getFullYear();
    let newSponsorsCount = 0;

    // Save sponsors
    for (const scraped of scrapeResult.sponsors) {
      const sponsor = await prisma.sponsor.upsert({
        where: {
          companyName_website: {
            companyName: scraped.name,
            website: scraped.websiteUrl || "",
          },
        },
        update: {},
        create: {
          companyName: scraped.name,
          website: scraped.websiteUrl,
        },
      });

      const existing = await prisma.clubSponsor.findUnique({
        where: {
          clubId_sponsorId_seasonYear: {
            clubId: club.id,
            sponsorId: sponsor.id,
            seasonYear: currentYear,
          },
        },
      });

      if (!existing) {
        newSponsorsCount++;
      }

      await prisma.clubSponsor.upsert({
        where: {
          clubId_sponsorId_seasonYear: {
            clubId: club.id,
            sponsorId: sponsor.id,
            seasonYear: currentYear,
          },
        },
        update: {
          isCurrentSeason: true,
          sourceUrl: scraped.sourceUrl,
          sponsorshipType: scraped.tier,
        },
        create: {
          clubId: club.id,
          sponsorId: sponsor.id,
          seasonYear: currentYear,
          isCurrentSeason: true,
          sourceUrl: scraped.sourceUrl,
          sponsorshipType: scraped.tier,
        },
      });
    }

    // Update lastScraped
    await prisma.club.update({
      where: { id: clubId },
      data: { lastScraped: new Date() },
    });

    return NextResponse.json({
      success: true,
      scrapedUrls: scrapeResult.scrapedUrls,
      sponsorsFound: scrapeResult.sponsors.length,
      newSponsors: newSponsorsCount,
      errors: scrapeResult.errors,
    });
  } catch (error) {
    console.error("Error scraping sponsors:", error);
    return NextResponse.json(
      { error: "Failed to scrape sponsors" },
      { status: 500 }
    );
  }
}

function isStale(lastScraped: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - lastScraped.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > CACHE_TTL_DAYS;
}
