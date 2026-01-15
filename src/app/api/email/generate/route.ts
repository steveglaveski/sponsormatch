import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSponsorshipEmail } from "@/services/email-generator";

const generateSchema = z.object({
  sponsorId: z.string(),
  clubName: z.string().optional(), // Source club name for context
  customNotes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sponsorId, clubName, customNotes } = generateSchema.parse(body);

    // Get user's club info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        clubName: true,
        clubSport: true,
        clubAddress: true,
      },
    });

    if (!user?.clubName || !user?.clubSport || !user?.clubAddress) {
      return NextResponse.json(
        {
          error: "Please complete your club profile before sending emails",
          code: "INCOMPLETE_PROFILE",
        },
        { status: 400 }
      );
    }

    // Get sponsor info
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
      include: {
        clubSponsors: {
          include: {
            club: {
              select: { name: true },
            },
          },
          where: {
            isCurrentSeason: true,
          },
        },
      },
    });

    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor not found" },
        { status: 404 }
      );
    }

    // Get list of clubs this sponsor currently supports
    const currentlySponsors = sponsor.clubSponsors.map((cs) => cs.club.name);

    // Generate email
    const email = await generateSponsorshipEmail({
      userClubName: user.clubName,
      userClubSport: user.clubSport,
      userClubLocation: user.clubAddress,
      sponsorName: sponsor.companyName,
      sponsorIndustry: sponsor.industry || undefined,
      sponsorWebsite: sponsor.website || undefined,
      currentlySponsors:
        currentlySponsors.length > 0 ? currentlySponsors : undefined,
      customNotes,
    });

    return NextResponse.json({
      subject: email.subject,
      body: email.body,
      sponsor: {
        id: sponsor.id,
        name: sponsor.companyName,
        email: sponsor.contactEmail,
        contactName: sponsor.contactName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Email generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate email" },
      { status: 500 }
    );
  }
}
