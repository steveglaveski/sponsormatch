import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, isValidEmail } from "@/services/email-sender";
import { canSendEmail, getRemainingEmails, type SubscriptionTier } from "@/lib/subscription";

const sendSchema = z.object({
  sponsorId: z.string(),
  recipientEmail: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(10, "Email body is too short"),
  sourceClubName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sponsorId, recipientEmail, subject, body: emailBody, sourceClubName } =
      sendSchema.parse(body);

    // Validate email format
    if (!isValidEmail(recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid recipient email address" },
        { status: 400 }
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        clubName: true,
        subscriptionTier: true,
        emailsSent: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check email limits
    const tier = user.subscriptionTier as SubscriptionTier;
    if (!canSendEmail(tier, user.emailsSent)) {
      const remaining = getRemainingEmails(tier, user.emailsSent);
      return NextResponse.json(
        {
          error: "You've reached your email limit for this month",
          code: "EMAIL_LIMIT_REACHED",
          remaining,
          tier: user.subscriptionTier,
        },
        { status: 403 }
      );
    }

    // Get sponsor
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
    });

    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor not found" },
        { status: 404 }
      );
    }

    // Create email record (as draft first)
    const emailRecord = await prisma.emailOutreach.create({
      data: {
        userId: user.id,
        sponsorId: sponsor.id,
        subject,
        body: emailBody,
        status: "QUEUED",
        sourceClubName,
      },
    });

    // Send email
    const replyTo = user.email || "noreply@sponsormatch.com.au";
    const result = await sendEmail({
      to: recipientEmail,
      replyTo,
      subject,
      body: emailBody,
    });

    if (!result.success) {
      // Update record as failed
      await prisma.emailOutreach.update({
        where: { id: emailRecord.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Update email record as sent
    await prisma.emailOutreach.update({
      where: { id: emailRecord.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Increment user's email count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailsSent: { increment: 1 },
      },
    });

    // Calculate remaining emails
    const remaining = getRemainingEmails(tier, user.emailsSent + 1);

    return NextResponse.json({
      success: true,
      emailId: emailRecord.id,
      messageId: result.messageId,
      remaining,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
