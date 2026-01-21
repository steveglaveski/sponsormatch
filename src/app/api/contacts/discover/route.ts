import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discoverContacts } from "@/services/contact-discovery";
import { canRevealContact, getRemainingContactReveals, SubscriptionTier } from "@/lib/subscription";

const discoverSchema = z.object({
  sponsorId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check contact reveal limit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        contactReveals: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = user.subscriptionTier as SubscriptionTier;
    if (!canRevealContact(tier, user.contactReveals)) {
      const remaining = getRemainingContactReveals(tier, user.contactReveals);
      return NextResponse.json(
        {
          error: "Contact reveal limit reached",
          message: "You've reached your monthly limit for finding contacts. Upgrade your plan to reveal more contacts.",
          remaining,
          limitReached: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sponsorId } = discoverSchema.parse(body);

    // Get sponsor details
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: {
        id: true,
        companyName: true,
        website: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
      },
    });

    if (!sponsor) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }

    // Discover contacts
    console.log(`[ContactDiscovery] Starting discovery for "${sponsor.companyName}", website: ${sponsor.website || "none"}`);
    const result = await discoverContacts(sponsor.companyName, sponsor.website || undefined);
    console.log(`[ContactDiscovery] Found ${result.contacts.length} contacts:`, result.contacts.map(c => ({ email: c.email, source: c.source, confidence: c.confidence })));

    // Update sponsor with best contact found
    if (result.contacts.length > 0) {
      const bestContact = result.contacts.find(
        (c) => c.confidence === "high" && c.email
      ) || result.contacts.find((c) => c.confidence === "medium" && c.email)
        || result.contacts.find((c) => c.email);

      // Update if we found a better email (high/medium confidence) or no email exists
      const shouldUpdate = bestContact?.email && (
        !sponsor.contactEmail ||
        (bestContact.confidence === "high" && !sponsor.contactEmail?.includes(bestContact.email.split("@")[1])) ||
        (bestContact.source === "website" || bestContact.source === "api")
      );

      if (shouldUpdate && bestContact) {
        console.log(`[ContactDiscovery] Updating sponsor with email: ${bestContact.email} (${bestContact.source}, ${bestContact.confidence})`);
        await prisma.sponsor.update({
          where: { id: sponsorId },
          data: {
            contactEmail: bestContact.email,
            contactName: bestContact.contactName || sponsor.contactName,
            contactPhone: bestContact.phone || sponsor.contactPhone,
            emailVerified: bestContact.verified || false,
          },
        });
      }
    }

    // Increment contact reveal counter
    await prisma.user.update({
      where: { id: session.user.id },
      data: { contactReveals: { increment: 1 } },
    });

    const newRemaining = getRemainingContactReveals(tier, user.contactReveals + 1);

    return NextResponse.json({
      contacts: result.contacts,
      websiteData: result.websiteData,
      existingContact: {
        name: sponsor.contactName,
        email: sponsor.contactEmail,
        phone: sponsor.contactPhone,
      },
      remaining: newRemaining,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Contact discovery error:", error);
    return NextResponse.json(
      { error: "Failed to discover contacts" },
      { status: 500 }
    );
  }
}
