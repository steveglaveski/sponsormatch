import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emails = await prisma.emailOutreach.findMany({
      where: { userId: session.user.id },
      include: {
        sponsor: {
          select: {
            id: true,
            companyName: true,
            contactEmail: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 emails
    });

    return NextResponse.json({
      emails: emails.map((email) => ({
        id: email.id,
        sponsorId: email.sponsorId,
        sponsorName: email.sponsor.companyName,
        sponsorEmail: email.sponsor.contactEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        sentAt: email.sentAt,
        openedAt: email.openedAt,
        repliedAt: email.repliedAt,
        sourceClubName: email.sourceClubName,
        createdAt: email.createdAt,
      })),
      total: emails.length,
    });
  } catch (error) {
    console.error("Email history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history" },
      { status: 500 }
    );
  }
}
