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

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export type USState = (typeof US_STATES)[number];

export const REGIONS = [...AUSTRALIAN_STATES, ...US_STATES] as const;

export type Region = (typeof REGIONS)[number];

export const SUPPORTED_COUNTRIES = ["AU", "US"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

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
  "American Football",
  "Lacrosse",
  "Ice Hockey",
  "Field Hockey",
  "Wrestling",
  "Cheerleading",
] as const;

export type SportType = (typeof SPORT_TYPES)[number];

// Google Places search keywords
export const CLUB_SEARCH_KEYWORDS = [
  // Universal
  "sports club",
  "recreation club",
  "basketball club",
  "tennis club",
  "swimming club",
  "athletics club",
  "gymnastics club",
  "bowling club",
  "golf club",
  "volleyball club",
  // Australian
  "football club",
  "AFL club",
  "soccer club",
  "cricket club",
  "rugby club",
  "netball club",
  "hockey club",
  "surf club",
  "RSL club",
  // US
  "little league",
  "youth baseball",
  "youth football",
  "pop warner",
  "recreational league",
  "YMCA",
  "boys and girls club",
  "lacrosse club",
  "ice hockey club",
  "wrestling club",
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
