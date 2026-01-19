import Link from "next/link";

export const metadata = {
  title: "Contact Us | SponsorMatch",
  description: "Get in touch with the SponsorMatch team",
};

export default function ContactPage() {
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
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-neutral-600">
            Have a question or need help? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="bg-neutral-50 rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Steve Glaveski</h2>
            <p className="text-neutral-600 mb-4">Founder, SponsorMatch</p>
          </div>

          <a
            href="mailto:steve@collectivecamp.us"
            className="inline-flex items-center gap-2 text-lg text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            steve@collectivecamp.us
          </a>

          <p className="mt-6 text-sm text-neutral-500">
            We typically respond within 24-48 hours.
          </p>
        </div>

        <div className="mt-12 text-center">
          <h3 className="font-semibold mb-4">Common Questions</h3>
          <div className="space-y-4 text-left max-w-md mx-auto">
            <div>
              <p className="font-medium text-neutral-900">How do I get started?</p>
              <p className="text-sm text-neutral-600">
                Simply <Link href="/signup" className="text-blue-600 hover:underline">create a free account</Link> and
                start searching for sponsors in your area.
              </p>
            </div>
            <div>
              <p className="font-medium text-neutral-900">Can I upgrade or downgrade my plan?</p>
              <p className="text-sm text-neutral-600">
                Yes, you can change your plan anytime from your account settings.
              </p>
            </div>
            <div>
              <p className="font-medium text-neutral-900">Is my data secure?</p>
              <p className="text-sm text-neutral-600">
                Absolutely. Read our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> to
                learn how we protect your information.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-neutral-600">
          &copy; {new Date().getFullYear()} SponsorMatch. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
