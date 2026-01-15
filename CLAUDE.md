# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SponsorMatch Australia - A SaaS platform helping local Australian sports teams find sponsors by identifying sponsors of nearby sporting/recreational clubs, finding contact details, and facilitating personalized outreach emails.

## Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client after schema changes
npx prisma db push   # Push schema to database (dev)
npx prisma migrate dev --name <name>  # Create migration
npx prisma studio    # Open database GUI

# Testing
npx playwright test  # Run E2E tests
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (email/password + Google OAuth)
- **Payments**: Stripe (freemium model)
- **Email**: Resend for transactional emails
- **AI**: Anthropic Claude API for email generation
- **External APIs**: Google Maps/Places API

### Project Structure
```
src/
├── app/
│   ├── (auth)/           # Login, signup pages
│   ├── (dashboard)/      # Protected pages (dashboard, search, settings, etc.)
│   ├── api/              # API routes
│   └── page.tsx          # Public landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                  # Utilities (auth, prisma, constants, subscription)
├── services/             # Business logic (geocoding, places, scraper, email)
└── types/                # TypeScript type definitions
```

### Key Data Flow
1. User enters Australian address → Geocoding API converts to lat/lng
2. Google Places API finds sports clubs within 10km radius
3. Web scraper extracts sponsor info from club websites
4. Claude API generates personalized outreach emails
5. Resend sends emails with tracking

### Database Models (prisma/schema.prisma)
- `User` - Auth, club info, subscription tier, usage tracking
- `Club` - Sports clubs found via Google Places
- `Sponsor` - Companies sponsoring clubs
- `ClubSponsor` - Many-to-many with sponsorship tier and season year
- `Search` / `SearchResult` - User search history
- `EmailOutreach` - Drafted/sent emails with status tracking
- `Payment` - Stripe payment records

### Subscription Tiers (src/lib/subscription.ts)
```
FREE:      5 emails/month, 10 searches, 20 sponsor details
STARTER:   $29/month - 50 emails, 50 searches, 100 sponsors
PRO:       $79/month - 200 emails, unlimited searches
UNLIMITED: $149/month - unlimited everything
```

### API Routes
```
/api/auth/*              - NextAuth endpoints
/api/auth/signup         - POST: Create account
/api/search/clubs        - POST: Find clubs near address
/api/sponsors/[clubId]   - GET: Get sponsors, POST: Force rescrape
/api/email/generate      - POST: Generate AI email
/api/email/send          - POST: Send email via Resend
/api/email/history       - GET: Email history
/api/user/profile        - GET/PUT: User profile
/api/user/usage          - GET: Usage analytics
/api/stripe/checkout     - POST: Create Stripe checkout session
/api/stripe/portal       - POST: Create Stripe billing portal
/api/stripe/webhook      - POST: Stripe webhook handler
/api/search/recent       - GET: Recent searches for user
/api/contacts/discover   - POST: Discover sponsor contacts
```

## Environment Variables

Required in `.env`:
```
DATABASE_URL             # PostgreSQL connection string
NEXTAUTH_URL             # http://localhost:3000
NEXTAUTH_SECRET          # Generate with: openssl rand -base64 32
GOOGLE_MAPS_API_KEY      # For geocoding and Places API (server-side)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  # For map display (client-side)
ANTHROPIC_API_KEY        # For AI email generation (optional)
RESEND_API_KEY           # For sending emails (optional)
GOOGLE_CLIENT_ID         # For Google OAuth (optional)
GOOGLE_CLIENT_SECRET     # For Google OAuth (optional)
STRIPE_SECRET_KEY        # For Stripe payments (optional)
STRIPE_WEBHOOK_SECRET    # For Stripe webhooks
STRIPE_PRICE_STARTER     # Stripe Price ID for Starter tier
STRIPE_PRICE_PRO         # Stripe Price ID for Pro tier
STRIPE_PRICE_UNLIMITED   # Stripe Price ID for Unlimited tier
```

## Australian-Specific Requirements

- Validate Australian addresses only (reject international)
- Currency in AUD
- Australian English spelling (colour, organisation, favour)
- States: VIC, NSW, QLD, WA, SA, TAS, NT, ACT
- Supported sports defined in `src/lib/constants.ts`

## Implementation Notes

- Rate limit scraping: 1 req/sec per domain (see `SCRAPE_DELAY_MS`)
- Cache scraped data for 7 days (see `CACHE_TTL_DAYS`)
- Email generation falls back to template if no API key
- User must complete club profile before sending emails
- Freemium limits enforced in `/api/email/send`
