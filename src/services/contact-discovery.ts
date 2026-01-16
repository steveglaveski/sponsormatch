/**
 * Contact Discovery Service
 *
 * Discovers contact information for sponsors through multiple strategies:
 * 1. Website scraping for contact pages
 * 2. Social media profile extraction
 * 3. Common email pattern generation
 *
 * Note: For production use, consider integrating Hunter.io or similar
 * email verification services for more reliable contact discovery.
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
  source: "website" | "pattern" | "social";
  confidence: "high" | "medium" | "low";
}

interface DiscoveryResult {
  contacts: ContactInfo[];
  websiteData?: {
    hasContactPage: boolean;
    hasSocialLinks: boolean;
  };
}

// Common email patterns for Australian businesses
const EMAIL_PATTERNS = [
  "{first}.{last}@{domain}",
  "{first}{last}@{domain}",
  "{first}@{domain}",
  "{f}{last}@{domain}",
  "info@{domain}",
  "contact@{domain}",
  "hello@{domain}",
  "sales@{domain}",
  "marketing@{domain}",
  "sponsorship@{domain}",
  "partnerships@{domain}",
];

// Contact page URL patterns
const CONTACT_PAGE_PATTERNS = [
  "/contact",
  "/contact-us",
  "/about/contact",
  "/get-in-touch",
  "/reach-us",
  "/about",
  "/about-us",
  "/team",
  "/our-team",
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

  if (!website) {
    // Generate pattern-based emails only
    const domain = guessDomain(decodedCompanyName);
    if (domain) {
      const patternEmails = generateEmailPatterns(domain);
      patternEmails.forEach((email) => {
        contacts.push({
          email,
          source: "pattern",
          confidence: "low",
        });
      });
    }
    return { contacts, websiteData };
  }

  try {
    // Extract domain from website
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    const domain = url.hostname.replace("www.", "");

    // Try to scrape contact page
    for (const path of CONTACT_PAGE_PATTERNS) {
      const contactUrl = `${url.origin}${path}`;
      const pageContacts = await scrapeContactPage(contactUrl);

      if (pageContacts.length > 0) {
        websiteData.hasContactPage = true;
        contacts.push(...pageContacts);
        break;
      }
    }

    // Also check main page for contact info
    const mainPageContacts = await scrapeContactPage(url.origin);
    contacts.push(...mainPageContacts);

    // Extract social links
    const socialLinks = await scrapeSocialLinks(url.origin);
    if (socialLinks.length > 0) {
      websiteData.hasSocialLinks = true;
      socialLinks.forEach((link) => {
        contacts.push({
          linkedIn: link,
          source: "social",
          confidence: "medium",
        });
      });
    }

    // Add pattern-based emails as fallback
    if (contacts.filter((c) => c.email).length === 0) {
      const patternEmails = generateEmailPatterns(domain);
      patternEmails.slice(0, 3).forEach((email) => {
        contacts.push({
          email,
          source: "pattern",
          confidence: "low",
        });
      });
    }
  } catch (error) {
    console.error("Contact discovery error:", error);

    // Fallback to pattern-based emails
    const domain = guessDomain(decodedCompanyName);
    if (domain) {
      const patternEmails = generateEmailPatterns(domain);
      patternEmails.slice(0, 3).forEach((email) => {
        contacts.push({
          email,
          source: "pattern",
          confidence: "low",
        });
      });
    }
  }

  // Deduplicate contacts
  const uniqueContacts = deduplicateContacts(contacts);

  return { contacts: uniqueContacts, websiteData };
}

async function scrapeContactPage(url: string): Promise<ContactInfo[]> {
  const contacts: ContactInfo[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return contacts;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const pageText = $("body").text();
    const emails = pageText.match(emailRegex) || [];

    // Filter out common non-contact emails
    const filteredEmails = emails.filter(
      (email) =>
        !email.includes("example.com") &&
        !email.includes("yourdomain") &&
        !email.includes("email@") &&
        !email.includes("@sentry") &&
        !email.includes("noreply") &&
        !email.includes("no-reply")
    );

    // Add unique emails
    const uniqueEmails = [...new Set(filteredEmails)];
    uniqueEmails.slice(0, 5).forEach((email) => {
      contacts.push({
        email: email.toLowerCase(),
        source: "website",
        confidence: "high",
      });
    });

    // Find phone numbers (Australian format)
    const phoneRegex =
      /(?:\+61|0)[2-478](?:[ -]?\d){8}|(?:1300|1800|13)(?:[ -]?\d){6}/g;
    const phones = pageText.match(phoneRegex) || [];
    const uniquePhones = [...new Set(phones)];

    if (uniquePhones.length > 0 && contacts.length > 0) {
      contacts[0].phone = uniquePhones[0];
    }

    // Try to find contact names from common patterns
    $("*").each((_, el) => {
      const text = $(el).text();
      const nameMatch = text.match(
        /(?:contact|reach|email)\s+(\w+\s+\w+)/i
      );
      if (nameMatch && contacts.length > 0 && !contacts[0].contactName) {
        contacts[0].contactName = nameMatch[1];
      }
    });
  } catch (error) {
    // Silently fail - contact scraping is best-effort
  }

  return contacts;
}

async function scrapeSocialLinks(url: string): Promise<string[]> {
  const links: string[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return links;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find LinkedIn company pages
    $('a[href*="linkedin.com/company"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) links.push(href);
    });

    // Find LinkedIn personal profiles
    $('a[href*="linkedin.com/in"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) links.push(href);
    });
  } catch (error) {
    // Silently fail
  }

  return [...new Set(links)];
}

function generateEmailPatterns(domain: string): string[] {
  // Generate common info/contact emails
  return [
    `info@${domain}`,
    `contact@${domain}`,
    `hello@${domain}`,
    `sales@${domain}`,
    `marketing@${domain}`,
    `sponsorship@${domain}`,
    `partnerships@${domain}`,
  ];
}

function guessDomain(companyName: string): string | null {
  // First decode any URL-encoded characters (e.g., %20 -> space)
  // This prevents "Genis%20Steel" from becoming "genis20steel"
  const decoded = cleanAndDecodeText(companyName);

  // Convert company name to likely domain
  const cleaned = decoded
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+(pty|ltd|limited|inc|corp|co|australia|aus)$/i, "")
    .replace(/\s+/g, "") // Now spaces become nothing, not "20"
    .trim();

  if (cleaned.length < 3) return null;

  return `${cleaned}.com.au`;
}

function deduplicateContacts(contacts: ContactInfo[]): ContactInfo[] {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    const key = contact.email || contact.linkedIn || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function verifyEmail(email: string): Promise<boolean> {
  // Placeholder for email verification
  // In production, integrate with Hunter.io, ZeroBounce, or similar service
  //
  // Example Hunter.io integration:
  // const response = await fetch(
  //   `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${process.env.HUNTER_API_KEY}`
  // );
  // const data = await response.json();
  // return data.data.status === 'valid';

  // For now, do basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
