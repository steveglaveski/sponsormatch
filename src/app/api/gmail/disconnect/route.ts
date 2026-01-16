import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/gmail/disconnect
 * Disconnects Gmail integration for the current user
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear Gmail credentials
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        gmailConnected: false,
        gmailEmail: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    );
  }
}
