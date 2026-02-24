import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — Speed Cube Hub",
  description: "Terms of Service for Speed Cube Hub",
}

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Last updated: February 24, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using Speed Cube Hub (&quot;the Service&quot;), you
            agree to be bound by these Terms of Service. If you do not agree to
            these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p>
            Speed Cube Hub is a social platform for speedcubing enthusiasts to
            track practice sessions, log personal bests, follow other cubers,
            participate in challenges, join clubs, and view leaderboards. The
            Service is provided free of charge.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            3. User Accounts
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              You must provide accurate information when creating an account
            </li>
            <li>
              You are responsible for maintaining the security of your account
              credentials
            </li>
            <li>
              You are responsible for all activity that occurs under your account
            </li>
            <li>You must be at least 13 years old to use the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            4. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>
              Submit false or misleading practice data, personal bests, or
              competition results
            </li>
            <li>
              Harass, abuse, or send harmful content to other users
            </li>
            <li>
              Attempt to gain unauthorized access to other accounts or the
              Service&apos;s systems
            </li>
            <li>
              Use the Service for any illegal purpose or in violation of any
              applicable laws
            </li>
            <li>
              Use automated scripts or bots to interact with the Service without
              permission
            </li>
            <li>
              Impersonate another person or misrepresent your identity
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            5. User Content
          </h2>
          <p>
            You retain ownership of any content you submit to the Service (such
            as profile information, session logs, comments, and feedback). By
            submitting content, you grant Speed Cube Hub a non-exclusive,
            royalty-free license to display and distribute that content as part
            of the Service (e.g., showing your sessions in the activity feed or
            your stats on leaderboards).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            6. WCA Integration
          </h2>
          <p>
            If you choose to link your World Cube Association (WCA) account,
            your public WCA data (competition results, WCA ID) will be displayed
            on your profile. Speed Cube Hub is not affiliated with or endorsed by
            the World Cube Association.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            7. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your account at any
            time for violations of these Terms or for any conduct that we
            determine to be harmful to other users or the Service. You may also
            request account deletion at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            8. Disclaimers
          </h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, either express or
            implied. We do not guarantee that the Service will be uninterrupted,
            error-free, or free of harmful components. Use the Service at your
            own risk.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            9. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Speed Cube Hub and its
            operator shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, or any loss of data, use, or
            profits, arising out of or related to your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            10. Changes to These Terms
          </h2>
          <p>
            We may update these Terms of Service from time to time. Any changes
            will be posted on this page with an updated &quot;Last
            updated&quot; date. Continued use of the Service after changes
            constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            11. Contact Us
          </h2>
          <p>
            If you have any questions about these Terms of Service, please reach
            out using the feedback form on our website.
          </p>
        </section>
      </div>
    </main>
  )
}
