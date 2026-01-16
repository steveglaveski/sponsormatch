import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, isValidEmail } from "@/services/email-sender";
import { sendEmailViaGmail } from "@/services/gmail-sender";
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

    // Get user with subscription info and Gmail status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        clubName: true,
        subscriptionTier: true,
        emailsSent: true,
        gmailConnected: true,
        gmailEmail: true,
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

    // Send email - use Gmail if connected, otherwise fall back to Resend
    let result;
    let sentViaGmail = false;

    if (user.gmailConnected && user.gmailEmail) {
      // Send via user's Gmail account
      result = await sendEmailViaGmail({
        userId: user.id,
        to: recipientEmail,
        subject,
        body: emailBody,
      });
      sentViaGmail = result.success;

      // If Gmail failed due to auth issues, fall back to Resend
      if (!result.success && result.error?.includes("reconnect")) {
        console.log("Gmail auth failed, falling back to Resend");
        const replyTo = user.email || "noreply@sponsormatch.com.au";
        result = await sendEmail({
          to: recipientEmail,
          replyTo,
          subject,
          body: emailBody,
        });
      }
    } else {
      // Send via Resend with reply-to
      const replyTo = user.email || "noreply@sponsormatch.com.au";
      result = await sendEmail({
        to: recipientEmail,
        replyTo,
        subject,
        body: emailBody,
      });
    }

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
      sentVia: sentViaGmail ? "gmail" : "resend",
      sentFrom: sentViaGmail ? user.gmailEmail : "SponsorMatch",
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
