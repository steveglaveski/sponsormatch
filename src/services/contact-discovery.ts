/**
 * Contact Discovery Service
 *
 * Discovers contact information for sponsors through multiple strategies:
 * 1. Website scraping for contact pages (most reliable)
 * 2. Hunter.io API lookup
 * 3. Guessed email patterns (last resort, with verification)
 */

import * as cheerio from "cheerio";

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

export interface ContactInfo {
  email?: string;
  phone?: string;
  contactName?: string;
  contactRole?: string;
  linkedIn?: string;
  source: "website" | "api" | "pattern";
  confidence: "high" | "medium" | "low";
  verified?: boolean;
}

interface DiscoveryResult {
  contacts: ContactInfo[];
  websiteData?: {
    hasContactPage: boolean;
    hasSocialLinks: boolean;
  };
}

// Contact page URL patterns to check
const CONTACT_PAGE_PATTERNS = [
  "/contact",
  "/contact-us",
  "/about/contact",
  "/get-in-touch",
  "/reach-us",
  "/about",
  "/about-us",
  "/support",
  "/", // Homepage often has contact in footer
];

// Personal email domains to skip
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "msn.com",
  "aol.com",
  "mail.com",
  "protonmail.com",
  "zoho.com",
];

// Email prefixes to skip (not useful for contact)
const SKIP_EMAIL_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
  "unsubscribe",
  "bounce",
  "auto",
];

// Priority order for email prefixes (best first)
const EMAIL_PRIORITY_ORDER = [
  "marketing",
  "sponsorship",
  "partnerships",
  "partner",
  "contact",
  "hello",
  "enquiries",
  "inquiries",
  "info",
  "sales",
  "business",
  "admin",
  "office",
  "reception",
];

export async function discoverContacts(
  companyName: string,
  website?: string
): Promise<DiscoveryResult> {
  const contacts: ContactInfo[] = [];
  const websiteData = {
    hasContactPage: false,
    hasSocialLinks: false,
  };

  // Decode URL-encoded characters in company name
  const decodedCompanyName = cleanAndDecodeText(companyName);

  // Strategy 1: Scrape their website for contact info (most reliable)
  if (website) {
    try {
      console.log(`[ContactDiscovery] Strategy 1: Scraping website ${website}`);
      const scrapedContacts = await scrapeWebsiteForContacts(website);
      console.log(`[ContactDiscovery] Website scrape found ${scrapedContacts.length} emails`);
      if (scrapedContacts.length > 0) {
        websiteData.hasContactPage = true;
        contacts.push(...scrapedContacts);
      }

      // Also get social links
      const socialLinks = await scrapeSocialLinks(website);
      if (socialLinks.length > 0) {
        websiteData.hasSocialLinks = true;
        socialLinks.forEach((link) => {
          contacts.push({
            linkedIn: link,
            source: "website",
            confidence: "medium",
          });
        });
      }
    } catch (error) {
      console.error("Website scraping error:", error);
    }
  }

  // Strategy 2: Use Hunter.io API if configured and no high-confidence email found
  const hasHighConfidenceEmail = contacts.some(
    (c) => c.email && c.confidence === "high"
  );

  console.log(`[ContactDiscovery] Strategy 2: Hunter.io API - hasHighConfidenceEmail=${hasHighConfidenceEmail}, hasApiKey=${!!process.env.HUNTER_API_KEY}`);

  if (!hasHighConfidenceEmail && process.env.HUNTER_API_KEY && website) {
    try {
      const apiContacts = await findEmailViaHunter(website);
      console.log(`[ContactDiscovery] Hunter.io found ${apiContacts.length} contacts`);
      if (apiContacts.length > 0) {
        contacts.push(...apiContacts);
      }
    } catch (error) {
      console.error("Hunter.io API error:", error);
    }
  }

  // Strategy 3: Guess and optionally verify (last resort)
  const hasAnyEmail = contacts.some((c) => c.email);
  console.log(`[ContactDiscovery] Strategy 3: Guessing - hasAnyEmail=${hasAnyEmail}`);

  if (!hasAnyEmail) {
    const domain = extractDomain(website);
    console.log(`[ContactDiscovery] Extracted domain: ${domain}`);
    if (domain) {
      const guessedContacts = await guessEmails(domain);
      console.log(`[ContactDiscovery] Guessed ${guessedContacts.length} emails`);
      contacts.push(...guessedContacts);
    } else {
      // No website - guess domain from company name
      const guessedDomain = guessDomain(decodedCompanyName);
      console.log(`[ContactDiscovery] Guessed domain from name: ${guessedDomain}`);
      if (guessedDomain) {
        const guessedContacts = await guessEmails(guessedDomain);
        contacts.push(...guessedContacts);
      }
    }
  }

  // Deduplicate and return
  const uniqueContacts = deduplicateContacts(contacts);
  return { contacts: uniqueContacts, websiteData };
}

/**
 * Strategy 1: Scrape the company's website for contact emails
 */
async function scrapeWebsiteForContacts(
  websiteUrl: string
): Promise<ContactInfo[]> {
  const contacts: ContactInfo[] = [];

  try {
    const baseUrl = websiteUrl.startsWith("http")
      ? websiteUrl
      : `https://${websiteUrl}`;

    for (const path of CONTACT_PAGE_PATTERNS) {
      try {
        const url = new URL(path, baseUrl).href;
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const html = await response.text();
        const pageEmails = extractEmailsFromHTML(html, baseUrl);

        if (pageEmails.length > 0) {
          // Prioritize and add emails
          const prioritized = prioritizeEmails(pageEmails);
          for (const emailData of prioritized.slice(0, 3)) {
            contacts.push({
              email: emailData.email,
              contactName: emailData.name,
              contactRole: emailData.role,
              source: "website",
              confidence: "high",
              verified: true, // It's on their website
            });
          }

          // Also extract phone if found
          const phone = extractPhoneFromHTML(html);
          if (phone && contacts.length > 0) {
            contacts[0].phone = phone;
          }

          break; // Found emails, no need to check more pages
        }
      } catch {
        continue; // Try next page
      }
    }
  } catch (error) {
    console.error("Error scraping website for contacts:", error);
  }

  return contacts;
}

/**
 * Extract emails from HTML content
 */
function extractEmailsFromHTML(
  html: string,
  baseUrl: string
): Array<{ email: string; name?: string; role?: string }> {
  const $ = cheerio.load(html);
  const emails: Array<{ email: string; name?: string; role?: string }> = [];
  const seenEmails = new Set<string>();

  // Email regex pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Method 1: Find mailto: links (most reliable)
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].toLowerCase().trim();

    if (isValidBusinessEmail(email) && !seenEmails.has(email)) {
      seenEmails.add(email);
      const linkText = $(el).text().trim();
      const name = linkText.includes("@") ? undefined : linkText;
      emails.push({ email, name });
    }
  });

  // Method 2: Find emails in text content
  const textContent = $("body").text();
  const foundEmails = textContent.match(emailRegex) || [];

  for (const email of foundEmails) {
    const lowerEmail = email.toLowerCase();
    if (isValidBusinessEmail(lowerEmail) && !seenEmails.has(lowerEmail)) {
      seenEmails.add(lowerEmail);
      emails.push({ email: lowerEmail });
    }
  }

  // Method 3: Check structured data (JSON-LD)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const structuredEmail =
        data.email || data.contactPoint?.email || data.author?.email;
      if (structuredEmail) {
        const email = structuredEmail.toLowerCase();
        if (isValidBusinessEmail(email) && !seenEmails.has(email)) {
          seenEmails.add(email);
          emails.push({ email });
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  });

  return emails;
}

/**
 * Extract Australian phone numbers from HTML
 */
function extractPhoneFromHTML(html: string): string | undefined {
  const phoneRegex =
    /(?:\+61|0)[2-478](?:[ -]?\d){8}|(?:1300|1800|13)(?:[ -]?\d){6}/g;
  const phones = html.match(phoneRegex) || [];
  return phones[0];
}

/**
 * Check if email looks like a valid business email
 */
function isValidBusinessEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;

  const lowerEmail = email.toLowerCase();
  const [prefix, domain] = lowerEmail.split("@");

  // Skip personal email providers
  if (PERSONAL_EMAIL_DOMAINS.includes(domain)) return false;

  // Skip non-contact addresses
  if (SKIP_EMAIL_PREFIXES.some((skip) => prefix.includes(skip))) return false;

  // Basic format validation
  if (prefix.length < 2 || domain.length < 4) return false;

  return true;
}

/**
 * Prioritize emails by usefulness for sponsorship outreach
 */
function prioritizeEmails(
  emails: Array<{ email: string; name?: string; role?: string }>
) {
  return emails.sort((a, b) => {
    const prefixA = a.email.split("@")[0];
    const prefixB = b.email.split("@")[0];

    const indexA = EMAIL_PRIORITY_ORDER.findIndex((p) => prefixA.includes(p));
    const indexB = EMAIL_PRIORITY_ORDER.findIndex((p) => prefixB.includes(p));

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return 0;
  });
}

/**
 * Strategy 2: Use Hunter.io API to find emails
 */
async function findEmailViaHunter(websiteUrl: string): Promise<ContactInfo[]> {
  const contacts: ContactInfo[] = [];

  if (!process.env.HUNTER_API_KEY) return contacts;

  try {
    const domain = extractDomain(websiteUrl);
    if (!domain) return contacts;

    // Hunter.io domain search
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${process.env.HUNTER_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.error("Hunter.io API error:", response.status);
      return contacts;
    }

    const data = await response.json();

    if (data.data?.emails?.length > 0) {
      // Prioritize by department
      const priorityDepts = ["marketing", "executive", "sales", "management"];

      const sorted = [...data.data.emails].sort((a: any, b: any) => {
        const indexA = priorityDepts.indexOf(a.department || "");
        const indexB = priorityDepts.indexOf(b.department || "");
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (b.confidence || 0) - (a.confidence || 0);
      });

      // Take top 3 results
      for (const result of sorted.slice(0, 3)) {
        const confidence =
          result.confidence > 80
            ? "high"
            : result.confidence > 50
              ? "medium"
              : "low";

        contacts.push({
          email: result.value,
          contactName:
            [result.first_name, result.last_name].filter(Boolean).join(" ") ||
            undefined,
          contactRole: result.position || undefined,
          source: "api",
          confidence,
          verified: result.verification?.status === "valid",
        });
      }
    }
  } catch (error) {
    console.error("Hunter.io API error:", error);
  }

  return contacts;
}

/**
 * Strategy 3: Guess common email patterns
 */
async function guessEmails(domain: string): Promise<ContactInfo[]> {
  const contacts: ContactInfo[] = [];

  // Common email patterns to suggest
  const patterns = ["info", "contact", "hello", "enquiries", "admin"];

  // If Hunter API key is available, verify the guesses
  if (process.env.HUNTER_API_KEY) {
    for (const prefix of patterns.slice(0, 2)) {
      const email = `${prefix}@${domain}`;
      const isValid = await verifyEmailWithHunter(email);

      if (isValid) {
        contacts.push({
          email,
          source: "pattern",
          confidence: "medium",
          verified: true,
        });
        break; // Found a valid one
      }
    }
  }

  // If no verified email found, return best guess
  if (contacts.length === 0) {
    contacts.push({
      email: `info@${domain}`,
      source: "pattern",
      confidence: "low",
      verified: false,
    });
  }

  return contacts;
}

/**
 * Verify email with Hunter.io
 */
async function verifyEmailWithHunter(email: string): Promise<boolean> {
  if (!process.env.HUNTER_API_KEY) return false;

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${process.env.HUNTER_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.data?.status === "valid" || data.data?.status === "accept_all";
  } catch {
    return false;
  }
}

/**
 * Extract domain from website URL
 */
function extractDomain(website?: string): string | null {
  if (!website) return null;

  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Try simple extraction
    return website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }
}

/**
 * Guess domain from company name
 */
function guessDomain(companyName: string): string | null {
  const decoded = cleanAndDecodeText(companyName);

  const cleaned = decoded
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+(pty|ltd|limited|inc|corp|co|australia|aus)$/i, "")
    .replace(/\s+/g, "")
    .trim();

  if (cleaned.length < 3) return null;

  return `${cleaned}.com.au`;
}

/**
 * Scrape social media links from website
 */
async function scrapeSocialLinks(websiteUrl: string): Promise<string[]> {
  const links: string[] = [];

  try {
    const baseUrl = websiteUrl.startsWith("http")
      ? websiteUrl
      : `https://${websiteUrl}`;

    const response = await fetch(baseUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return links;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find LinkedIn company pages
    $('a[href*="linkedin.com/company"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !links.includes(href)) links.push(href);
    });

    // Find LinkedIn personal profiles
    $('a[href*="linkedin.com/in"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !links.includes(href)) links.push(href);
    });
  } catch {
    // Silently fail
  }

  return links;
}

/**
 * Deduplicate contacts by email
 */
function deduplicateContacts(contacts: ContactInfo[]): ContactInfo[] {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    const key = contact.email || contact.linkedIn || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { isValidBusinessEmail, extractDomain };
