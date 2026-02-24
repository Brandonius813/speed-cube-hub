import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Speed Cube Hub",
  description: "Privacy Policy for Speed Cube Hub",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Last updated: February 24, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>
            When you create an account on Speed Cube Hub, we collect the
            information you provide, including your name, email address, and
            profile details. If you sign in with Google, we receive your name and
            email from your Google account. If you link your WCA (World Cube
            Association) account, we receive your WCA ID and public competition
            results.
          </p>
          <p className="mt-2">
            We also automatically collect usage data such as pages visited,
            features used, and device/browser information to help improve the
            service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>To provide, operate, and maintain the service</li>
            <li>To create and manage your account</li>
            <li>
              To display your profile, practice statistics, and personal bests
            </li>
            <li>To power leaderboards, activity feeds, and social features</li>
            <li>To send notifications related to your activity</li>
            <li>To respond to feedback and support requests</li>
            <li>To improve and develop new features</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            3. Information Sharing
          </h2>
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. Your profile information (name, handle, profile picture,
            practice stats, and personal bests) is publicly visible to other
            users as part of the service&apos;s social features. We may share
            information with service providers who help us operate the platform
            (e.g., hosting, analytics), but only as necessary to provide the
            service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            4. Data Storage & Security
          </h2>
          <p>
            Your data is stored securely using Supabase (hosted on AWS). We use
            industry-standard security measures including encryption in transit
            (HTTPS) and at rest. While we take reasonable steps to protect your
            data, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            5. Cookies
          </h2>
          <p>
            We use cookies to maintain your authentication session and remember
            your preferences. These are essential for the service to function and
            are not used for advertising or tracking across other websites.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            6. Your Rights
          </h2>
          <p>You may at any time:</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>Update or correct your profile information</li>
            <li>Unlink your WCA account</li>
            <li>
              Request deletion of your account and associated data by contacting
              us
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            7. Children&apos;s Privacy
          </h2>
          <p>
            Speed Cube Hub is not directed at children under the age of 13. We
            do not knowingly collect personal information from children under 13.
            If you believe a child under 13 has provided us with personal
            information, please contact us so we can remove it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated &quot;Last updated&quot;
            date. Continued use of the service after changes constitutes
            acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            9. Contact Us
          </h2>
          <p>
            If you have any questions about this Privacy Policy, please reach
            out using the feedback form on our website.
          </p>
        </section>
      </div>
    </main>
  )
}
