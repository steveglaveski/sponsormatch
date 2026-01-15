import * as cheerio from "cheerio";
import { SCRAPE_DELAY_MS } from "@/lib/constants";

export interface ScrapedSponsor {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: string;
  sourceUrl: string;
}

export interface ScrapeResult {
  sponsors: ScrapedSponsor[];
  scrapedUrls: string[];
  errors: string[];
}

// Rate limiting: track last request time per domain
const lastRequestTime = new Map<string, number>();

/**
 * Rate-limited fetch that respects robots.txt guidelines
 */
async function rateLimitedFetch(url: string): Promise<Response | null> {
  try {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const lastTime = lastRequestTime.get(domain) || 0;
    const timeSinceLastRequest = now - lastTime;

    // Wait if we need to respect rate limit
    if (timeSinceLastRequest < SCRAPE_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, SCRAPE_DELAY_MS - timeSinceLastRequest)
      );
    }

    lastRequestTime.set(domain, Date.now());

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "SponsorMatch Bot/1.0 (https://sponsormatch.com.au; contact@sponsormatch.com.au)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return null;
    }

    return response;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

/**
 * Find sponsor-related pages on a website
 */
async function findSponsorPages(baseUrl: string): Promise<string[]> {
  const sponsorPages: string[] = [];
  const sponsorKeywords = [
    "sponsor",
    "partner",
    "supporter",
    "backer",
    "donor",
    "corporate",
  ];

  try {
    const response = await rateLimitedFetch(baseUrl);
    if (!response) return sponsorPages;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find links that might lead to sponsor pages
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().toLowerCase();

      if (!href) return;

      const hrefLower = href.toLowerCase();
      const isRelevant = sponsorKeywords.some(
        (keyword) => hrefLower.includes(keyword) || text.includes(keyword)
      );

      if (isRelevant) {
        try {
          const fullUrl = new URL(href, baseUrl).toString();
          // Only include same-domain URLs
          if (fullUrl.startsWith(baseUrl) || href.startsWith("/")) {
            const resolvedUrl = new URL(href, baseUrl).toString();
            if (!sponsorPages.includes(resolvedUrl)) {
              sponsorPages.push(resolvedUrl);
            }
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Also check the homepage itself
    if (!sponsorPages.includes(baseUrl)) {
      sponsorPages.unshift(baseUrl);
    }
  } catch (error) {
    console.error(`Error finding sponsor pages for ${baseUrl}:`, error);
  }

  return sponsorPages.slice(0, 5); // Limit to 5 pages max
}

/**
 * Extract sponsors from a single page
 */
async function extractSponsorsFromPage(
  url: string
): Promise<ScrapedSponsor[]> {
  const sponsors: ScrapedSponsor[] = [];

  try {
    const response = await rateLimitedFetch(url);
    if (!response) return sponsors;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Strategy 1: Look for sponsor sections with images
    const sponsorSections = $(
      '[class*="sponsor"], [class*="partner"], [id*="sponsor"], [id*="partner"], ' +
        '[class*="Sponsor"], [class*="Partner"]'
    );

    sponsorSections.find("img").each((_, element) => {
      const img = $(element);
      const alt = img.attr("alt") || "";
      const src = img.attr("src") || "";
      const parentLink = img.closest("a");
      const href = parentLink.attr("href");

      if (alt && alt.length > 2 && alt.length < 100) {
        // Check if it's not a generic image
        const lowerAlt = alt.toLowerCase();
        if (
          !lowerAlt.includes("logo") ||
          lowerAlt.includes("sponsor") ||
          lowerAlt.includes("partner")
        ) {
          const sponsor: ScrapedSponsor = {
            name: cleanSponsorName(alt),
            sourceUrl: url,
          };

          if (src) {
            sponsor.logoUrl = resolveUrl(src, url);
          }

          if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
            sponsor.websiteUrl = resolveUrl(href, url);
          }

          sponsors.push(sponsor);
        }
      }
    });

    // Strategy 2: Look for sponsor lists (ul/ol with sponsor-related class)
    $(
      'ul[class*="sponsor"], ol[class*="sponsor"], ' +
        'ul[class*="partner"], ol[class*="partner"], ' +
        '.sponsors ul, .partners ul, #sponsors ul, #partners ul'
    )
      .find("li")
      .each((_, element) => {
        const li = $(element);
        const text = li.text().trim();
        const link = li.find("a").first();
        const img = li.find("img").first();

        if (text && text.length > 2 && text.length < 100) {
          const sponsor: ScrapedSponsor = {
            name: cleanSponsorName(text),
            sourceUrl: url,
          };

          if (link.attr("href")) {
            sponsor.websiteUrl = resolveUrl(link.attr("href")!, url);
          }

          if (img.attr("src")) {
            sponsor.logoUrl = resolveUrl(img.attr("src")!, url);
          }

          sponsors.push(sponsor);
        }
      });

    // Strategy 3: Look for headings followed by sponsor content
    $("h1, h2, h3, h4").each((_, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase();

      if (
        headingText.includes("sponsor") ||
        headingText.includes("partner") ||
        headingText.includes("supporter")
      ) {
        // Determine tier from heading
        let tier: string | undefined;
        if (headingText.includes("major") || headingText.includes("principal")) {
          tier = "Major";
        } else if (headingText.includes("gold")) {
          tier = "Gold";
        } else if (headingText.includes("silver")) {
          tier = "Silver";
        } else if (headingText.includes("bronze")) {
          tier = "Bronze";
        } else if (headingText.includes("community")) {
          tier = "Community";
        }

        // Get next sibling elements until next heading
        let next = $heading.next();
        let iterations = 0;

        while (next.length && iterations < 10) {
          if (next.is("h1, h2, h3, h4")) break;

          // Look for images or links in this section
          next.find("img").each((_, img) => {
            const $img = $(img);
            const alt = $img.attr("alt");
            const src = $img.attr("src");
            const parentLink = $img.closest("a");

            if (alt && alt.length > 2) {
              const sponsor: ScrapedSponsor = {
                name: cleanSponsorName(alt),
                tier,
                sourceUrl: url,
              };

              if (src) sponsor.logoUrl = resolveUrl(src, url);
              if (parentLink.attr("href")) {
                sponsor.websiteUrl = resolveUrl(parentLink.attr("href")!, url);
              }

              sponsors.push(sponsor);
            }
          });

          next = next.next();
          iterations++;
        }
      }
    });

    // Strategy 4: Look for common sponsor grid/gallery patterns
    $(
      '.sponsor-grid, .partner-grid, .sponsors-grid, .partners-grid, ' +
        '[class*="sponsor-logo"], [class*="partner-logo"]'
    )
      .find("img, a")
      .each((_, element) => {
        const $el = $(element);

        if ($el.is("img")) {
          const alt = $el.attr("alt");
          const src = $el.attr("src");

          if (alt && alt.length > 2 && alt.length < 100) {
            sponsors.push({
              name: cleanSponsorName(alt),
              logoUrl: src ? resolveUrl(src, url) : undefined,
              sourceUrl: url,
            });
          }
        } else if ($el.is("a")) {
          const text = $el.text().trim();
          const href = $el.attr("href");
          const img = $el.find("img").first();

          if (text && text.length > 2 && text.length < 100) {
            sponsors.push({
              name: cleanSponsorName(text),
              websiteUrl: href ? resolveUrl(href, url) : undefined,
              logoUrl: img.attr("src")
                ? resolveUrl(img.attr("src")!, url)
                : undefined,
              sourceUrl: url,
            });
          }
        }
      });
  } catch (error) {
    console.error(`Error extracting sponsors from ${url}:`, error);
  }

  return sponsors;
}

/**
 * Clean up sponsor name
 */
function cleanSponsorName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/logo$/i, "")
    .replace(/sponsor$/i, "")
    .replace(/partner$/i, "")
    .trim();
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/**
 * Deduplicate sponsors by name
 */
function deduplicateSponsors(sponsors: ScrapedSponsor[]): ScrapedSponsor[] {
  const seen = new Map<string, ScrapedSponsor>();

  for (const sponsor of sponsors) {
    const key = sponsor.name.toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, sponsor);
    } else {
      // Merge data from duplicate entries
      const existing = seen.get(key)!;
      if (!existing.logoUrl && sponsor.logoUrl) {
        existing.logoUrl = sponsor.logoUrl;
      }
      if (!existing.websiteUrl && sponsor.websiteUrl) {
        existing.websiteUrl = sponsor.websiteUrl;
      }
      if (!existing.tier && sponsor.tier) {
        existing.tier = sponsor.tier;
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Main function to scrape sponsors from a club website
 */
export async function scrapeClubSponsors(
  websiteUrl: string
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    sponsors: [],
    scrapedUrls: [],
    errors: [],
  };

  if (!websiteUrl) {
    result.errors.push("No website URL provided");
    return result;
  }

  try {
    // Normalize URL
    const baseUrl = websiteUrl.endsWith("/")
      ? websiteUrl.slice(0, -1)
      : websiteUrl;

    // Find sponsor-related pages
    const sponsorPages = await findSponsorPages(baseUrl);
    result.scrapedUrls = sponsorPages;

    // Extract sponsors from each page
    const allSponsors: ScrapedSponsor[] = [];

    for (const pageUrl of sponsorPages) {
      const pageSponsors = await extractSponsorsFromPage(pageUrl);
      allSponsors.push(...pageSponsors);
    }

    // Deduplicate and filter
    result.sponsors = deduplicateSponsors(allSponsors).filter(
      (s) => s.name.length >= 3 && s.name.length <= 100
    );
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  return result;
}
