import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-blue-600">
            SponsorMatch
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Sign in
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4" variant="secondary">
            For Australian Sports Clubs
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            Find sponsors for your
            <span className="text-blue-600"> local sports club</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 md:text-xl">
            Discover companies already sponsoring sports clubs in your area.
            Get their contact details and send personalised outreach emails in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            5 free emails included. No credit card required.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-neutral-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center md:gap-16">
            <div>
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className="text-sm text-neutral-600">Clubs Using SponsorMatch</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">10,000+</div>
              <div className="text-sm text-neutral-600">Sponsors Discovered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">$2M+</div>
              <div className="text-sm text-neutral-600">Sponsorship Secured</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              How SponsorMatch Works
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Three simple steps to find your next sponsor
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                1
              </div>
              <h3 className="mt-6 text-xl font-semibold">Enter Your Location</h3>
              <p className="mt-2 text-neutral-600">
                Tell us where your club is based. We&apos;ll search for all
                sporting clubs within 10km of you.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                2
              </div>
              <h3 className="mt-6 text-xl font-semibold">Discover Sponsors</h3>
              <p className="mt-2 text-neutral-600">
                We automatically find and list all the sponsors of nearby clubs,
                complete with contact details.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                3
              </div>
              <h3 className="mt-6 text-xl font-semibold">Send Outreach</h3>
              <p className="mt-2 text-neutral-600">
                Use our AI-powered email composer to send personalised
                sponsorship inquiries in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-neutral-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Powerful tools designed for grassroots sports clubs
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location-Based Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Find sponsors of clubs near you. Local businesses prefer supporting clubs in their area.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Email Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Our AI writes personalised emails mentioning their existing community support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verified Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  We verify email addresses so your outreach reaches the right person.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Multi-Sport Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  AFL, soccer, cricket, tennis, netball, and 20+ other sports supported.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Track Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  See which emails were opened and track your sponsorship pipeline.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historical Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  See sponsors from the current season and past 2 years for better targeting.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Perfect to get started</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-neutral-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5 emails per month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    10 searches per month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    20 sponsor details
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI email generation
                  </li>
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Starter */}
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>For active clubs</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-neutral-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    50 emails per month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    50 searches per month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    100 sponsor details
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Email tracking
                  </li>
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link href="/signup">Start Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-blue-600 ring-2 ring-blue-600">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pro</CardTitle>
                  <Badge>Popular</Badge>
                </div>
                <CardDescription>Best for serious clubs</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$79</span>
                  <span className="text-neutral-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    200 emails per month
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited searches
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited sponsor details
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Priority support
                  </li>
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link href="/signup">Start Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Unlimited */}
            <Card>
              <CardHeader>
                <CardTitle>Unlimited</CardTitle>
                <CardDescription>For associations</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$149</span>
                  <span className="text-neutral-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited emails
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited everything
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API access
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated support
                  </li>
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <Link href="/signup">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-neutral-500">
            All prices in AUD. Cancel anytime. 14-day money-back guarantee.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-neutral-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mx-auto mt-16 max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  How do you find sponsors?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  We search for sports clubs near your location using Google Places,
                  then scan their websites for sponsor pages. We extract company names,
                  logos, and sponsorship tiers from their public sponsor listings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is this only for Australian clubs?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Yes, SponsorMatch is currently designed for Australian sports clubs.
                  We validate addresses to ensure they&apos;re within Australia and
                  our database focuses on Australian businesses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  How does the AI email generation work?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Our AI considers your club&apos;s details, the sponsor&apos;s industry,
                  and which other clubs they already support. It generates a personalised
                  email that references their existing community involvement, making your
                  outreach more relevant and likely to succeed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I use my own email address?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Yes! Emails are sent with your email address as the reply-to,
                  so sponsors can respond directly to you. We handle the sending
                  to ensure deliverability, but all replies come straight to your inbox.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What sports are supported?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  We support 25+ sports including AFL, soccer, rugby, cricket, tennis,
                  basketball, netball, hockey, swimming, athletics, and more. If there&apos;s
                  a club with a website, we can find their sponsors.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to find your next sponsor?
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Join hundreds of Australian sports clubs using SponsorMatch
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <p className="mt-4 text-sm text-neutral-500">
            No credit card required. 5 free emails included.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-neutral-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="text-xl font-bold text-blue-600">SponsorMatch</div>
              <p className="mt-2 text-sm text-neutral-600">
                Helping Australian sports clubs find local sponsors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Product</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><Link href="#how-it-works" className="hover:text-neutral-900">How It Works</Link></li>
                <li><Link href="#pricing" className="hover:text-neutral-900">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-neutral-900">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Support</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><Link href="/contact" className="hover:text-neutral-900">Contact Us</Link></li>
                <li><Link href="#faq" className="hover:text-neutral-900">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Legal</h4>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li><Link href="/privacy" className="hover:text-neutral-900">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-neutral-900">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} SponsorMatch Australia. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
