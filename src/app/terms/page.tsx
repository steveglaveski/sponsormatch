import Link from "next/link";

export const metadata = {
  title: "Terms of Service | SponsorMatch",
  description: "Terms of Service for SponsorMatch Australia",
};

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-neutral-600 mb-8">Last updated: January 2025</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-neutral-700 leading-relaxed">
              By accessing or using SponsorMatch (&quot;the Service&quot;), you agree to be bound by these Terms
              of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access
              the Service. These Terms constitute a legally binding agreement between you and SponsorMatch.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-neutral-700 leading-relaxed">
              SponsorMatch is a platform that helps Australian sports clubs discover potential sponsors
              in their local area. The Service provides tools to search for sponsors, view contact
              information, and generate personalised outreach emails. We do not guarantee any sponsorship
              outcomes or responses from potential sponsors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">When you create an account with us, you must:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Provide accurate, complete, and current information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorised use of your account</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              You must be at least 18 years old to use this Service. By using the Service, you represent
              that you are at least 18 years of age.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Send spam, unsolicited bulk emails, or harassing communications</li>
              <li>Violate any applicable laws or regulations, including anti-spam legislation</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Collect or harvest user data without consent</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorised access to any part of the Service</li>
              <li>Use the Service for any fraudulent or deceptive purposes</li>
              <li>Misrepresent your identity or affiliation with any person or organisation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Email Communications</h2>
            <p className="text-neutral-700 leading-relaxed">
              When using our email features, you must comply with the Spam Act 2003 (Cth) and all
              applicable anti-spam legislation. This includes ensuring you have a legitimate reason
              to contact potential sponsors, identifying yourself clearly in communications, and
              honouring any opt-out requests. You are solely responsible for the content of emails
              you send through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Subscriptions and Payments</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Some features of the Service require a paid subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700">
              <li>Pay all fees associated with your subscription plan</li>
              <li>Provide accurate billing information</li>
              <li>Authorise us to charge your payment method on a recurring basis</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              <strong>Billing:</strong> Subscriptions are billed in advance on a monthly basis. All fees
              are in Australian Dollars (AUD) and are non-refundable except as required by Australian
              Consumer Law.
            </p>
            <p className="text-neutral-700 leading-relaxed mt-4">
              <strong>Cancellation:</strong> You may cancel your subscription at any time. Upon cancellation,
              you will continue to have access to paid features until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-neutral-700 leading-relaxed">
              The Service and its original content, features, and functionality are owned by SponsorMatch
              and are protected by international copyright, trademark, and other intellectual property laws.
              You may not copy, modify, distribute, sell, or lease any part of our Service without our
              express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. User Content</h2>
            <p className="text-neutral-700 leading-relaxed">
              You retain ownership of any content you create or upload to the Service. By using the Service,
              you grant us a non-exclusive, worldwide, royalty-free licence to use, store, and process your
              content solely for the purpose of providing and improving the Service. You are responsible for
              ensuring you have the necessary rights to any content you upload or create.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Data</h2>
            <p className="text-neutral-700 leading-relaxed">
              The Service provides information about potential sponsors collected from publicly available
              sources. While we strive to provide accurate information, we do not guarantee the accuracy,
              completeness, or currentness of any sponsor data. You should verify all contact information
              before sending communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-neutral-700 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
              express or implied, including but not limited to implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement. We do not warrant that the Service
              will be uninterrupted, secure, or error-free, or that any defects will be corrected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-neutral-700 leading-relaxed">
              To the maximum extent permitted by Australian law, SponsorMatch shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including without limitation,
              loss of profits, data, use, or goodwill, arising out of or in connection with your use of the
              Service. Our total liability for any claims arising from your use of the Service shall not
              exceed the amount you paid us in the 12 months preceding the claim.
            </p>
            <p className="text-neutral-700 leading-relaxed mt-4">
              Nothing in these Terms excludes or limits any consumer guarantees or rights you may have
              under the Australian Consumer Law that cannot be excluded or limited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
            <p className="text-neutral-700 leading-relaxed">
              You agree to indemnify and hold harmless SponsorMatch and its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including legal fees)
              arising out of your use of the Service, your violation of these Terms, or your violation of
              any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
            <p className="text-neutral-700 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior
              notice or liability, for any reason, including if you breach these Terms. Upon termination,
              your right to use the Service will cease immediately. You may also terminate your account at
              any time by contacting us or using the account deletion feature in your settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-neutral-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of Victoria,
              Australia, without regard to its conflict of law provisions. Any disputes arising from
              these Terms or your use of the Service shall be subject to the exclusive jurisdiction
              of the courts of Victoria, Australia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-neutral-700 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material,
              we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes
              a material change will be determined at our sole discretion. By continuing to access or use
              our Service after any revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
            <p className="text-neutral-700 leading-relaxed">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will
              be modified to the minimum extent necessary to make it enforceable, and the remaining provisions
              will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
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
