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

    const searches = await prisma.search.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        searchAddress: true,
        radiusKm: true,
        clubsFound: true,
        sponsorsFound: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ searches });
  } catch (error) {
    console.error("Recent searches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent searches" },
      { status: 500 }
    );
  }
}
