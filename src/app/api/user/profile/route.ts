import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPORT_TYPES } from "@/lib/constants";

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  clubName: z.string().min(2).max(100),
  clubSport: z.string().refine((val) => SPORT_TYPES.includes(val as any), {
    message: "Invalid sport type",
  }),
  clubAddress: z.string().min(5).max(200),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        clubName: true,
        clubSport: true,
        clubAddress: true,
        subscriptionTier: true,
        emailsSent: true,
        clubsViewed: true,
        stripeCustomerId: true,
        createdAt: true,
        gmailConnected: true,
        gmailEmail: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = profileSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        clubName: data.clubName,
        clubSport: data.clubSport,
        clubAddress: data.clubAddress,
      },
      select: {
        id: true,
        name: true,
        email: true,
        clubName: true,
        clubSport: true,
        clubAddress: true,
        subscriptionTier: true,
        emailsSent: true,
      },
    });

    return NextResponse.json({ user, message: "Profile updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
