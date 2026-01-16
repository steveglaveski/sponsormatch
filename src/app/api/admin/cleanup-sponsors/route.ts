import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Detect if text looks like garbage (CMS hash, filename, etc.)
 */
function isGarbageText(text: string): boolean {
  if (!text) return true;

  // Pattern 1: Contains long alphanumeric hashes (12+ chars without spaces)
  const hashPattern = /[a-z0-9]{12,}/i;
  const words = text.split(/\s+/);
  const wordsWithHashes = words.filter((word) => hashPattern.test(word));
  if (wordsWithHashes.length > 0) return true;

  // Pattern 2: Looks like an image filename
  const filenamePatterns = [
    /^IMG[\s_-]?\d+/i,
    /^DSC[\s_-]?\d+/i,
    /^Photo[\s_-]?\d+/i,
    /\d{1,2}\.\d{2}\.\d{2}\s*(am|pm)/i,
    /\d+x\d+/,
    /\.(jpg|jpeg|png|gif|svg|webp|pdf)$/i,
  ];
  for (const pattern of filenamePatterns) {
    if (pattern.test(text)) return true;
  }

  // Pattern 3: Contains image/design file keywords
  const fileKeywords = [
    "cmyk", "rgb", "lockup", "tagline", "positive", "negative",
    "stacked", "horizontal", "vertical", "copy of", "scaled",
    "cropped", "resized", "thumbnail", "preview", "artwork",
  ];
  const lowerText = text.toLowerCase();
  for (const keyword of fileKeywords) {
    if (lowerText.includes(keyword)) return true;
  }

  // Pattern 4: Contains CMS hash patterns
  if (/[a-z]\d[a-z0-9]{6,}/i.test(text)) return true;

  return false;
}

/**
 * Try to clean a sponsor name by removing garbage suffixes
 */
function cleanSponsorName(text: string): string | null {
  if (!text) return null;

  let cleaned = text;

  // Remove CMS hashes
  cleaned = cleaned.replace(/\s+[a-z0-9]{12,}$/i, "");
  cleaned = cleaned.replace(/\s+[a-z]\d[a-z0-9]{8,}/gi, "");

  // Remove dimensions
  cleaned = cleaned.replace(/\s*\d+x\d+\s*/gi, " ");

  // Remove timestamps
  cleaned = cleaned.replace(/\s*\d{1,2}\.\d{2}\.\d{2}\s*(am|pm)?\s*/gi, " ");

  // Remove file terms
  const garbageTerms = [
    /\s+cmyk\b/gi, /\s+rgb\b/gi, /\s+lockup\b/gi,
    /\s+with\s+tagline\b/gi, /\s+tagline\b/gi,
    /\s+positive\b/gi, /\s+negative\b/gi,
    /\s+stacked\b/gi, /\s+horizontal\b/gi, /\s+vertical\b/gi,
    /\s+artwork\b/gi, /\s+thumbnail\b/gi, /\s+preview\b/gi,
    /\s+draft\b/gi, /\s+v\d+\b/gi, /\s+final\b/gi,
  ];
  for (const pattern of garbageTerms) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove common prefixes like "Logo of partner X" -> "X"
  cleaned = cleaned.replace(/^(principal|major|gold|silver|bronze|official|community)\s+(partner|sponsor)\s+(logo\s+)?(of\s+)?(partner\s+)?/i, "");
  cleaned = cleaned.replace(/^logo\s+(of\s+)?(partner\s+)?/i, "");

  // Remove logo/sponsor suffixes
  cleaned = cleaned.replace(/\s*logo$/i, "");
  cleaned = cleaned.replace(/\s*sponsor$/i, "");
  cleaned = cleaned.replace(/\s*partner$/i, "");

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Capitalize properly, but preserve acronyms (all-uppercase words)
  if (cleaned.length >= 2) {
    cleaned = cleaned
      .split(" ")
      .map((w) => {
        // Preserve acronyms (2-6 char all-uppercase words)
        if (w.length >= 2 && w.length <= 6 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)) {
          return w;
        }
        // Preserve mixed case that looks intentional (e.g., "McDonald")
        if (/^[A-Z][a-z]+[A-Z]/.test(w)) {
          return w;
        }
        // Otherwise capitalize first letter only
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
  }

  // If still garbage or too short, return null
  if (cleaned.length < 2 || isGarbageText(cleaned)) {
    return null;
  }

  return cleaned;
}

export async function POST(request: Request) {
  try {
    // Only allow in development or with valid session
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));

    const allSponsors = await prisma.sponsor.findMany({
      select: {
        id: true,
        companyName: true,
        website: true,
      },
    });

    const results = {
      total: allSponsors.length,
      deleted: [] as string[],
      cleaned: [] as { from: string; to: string }[],
      unchanged: 0,
    };

    for (const sponsor of allSponsors) {
      // Check if completely garbage
      if (isGarbageText(sponsor.companyName)) {
        results.deleted.push(sponsor.companyName);
        if (!dryRun) {
          // Delete related records first (cascade)
          await prisma.clubSponsor.deleteMany({ where: { sponsorId: sponsor.id } });
          await prisma.emailOutreach.deleteMany({ where: { sponsorId: sponsor.id } });
          await prisma.sponsor.delete({ where: { id: sponsor.id } });
        }
        continue;
      }

      // Try to clean the name
      const cleanedName = cleanSponsorName(sponsor.companyName);

      if (!cleanedName) {
        // Couldn't salvage it
        results.deleted.push(sponsor.companyName);
        if (!dryRun) {
          // Delete related records first (cascade)
          await prisma.clubSponsor.deleteMany({ where: { sponsorId: sponsor.id } });
          await prisma.emailOutreach.deleteMany({ where: { sponsorId: sponsor.id } });
          await prisma.sponsor.delete({ where: { id: sponsor.id } });
        }
      } else if (cleanedName !== sponsor.companyName) {
        // Name was cleaned
        results.cleaned.push({ from: sponsor.companyName, to: cleanedName });
        if (!dryRun) {
          await prisma.sponsor.update({
            where: { id: sponsor.id },
            data: { companyName: cleanedName },
          });
        }
      } else {
        results.unchanged++;
      }
    }

    return NextResponse.json({
      dryRun,
      message: dryRun
        ? "Dry run complete - no changes made. Set dryRun: false to apply."
        : "Cleanup complete!",
      results: {
        total: results.total,
        deleted: results.deleted.length,
        cleaned: results.cleaned.length,
        unchanged: results.unchanged,
        deletedNames: results.deleted.slice(0, 50), // Show first 50
        cleanedNames: results.cleaned.slice(0, 50),
      },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup sponsors" },
      { status: 500 }
    );
  }
}
