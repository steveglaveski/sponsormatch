import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Known acronyms that should be uppercase
const ACRONYMS: Record<string, string> = {
  "cfmeu": "CFMEU",
  "etu": "ETU",
  "ppteu": "PPTEU",
  "iga": "IGA",
  "asics": "ASICS",
  "rsl": "RSL",
  "afl": "AFL",
  "vfl": "VFL",
  "nrl": "NRL",
  "nbl": "NBL",
  "ffa": "FFA",
  "cba": "CBA",
  "nab": "NAB",
  "anz": "ANZ",
  "qbe": "QBE",
  "hbf": "HBF",
  "hbp": "HBP",
  "oxa": "OXA",
  "ami": "AMI",
  "eit": "EIT",
  "mcwa": "MCWA",
  "cbd": "CBD",
  "usa": "USA",
  "nsw": "NSW",
  "vic": "VIC",
  "qld": "QLD",
  "wa": "WA",
  "sa": "SA",
  "nt": "NT",
  "act": "ACT",
  "tas": "TAS",
  "sb": "SB",
  "hq": "HQ",
  "rgb": "RGB",
};

function fixAcronyms(name: string): string {
  let fixed = name;

  // Fix each word that matches a known acronym
  const words = fixed.split(/(\s+)/); // Keep spaces
  const fixedWords = words.map((word) => {
    const lower = word.toLowerCase();
    if (ACRONYMS[lower]) {
      return ACRONYMS[lower];
    }
    // Also check if it's part of a hyphenated word like "Etu-1"
    if (word.includes("-")) {
      const parts = word.split("-");
      const fixedParts = parts.map((p) => ACRONYMS[p.toLowerCase()] || p);
      return fixedParts.join("-");
    }
    return word;
  });

  return fixedWords.join("");
}

export async function POST(request: Request) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Only available in development" }, { status: 403 });
    }

    const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));

    const allSponsors = await prisma.sponsor.findMany({
      select: { id: true, companyName: true },
    });

    const results = {
      total: allSponsors.length,
      fixed: [] as { from: string; to: string }[],
      unchanged: 0,
    };

    for (const sponsor of allSponsors) {
      const fixed = fixAcronyms(sponsor.companyName);

      if (fixed !== sponsor.companyName) {
        results.fixed.push({ from: sponsor.companyName, to: fixed });
        if (!dryRun) {
          await prisma.sponsor.update({
            where: { id: sponsor.id },
            data: { companyName: fixed },
          });
        }
      } else {
        results.unchanged++;
      }
    }

    return NextResponse.json({
      dryRun,
      message: dryRun ? "Dry run - no changes made" : "Acronyms fixed!",
      results: {
        total: results.total,
        fixed: results.fixed.length,
        unchanged: results.unchanged,
        fixedNames: results.fixed,
      },
    });
  } catch (error) {
    console.error("Fix acronyms error:", error);
    return NextResponse.json({ error: "Failed to fix acronyms" }, { status: 500 });
  }
}
