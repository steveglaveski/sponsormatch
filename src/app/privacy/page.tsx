import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SponsorMatch",
  description: "Privacy Policy for SponsorMatch Australia",
};

export default function PrivacyPage() {
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
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-neutral-600 mb-8">Last updated: January 2025</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-neutral-700 leading-relaxed">
              SponsorMatch (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our website and services. We comply with the Australian Privacy Principles (APPs)
              contained in the Privacy Act 1988 (Cth).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li><strong>Account Information:</strong> Name, email address, password, and club details when you register</li>
              <li><strong>Club Information:</strong> Club name, sport type, address, and location data</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store card numbers)</li>
              <li><strong>Usage Data:</strong> Searches performed, sponsors viewed, and emails sent through our platform</li>
              <li><strong>Communications:</strong> Email content you compose using our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Generate AI-powered email suggestions tailored to your sponsorship outreach</li>
              <li>Monitor and analyse trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (e.g., Stripe for payments, Resend for email delivery, Google for authentication)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-neutral-700 leading-relaxed">
              We implement appropriate technical and organisational measures to protect your personal information
              against unauthorised access, alteration, disclosure, or destruction. This includes encryption of
              data in transit and at rest, secure authentication methods, and regular security assessments.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-neutral-700 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide
              you services. We will retain and use your information as necessary to comply with our legal
              obligations, resolve disputes, and enforce our agreements. You may request deletion of your
              account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">Under Australian Privacy law, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Withdraw consent for processing where consent was the basis</li>
              <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              To exercise these rights, please contact us at the details below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="text-neutral-700 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service and hold
              certain information. Cookies are used for authentication, remembering preferences, and
              analysing how our service is used. You can instruct your browser to refuse all cookies
              or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">Our service integrates with third-party services including:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li><strong>Google:</strong> For authentication and Gmail integration</li>
              <li><strong>Stripe:</strong> For payment processing</li>
              <li><strong>Anthropic:</strong> For AI-powered email generation</li>
              <li><strong>Resend:</strong> For email delivery</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              Each of these services has their own privacy policy governing the use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Children&apos;s Privacy</h2>
            <p className="text-neutral-700 leading-relaxed">
              Our service is not intended for individuals under the age of 18. We do not knowingly collect
              personal information from children under 18. If you are a parent or guardian and you are
              aware that your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-neutral-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-neutral-700 leading-relaxed mt-4">
              <strong>Email:</strong> support@sponsormatch.com.au
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
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
