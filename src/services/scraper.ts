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
 * Detect if text looks like an image filename, CMS hash, or garbage
 * Returns true if the text should be rejected
 */
function isGarbageText(text: string): boolean {
  if (!text) return true;

  const lowerText = text.toLowerCase();

  // Pattern 1: Contains long alphanumeric hashes (12+ chars without spaces)
  // e.g., "qmp0samij3o2ocrz733c6zhl8gptmup79p42pgay9s"
  const hashPattern = /[a-z0-9]{12,}/i;
  const wordsWithHashes = text.split(/\s+/).filter((word) => hashPattern.test(word));
  if (wordsWithHashes.length > 0) return true;

  // Pattern 2: Looks like an image filename
  const filenamePatterns = [
    /^IMG[\s_-]?\d+/i, // IMG_1234, IMG 1234
    /^DSC[\s_-]?\d+/i, // DSC_1234
    /^Photo[\s_-]?\d+/i, // Photo_1234
    /^Image[\s_-]?\d+/i, // Image_1234
    /^\d{4}[\s_-]\d{2}[\s_-]\d{2}/, // 2024-01-15
    /\d{1,2}\.\d{2}\.\d{2}\s*(am|pm)/i, // 7.09.57 pm (timestamp)
    /\d+x\d+/, // 150x150 (dimensions)
    /\.(jpg|jpeg|png|gif|svg|webp|pdf|bmp|tiff?)$/i, // File extensions
  ];

  for (const pattern of filenamePatterns) {
    if (pattern.test(text)) return true;
  }

  // Pattern 3: Contains image/design file keywords
  const fileKeywords = [
    "cmyk",
    "rgb",
    "lockup",
    "tagline",
    "positive",
    "negative",
    "stacked",
    "horizontal",
    "vertical",
    "copy of",
    "scaled",
    "cropped",
    "resized",
    "thumbnail",
    "preview",
    "final",
    "draft",
    "v1",
    "v2",
    "v3",
    "_v",
    "-v",
    "artwork",
    "artfile",
    "press",
    "print ready",
  ];
  for (const keyword of fileKeywords) {
    if (lowerText.includes(keyword)) return true;
  }

  // Pattern 4: More than 30% of total length is from hash-like words
  const totalLength = text.replace(/\s/g, "").length;
  const hashLength = wordsWithHashes.join("").length;
  if (totalLength > 0 && hashLength / totalLength > 0.3) return true;

  // Pattern 5: Contains sequences like "r3f6csp8h866" anywhere
  if (/[a-z]\d[a-z0-9]{6,}/i.test(text)) return true;

  return false;
}

/**
 * Decode URL-encoded text and clean it up
 * Handles %20 -> space, %26 -> &, etc.
 */
function cleanAndDecodeText(text: string): string {
  if (!text) return "";

  let decoded = text;
  try {
    // Handle double-encoding by decoding until stable
    let previous = "";
    let iterations = 0;
    while (decoded !== previous && iterations < 5) {
      previous = decoded;
      decoded = decodeURIComponent(decoded);
      iterations++;
    }
  } catch {
    // If decodeURIComponent fails, try manual replacement of common encodings
    decoded = text
      .replace(/%20/g, " ")
      .replace(/%26/g, "&")
      .replace(/%27/g, "'")
      .replace(/%28/g, "(")
      .replace(/%29/g, ")")
      .replace(/%2C/g, ",")
      .replace(/%2F/g, "/")
      .replace(/%3A/g, ":")
      .replace(/%3B/g, ";")
      .replace(/%40/g, "@")
      .replace(/%2B/g, "+")
      .replace(/%25/g, "%");
  }

  return decoded.trim();
}

/**
 * Rate-limited fetch with browser-like headers
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

    // Try HTTPS first, then HTTP if that fails
    const urlsToTry = [url];
    if (url.startsWith("http://")) {
      urlsToTry.unshift(url.replace("http://", "https://"));
    }

    for (const tryUrl of urlsToTry) {
      try {
        const response = await fetch(tryUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
          redirect: "follow",
        });

        if (response.ok) {
          return response;
        }
      } catch {
        // Try next URL
        continue;
      }
    }

    return null;
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

// Common words/patterns that indicate this is NOT a sponsor name
const NON_SPONSOR_PATTERNS = [
  // Generic/placeholder terms
  /^placeholder$/i,
  /^default$/i,
  /^blank$/i,
  /^img\d*$/i,
  /^image\d*$/i,
  /^photo\d*$/i,
  /^pic\d*$/i,
  /^untitled/i,
  /^screenshot/i,
  /^screen shot/i,
  /^dsc\d/i,
  /^img_\d/i,
  /^photo_\d/i,
  /whatsapp/i,
  /^wa\d/i,

  // Slogans and motivational phrases
  /whatever\s*it\s*takes/i,
  /^(be|go|get|let|just|we|our|the|your|my)\s/i,
  /^never\s/i,
  /^always\s/i,
  /together/i,
  /^believe/i,
  /^dream/i,
  /^play\s/i,
  /^win\s/i,
  /^team\s/i,

  // UI/Navigation elements
  /^contact$/i,
  /^contact\s*us$/i,
  /^about$/i,
  /^about\s*us$/i,
  /^home$/i,
  /^menu$/i,
  /^nav$/i,
  /^header$/i,
  /^footer$/i,
  /^banner$/i,
  /^button$/i,
  /^icon$/i,
  /^arrow$/i,
  /^close$/i,
  /^open$/i,
  /^search$/i,
  /^login$/i,
  /^log\s*in$/i,
  /^signup$/i,
  /^sign\s*up$/i,
  /^sign\s*in$/i,
  /^register$/i,
  /^subscribe$/i,
  /^click\s*here$/i,
  /^read\s*more$/i,
  /^learn\s*more$/i,
  /^view\s*more$/i,
  /^view\s*all$/i,
  /^see\s*more$/i,
  /^see\s*all$/i,
  /^more\s*info$/i,
  /^next$/i,
  /^previous$/i,
  /^prev$/i,
  /^back$/i,
  /^forward$/i,
  /^submit$/i,
  /^send$/i,
  /^download$/i,
  /^upload$/i,
  /^share$/i,
  /^print$/i,
  /^email\s*us$/i,

  // Common personal names (first names only - likely staff photos)
  /^(john|jane|mike|michael|david|sarah|emma|sophie|james|robert|mary|lisa|anna|tom|chris|dan|matt|ben|sam|alex|kate|amy|luke|mark|paul|peter|steve|brian|kevin|andrew|ryan|josh|nick|adam|jack|max|joe|tim|ian|alan|gary|simon|tony|carl|lee|martin|neil|sean|craig|scott|dean|ross|grant|wayne|troy|brad|chad|greg|darren|barry|keith|glen|stuart|derek|trevor|phillip|graham|russell|roger|colin)$/i,

  // Generic descriptive terms
  /^logo$/i,
  /^logos?$/i,
  /^sponsor$/i,
  /^sponsors$/i,
  /^partner$/i,
  /^partners$/i,
  /^supporter$/i,
  /^supporters$/i,
  /^our\s*sponsors$/i,
  /^our\s*partners$/i,
  /^our\s*supporters$/i,
  /^member$/i,
  /^team$/i,
  /^staff$/i,
  /^player$/i,
  /^coach$/i,
  /^club$/i,
  /^news$/i,
  /^event$/i,
  /^gallery$/i,
  /^slide\d*$/i,
  /^carousel/i,
  /^background/i,
  /^hero$/i,
  /^feature/i,
  /^advertisement$/i,
  /^ad$/i,
  /^promo$/i,
  /^promotion$/i,

  // Tier labels that should not be sponsor names
  /^major\s*(sponsor|partner)?$/i,
  /^principal\s*(sponsor|partner)?$/i,
  /^gold\s*(sponsor|partner)?$/i,
  /^silver\s*(sponsor|partner)?$/i,
  /^bronze\s*(sponsor|partner)?$/i,
  /^platinum\s*(sponsor|partner)?$/i,
  /^community\s*(sponsor|partner)?$/i,
  /^official\s*(sponsor|partner)?$/i,
  /^naming\s*rights$/i,
  /^title\s*sponsor$/i,

  // File/technical terms
  /^cropped/i,
  /^scaled/i,
  /^resized/i,
  /^copy$/i,
  /^final$/i,
  /^edit$/i,
  /^version/i,
  /^\d+$/,  // Just numbers
  /^[a-z]$/i,  // Single letters
  /^[a-f0-9]{8,}$/i,  // Hashes/UUIDs
  /\d{4}\s*\d{2}\s*\d{2}/,  // Date patterns like 2025 03 18
  /at\d{2}\.\d{2}/i,  // Time patterns like at18.45
  /^\d+x\d+$/,  // Dimensions like 150x150
  /\.(jpg|jpeg|png|gif|svg|webp|pdf)$/i,  // File extensions

  // Image/design file patterns
  /cmyk/i,
  /rgb\b/i,
  /lockup/i,
  /tagline/i,
  /\bwith\s+tagline\b/i,
  /positive\s+(cmyk|rgb)/i,
  /negative\s+(cmyk|rgb)/i,
  /\bstacked\b/i,
  /\bhorizontal\b/i,
  /\bvertical\b/i,
  /artwork/i,
  /artfile/i,
  /print\s*ready/i,
  /\bpress\b.*\bready\b/i,
  /thumbnail/i,
  /preview/i,
  /\bdraft\b/i,
  /\bv\d+\b/i,  // v1, v2, etc.
  /_v\d/i,  // _v1, _v2
  /-v\d/i,  // -v1, -v2
  /\br\d[a-z0-9]{5,}/i,  // CMS hashes like r3f6csp8h866
  /\bq[a-z0-9]{10,}/i,  // CDN hashes like qmp0samij3o2

  // Website/social media elements
  /^facebook$/i,
  /^instagram$/i,
  /^twitter$/i,
  /^linkedin$/i,
  /^youtube$/i,
  /^tiktok$/i,
  /^snapchat$/i,
  /^pinterest$/i,
  /^x\.com$/i,
  /^follow\s*us/i,
  /^like$/i,
  /^comment$/i,

  // Common website footer elements
  /^copyright/i,
  /^all\s*rights\s*reserved/i,
  /^privacy\s*policy/i,
  /^terms\s*(of\s*service|and\s*conditions)?$/i,
  /^cookie\s*policy/i,
  /^powered\s*by/i,
  /^built\s*by/i,
  /^designed\s*by/i,
  /^developed\s*by/i,

  // Sports/club related non-sponsor terms
  /^fixture/i,
  /^fixtures$/i,
  /^result/i,
  /^results$/i,
  /^ladder$/i,
  /^schedule$/i,
  /^training/i,
  /^registration/i,
  /^membership/i,
  /^juniors?$/i,
  /^seniors?$/i,
  /^womens?$/i,
  /^mens?$/i,
  /^under\s*\d/i,
  /^u\d{1,2}s?$/i,

  // Misc noise
  /^undefined$/i,
  /^null$/i,
  /^n\/a$/i,
  /^tba$/i,
  /^tbc$/i,
  /^coming\s*soon$/i,
  /^no\s*name$/i,
];

// Common business suffixes that indicate a legitimate company name
const BUSINESS_SUFFIXES = [
  /\b(pty|ltd|inc|corp|co|group|services|solutions|industries|australia|au)\.?$/i,
  /\b(construction|builders?|building|homes?|properties|property|real\s*estate)$/i,
  /\b(electrical|plumbing|mechanical|engineering|consulting|consulting)$/i,
  /\b(logistics|transport|auto|motors?|automotive|cars?)$/i,
  /\b(finance|financial|accounting|legal|lawyers?|law)$/i,
  /\b(cafe|restaurant|bar|hotel|catering|food)$/i,
  /\b(gym|fitness|health|medical|dental|pharmacy|chemist)$/i,
  /\b(print|printing|graphics|design|media|studio)$/i,
  /\b(steel|metal|concrete|glass|timber|supplies)$/i,
  /\b(wholesale|retail|store|shop|mart|warehouse)$/i,
];

/**
 * Check if a name looks like a valid sponsor/company name
 */
function isValidSponsorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) {
    return false;
  }

  const trimmed = name.trim();

  // First check if it's garbage (hashes, filenames, etc.)
  if (isGarbageText(trimmed)) {
    return false;
  }

  // Check against blocklist patterns
  for (const pattern of NON_SPONSOR_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Must have at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return false;
  }

  // Reject if it looks like a filename (contains file extensions)
  if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|html|php|aspx)$/i.test(trimmed)) {
    return false;
  }

  // Reject camelCase or internal caps that look like code/filenames (e.g., "WhatsAppImage")
  if (/[a-z][A-Z]/.test(trimmed) && !trimmed.includes(" ")) {
    return false;
  }

  // Reject if it's just a URL
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return false;
  }

  // Reject if it looks like a file path
  if (trimmed.includes("/") && !trimmed.includes(" ")) {
    return false;
  }

  // Reject if mostly numbers (less than 30% letters)
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < trimmed.length * 0.3) {
    return false;
  }

  // Reject common single words that are not company names
  const singleWordBlacklist = [
    "the", "and", "or", "but", "for", "with", "from", "this", "that",
    "are", "was", "were", "been", "being", "have", "has", "had",
    "new", "view", "more", "all", "click", "here", "now", "get",
  ];
  if (singleWordBlacklist.includes(trimmed.toLowerCase())) {
    return false;
  }

  // Reject if it's just a single short word without business indicators
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    // Single word - must be at least 4 chars
    if (trimmed.length < 4) {
      return false;
    }
    // Single lowercase word under 8 chars is suspicious (e.g., "vaitale")
    if (trimmed === trimmed.toLowerCase() && trimmed.length < 8) {
      // Unless it has a business suffix
      const hasBusinessSuffix = BUSINESS_SUFFIXES.some(p => p.test(trimmed));
      if (!hasBusinessSuffix) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extract sponsor name from image - tries alt, title, parent link URL, then filename
 * Cleans the name to remove prefixes like "Logo of partner"
 */
function extractSponsorNameFromImage(
  $: cheerio.CheerioAPI,
  img: ReturnType<typeof $>,
  parentLink?: ReturnType<typeof $>
): string | null {
  // Try alt text first - clean it before validating
  const alt = img.attr("alt")?.trim();
  if (alt) {
    const cleanedAlt = cleanSponsorName(alt);
    if (cleanedAlt && isValidSponsorName(cleanedAlt)) {
      return cleanedAlt;
    }
  }

  // Try title attribute
  const title = img.attr("title")?.trim();
  if (title) {
    const cleanedTitle = cleanSponsorName(title);
    if (cleanedTitle && isValidSponsorName(cleanedTitle)) {
      return cleanedTitle;
    }
  }

  // Try to extract from parent link URL (more reliable than filename)
  // e.g., link to "https://www.alanmance.com.au" → "Alan Mance"
  const linkHref = parentLink?.attr("href") || img.closest("a").attr("href");
  if (linkHref && linkHref.startsWith("http")) {
    const nameFromUrl = extractCompanyNameFromUrl(linkHref);
    if (nameFromUrl && isValidSponsorName(nameFromUrl)) {
      return nameFromUrl;
    }
  }

  // Try to extract from filename (but be VERY strict - this is lowest quality)
  const src = img.attr("src") || "";
  if (src) {
    try {
      const url = new URL(src, "https://example.com");
      const pathname = url.pathname;
      const filename = pathname.split("/").pop() || "";
      // Remove extension and size suffixes like -150x150
      let nameFromFile = filename
        .replace(/\.[^.]+$/, "") // remove extension
        .replace(/-\d+x\d+$/, "") // remove size suffix
        .replace(/[-_]/g, " ") // convert dashes/underscores to spaces
        .replace(/\s+/g, " ") // normalize spaces
        .trim();

      // Clean the filename-derived name
      nameFromFile = cleanSponsorName(nameFromFile);

      // Only accept filename-based names if they look like real company names
      // Must be at least 2 words AND pass validation
      if (nameFromFile && isValidSponsorName(nameFromFile)) {
        const words = nameFromFile.split(" ").filter((w) => w.length > 1);
        // Be extra strict with filenames: need 2+ words, or recognized business suffix
        if (words.length >= 2) {
          return nameFromFile;
        }
        // Single word only if it has a business suffix
        const hasBusinessSuffix = BUSINESS_SUFFIXES.some((p) =>
          p.test(nameFromFile)
        );
        if (hasBusinessSuffix) {
          return nameFromFile;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return null;
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
        '[class*="Sponsor"], [class*="Partner"], ' +
        '[class*="logo-sponsor"], [class*="logo-partner"], ' +
        '.sponsor, .partner, .sponsors, .partners'
    );

    sponsorSections.find("img").each((_, element) => {
      const img = $(element);
      const src = img.attr("src") || "";
      const parentLink = img.closest("a");
      const href = parentLink.attr("href");

      const name = extractSponsorNameFromImage($, img);
      if (name) {
        const sponsor: ScrapedSponsor = {
          name: cleanSponsorName(name),
          sourceUrl: url,
        };

        if (src) {
          sponsor.logoUrl = resolveUrl(src, url);
        }

        // Only capture external URLs (actual sponsor websites, not club page links)
        const externalUrl = getExternalUrl(href || "", url);
        if (externalUrl) {
          sponsor.websiteUrl = externalUrl;
        }

        sponsors.push(sponsor);
      }
    });

    // Strategy 1b: Sponsor cards with text labels (h5, h4, h3, p tags)
    // Common pattern: image + company name in heading below
    // Only match if we're clearly inside a sponsors/partners section
    $(
      '.sponsor, .partner, [class*="sponsor-card"], [class*="partner-card"], ' +
        '[class*="sponsor-item"], [class*="partner-item"], ' +
        '[class*="sponsor-logo"], [class*="partner-logo"]'
    ).each((_, element) => {
      const $card = $(element);

      // Validate context - check if this card is inside a sponsor-related section
      // by looking at parent elements and nearby headings
      const parentClasses = $card.parents().map((_, el) => $(el).attr("class") || "").get().join(" ").toLowerCase();
      const isInSponsorSection = /sponsor|partner|supporter|backer/i.test(parentClasses);

      // Also check if there's a sponsor-related heading nearby
      const nearbyText = $card.parent().prev("h1, h2, h3, h4").text().toLowerCase();
      const hasNearbyHeading = /sponsor|partner|supporter/i.test(nearbyText);

      // Skip if not clearly in a sponsor context
      if (!isInSponsorSection && !hasNearbyHeading) {
        // Only proceed if the card itself has very sponsor-specific class
        const cardClass = ($card.attr("class") || "").toLowerCase();
        if (!/sponsor|partner/.test(cardClass)) {
          return;
        }
      }

      // Look for text in common heading/label elements
      const textEl = $card.find("h5, h4, h3, h6, p.name, span.name, .sponsor-name, .partner-name").first();
      const text = textEl.text()?.trim();

      if (text && isValidSponsorName(text)) {
        const img = $card.find("img").first();
        const link = $card.find("a").first();

        const sponsor: ScrapedSponsor = {
          name: cleanSponsorName(text),
          sourceUrl: url,
        };

        if (img.attr("src")) {
          sponsor.logoUrl = resolveUrl(img.attr("src")!, url);
        }

        const href = link.attr("href");
        const externalUrl = getExternalUrl(href || "", url);
        if (externalUrl) {
          sponsor.websiteUrl = externalUrl;
        }

        sponsors.push(sponsor);
      }
    });

    // Strategy 1c: WordPress Visual Composer pattern (.wpb_single_image in sponsor rows)
    $(
      '.sponsor-logos .wpb_single_image img, ' +
        '.partner-logos .wpb_single_image img, ' +
        '[class*="sponsor"] .wpb_single_image img, ' +
        '[class*="partner"] .wpb_single_image img, ' +
        '.logo-sponsors img, .logo-partners img'
    ).each((_, element) => {
      const img = $(element);
      const src = img.attr("src") || "";
      const parentLink = img.closest("a");
      const href = parentLink.attr("href");

      const name = extractSponsorNameFromImage($, img);
      if (name) {
        const sponsor: ScrapedSponsor = {
          name: cleanSponsorName(name),
          sourceUrl: url,
        };

        if (src) {
          sponsor.logoUrl = resolveUrl(src, url);
        }

        const externalUrl = getExternalUrl(href || "", url);
        if (externalUrl) {
          sponsor.websiteUrl = externalUrl;
        }

        sponsors.push(sponsor);
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

          const externalUrl = getExternalUrl(link.attr("href") || "", url);
          if (externalUrl) {
            sponsor.websiteUrl = externalUrl;
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
            const src = $img.attr("src");
            const parentLink = $img.closest("a");

            const name = extractSponsorNameFromImage($, $img);
            if (name) {
              const sponsor: ScrapedSponsor = {
                name: cleanSponsorName(name),
                tier,
                sourceUrl: url,
              };

              if (src) sponsor.logoUrl = resolveUrl(src, url);
              const externalUrl = getExternalUrl(parentLink.attr("href") || "", url);
              if (externalUrl) {
                sponsor.websiteUrl = externalUrl;
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
          const src = $el.attr("src");
          const name = extractSponsorNameFromImage($, $el);

          if (name) {
            sponsors.push({
              name: cleanSponsorName(name),
              logoUrl: src ? resolveUrl(src, url) : undefined,
              sourceUrl: url,
            });
          }
        } else if ($el.is("a")) {
          const text = $el.text().trim();
          const href = $el.attr("href");
          const img = $el.find("img").first();

          // Try link text first, then image inside the link
          let name = text && text.length > 2 && text.length < 100 ? text : null;
          if (!name && img.length) {
            name = extractSponsorNameFromImage($, img);
          }

          if (name) {
            sponsors.push({
              name: cleanSponsorName(name),
              websiteUrl: getExternalUrl(href || "", url) || undefined,
              logoUrl: img.attr("src")
                ? resolveUrl(img.attr("src")!, url)
                : undefined,
              sourceUrl: url,
            });
          }
        }
      });

    // Strategy 5: Look for figure elements with images (common WordPress pattern)
    $("figure.wpb_wrapper, figure.wp-block-image")
      .closest('[class*="sponsor"], [class*="partner"], [class*="logo"]')
      .find("img")
      .each((_, element) => {
        const img = $(element);
        const src = img.attr("src") || "";
        const parentLink = img.closest("a");
        const href = parentLink.attr("href");

        const name = extractSponsorNameFromImage($, img);
        if (name) {
          sponsors.push({
            name: cleanSponsorName(name),
            logoUrl: src ? resolveUrl(src, url) : undefined,
            websiteUrl: getExternalUrl(href || "", url) || undefined,
            sourceUrl: url,
          });
        }
      });
  } catch (error) {
    console.error(`Error extracting sponsors from ${url}:`, error);
  }

  return sponsors;
}

/**
 * Clean raw sponsor text to extract just the company name
 * Removes common prefixes like "Logo of partner Mission Foods" → "Mission Foods"
 * Also decodes URL-encoded characters like %20 → space
 * Strips CMS hashes and file garbage like "qmp0samij3o2ocrz..."
 */
function cleanSponsorName(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  // First decode any URL-encoded characters (e.g., %20 -> space)
  let cleaned = cleanAndDecodeText(rawText);

  // Remove CMS/CDN hashes (12+ alphanumeric characters) from anywhere in the string
  // e.g., "godfathers logo qmcldza1s5c5de3jrjj5vuwe3gp0cmqtuu7dyzaqkg" → "godfathers logo"
  cleaned = cleaned.replace(/\s+[a-z0-9]{12,}$/i, ""); // trailing hash
  cleaned = cleaned.replace(/\s+[a-z]\d[a-z0-9]{8,}/gi, ""); // mid-string hash like r3f6csp8h866

  // Remove image dimensions like "150x150"
  cleaned = cleaned.replace(/\s*\d+x\d+\s*/gi, " ");

  // Remove timestamps like "7.09.57 pm"
  cleaned = cleaned.replace(/\s*\d{1,2}\.\d{2}\.\d{2}\s*(am|pm)?\s*/gi, " ");

  // Remove image/design file terms
  const garbageTerms = [
    /\s+cmyk\b/gi,
    /\s+rgb\b/gi,
    /\s+lockup\b/gi,
    /\s+with\s+tagline\b/gi,
    /\s+tagline\b/gi,
    /\s+positive\b/gi,
    /\s+negative\b/gi,
    /\s+stacked\b/gi,
    /\s+horizontal\b/gi,
    /\s+vertical\b/gi,
    /\s+artwork\b/gi,
    /\s+artfile\b/gi,
    /\s+print\s*ready\b/gi,
    /\s+thumbnail\b/gi,
    /\s+preview\b/gi,
    /\s+draft\b/gi,
    /\s+v\d+\b/gi,
    /\s+_v\d\b/gi,
    /\s+-v\d\b/gi,
    /\s+final\b/gi,
  ];

  for (const pattern of garbageTerms) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove common prefixes from alt text (order matters - longer patterns first)
  const prefixPatterns = [
    /^logo\s+of\s+(partner|sponsor|our\s+partner|our\s+sponsor)\s+/i,
    /^(major|principal|gold|silver|bronze|platinum|community|official)\s+(partner|sponsor)\s+logo\s*(of)?\s*/i,
    /^(major|principal|gold|silver|bronze|platinum|community|official)\s+(partner|sponsor)\s+/i,
    /^logo\s*(of|for)?\s*(partner|sponsor)?\s*/i,
    /^partner\s*logo\s*(of|for)?\s*/i,
    /^sponsor\s*logo\s*(of|for)?\s*/i,
    /^image\s*(of|for)?\s*/i,
    /^icon\s*(of|for)?\s*/i,
    /^\d+\s*[-–]\s*/, // Remove leading numbers like "1 - "
  ];

  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove common suffixes
  const suffixPatterns = [
    /\s*logo$/i,
    /\s*icon$/i,
    /\s*image$/i,
    /\s*-\s*opens?\s*in\s*new\s*(tab|window)$/i,
    /\s*\(opens?\s*in\s*new\s*(tab|window)\)$/i,
    /\s*sponsor$/i,
    /\s*partner$/i,
  ];

  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Final check: if what's left is too short or still garbage, return empty
  if (cleaned.length < 2) return "";
  if (isGarbageText(cleaned)) return "";

  return cleaned;
}

/**
 * Extract sponsor tier from context text (heading, parent element, etc.)
 */
function extractTierFromContext(contextText: string): string | null {
  if (!contextText) return null;

  const lowerContext = contextText.toLowerCase();

  const tierPatterns: { pattern: RegExp; tier: string }[] = [
    // Major tiers (check more specific patterns first)
    { pattern: /naming\s*rights|title\s*sponsor/i, tier: "Principal" },
    { pattern: /principal|headline/i, tier: "Principal" },
    { pattern: /major|premier/i, tier: "Major" },
    { pattern: /platinum/i, tier: "Platinum" },
    { pattern: /gold|primary/i, tier: "Gold" },
    { pattern: /silver|secondary/i, tier: "Silver" },
    { pattern: /bronze|tertiary/i, tier: "Bronze" },

    // Partner types
    { pattern: /official\s*partner/i, tier: "Official Partner" },
    { pattern: /community\s*(partner|sponsor)/i, tier: "Community" },
    { pattern: /media\s*partner/i, tier: "Media Partner" },
    { pattern: /supporter/i, tier: "Supporter" },
  ];

  for (const { pattern, tier } of tierPatterns) {
    if (pattern.test(lowerContext)) {
      return tier;
    }
  }

  return null;
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
 * Extract company name from URL domain
 * e.g., "https://www.alanmance.com.au" → "Alan Mance"
 */
function extractCompanyNameFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname;

    // Remove www. prefix
    hostname = hostname.replace(/^www\./, "");

    // Remove TLD and country codes
    // e.g., "alanmance.com.au" → "alanmance"
    let name = hostname
      .replace(/\.(com|net|org|io|co|biz|info)(\.[a-z]{2})?$/i, "")
      .replace(/\.[a-z]{2,3}$/i, ""); // fallback for other TLDs

    // Skip if it's a known non-sponsor domain
    const skipDomains = [
      "facebook",
      "twitter",
      "instagram",
      "linkedin",
      "youtube",
      "tiktok",
      "google",
      "apple",
      "amazon",
      "microsoft",
      "cloudfront",
      "amazonaws",
      "cloudinary",
      "imgix",
      "squarespace",
      "wixstatic",
      "shopify",
    ];
    if (skipDomains.some((d) => name.includes(d))) return null;

    // Convert dashes/underscores to spaces
    name = name.replace(/[-_]/g, " ");

    // Capitalize each word
    name = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Validate - must be reasonable length
    if (name.length < 2 || name.length > 40) return null;

    // Must have at least one letter
    if (!/[a-zA-Z]/.test(name)) return null;

    return name;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is external (different domain from source)
 * Returns null if it's an internal link, otherwise returns the external URL
 */
function getExternalUrl(href: string, sourceUrl: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
    return null;
  }

  try {
    const resolved = new URL(href, sourceUrl);
    const source = new URL(sourceUrl);

    // Get base domains (strip www. and subdomains for comparison)
    const getBaseDomain = (hostname: string) => {
      const parts = hostname.replace(/^www\./, "").split(".");
      // Keep last 2 parts (e.g., "example.com" from "sub.example.com")
      return parts.slice(-2).join(".");
    };

    const resolvedDomain = getBaseDomain(resolved.hostname);
    const sourceDomain = getBaseDomain(source.hostname);

    // Only return if it's an external domain
    if (resolvedDomain !== sourceDomain) {
      return resolved.toString();
    }

    return null;
  } catch {
    return null;
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

    // Deduplicate and apply final validation filter
    result.sponsors = deduplicateSponsors(allSponsors).filter((s) => {
      // Final name validation
      if (!s.name || s.name.length < 2 || s.name.length > 100) {
        return false;
      }

      // Final check: clean the name one more time and validate
      const cleanedName = cleanSponsorName(s.name);
      if (!isValidSponsorName(cleanedName)) {
        return false;
      }

      // Update the sponsor name to the cleaned version
      s.name = cleanedName;

      return true;
    });
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  return result;
}
