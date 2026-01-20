export const AUSTRALIAN_STATES = [
  "VIC",
  "NSW",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "NT",
  "ACT",
] as const;

export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

export const SPORT_TYPES = [
  "Football",
  "Rugby League",
  "Rugby Union",
  "Cricket",
  "Tennis",
  "Basketball",
  "Netball",
  "Hockey",
  "Swimming",
  "Athletics",
  "Gymnastics",
  "Bowling",
  "Golf",
  "Surf",
  "Volleyball",
  "Baseball",
  "Softball",
  "Table Tennis",
  "Badminton",
  "Squash",
  "Martial Arts",
  "Boxing",
  "Dance",
] as const;

export type SportType = (typeof SPORT_TYPES)[number];

// Google Places search keywords
export const CLUB_SEARCH_KEYWORDS = [
  "sports club",
  "football club",
  "AFL club",
  "soccer club",
  "tennis club",
  "cricket club",
  "basketball club",
  "rugby club",
  "netball club",
  "hockey club",
  "swimming club",
  "athletics club",
  "gymnastics club",
  "bowling club",
  "golf club",
  "surf club",
  "recreation club",
  "RSL club",
] as const;

// Default search radius in kilometers
export const DEFAULT_SEARCH_RADIUS_KM = 10;

// Rate limiting
export const SCRAPE_DELAY_MS = 1000; // 1 second between requests per domain
export const CACHE_TTL_DAYS = 7; // Cache scraped data for 7 days

// IP-based signup restrictions
export const MAX_ACCOUNTS_PER_IP = 2;
export const WHITELISTED_IPS = [
  "2001:4860:7:c01::ed", // IPv6
  "115.129.139.104",     // IPv4
] as const;
