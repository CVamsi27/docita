"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Stethoscope, ArrowLeft } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Docita</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: March 15, 2026
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                1. What Are Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files stored on your device when you
                visit a website. They allow the website to remember your actions
                and preferences over a period of time, so you do not have to
                re-enter them whenever you return to the site or browse between
                pages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. How We Use Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Docita uses cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Keep you signed in to your account across sessions</li>
                <li>Remember your preferences (language, theme, currency)</li>
                <li>Understand how the application is used to improve it</li>
                <li>Detect and prevent fraud and security threats</li>
                <li>Ensure pages load correctly and features function as expected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. Types of Cookies We Use
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.1 Strictly Necessary Cookies
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                These cookies are essential for the website to function and
                cannot be switched off. They are usually set in response to
                actions you take, such as logging in or filling in forms. You
                cannot opt out of these cookies.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border rounded-lg">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Cookie</th>
                      <th className="text-left px-4 py-2 font-medium">Purpose</th>
                      <th className="text-left px-4 py-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">auth_token</td>
                      <td className="px-4 py-2">Maintains your authenticated session</td>
                      <td className="px-4 py-2">Session</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">csrf_token</td>
                      <td className="px-4 py-2">Protects against cross-site request forgery</td>
                      <td className="px-4 py-2">Session</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">tenant_id</td>
                      <td className="px-4 py-2">Identifies your clinic workspace</td>
                      <td className="px-4 py-2">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.2 Functional Cookies
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                These cookies allow the website to remember choices you have
                made to provide enhanced, personalised features. Disabling them
                may affect your experience.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border rounded-lg">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Cookie</th>
                      <th className="text-left px-4 py-2 font-medium">Purpose</th>
                      <th className="text-left px-4 py-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">theme</td>
                      <td className="px-4 py-2">Remembers your light/dark mode preference</td>
                      <td className="px-4 py-2">1 year</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">currency_pref</td>
                      <td className="px-4 py-2">Remembers your selected display currency</td>
                      <td className="px-4 py-2">24 hours</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">locale</td>
                      <td className="px-4 py-2">Remembers your language preference</td>
                      <td className="px-4 py-2">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.3 Analytics Cookies
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                These cookies help us understand how visitors interact with our
                website by collecting and reporting information anonymously. All
                data is aggregated and does not identify individual users.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                We do not use third-party advertising or tracking cookies. Any
                analytics we collect is processed in-house or via privacy-first
                tools that do not share data with advertisers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                4. Local Storage
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                In addition to cookies, we use browser local storage to save
                certain preferences (such as your detected currency and UI
                state). Local storage data does not leave your device and is not
                transmitted to our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                5. Third-Party Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Some features of Docita rely on third-party services that may
                set their own cookies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Razorpay</strong> — payment processing; cookies are
                  set only during checkout and are governed by{" "}
                  <a
                    href="https://razorpay.com/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Razorpay&apos;s Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>AWS CloudFront</strong> — content delivery; may set
                  cookies for load-balancing and security.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not use Google Analytics, Facebook Pixel, or other
                advertising-platform trackers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Managing Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Browser settings:</strong> Most browsers allow you to
                  refuse or delete cookies through their settings. Refer to your
                  browser&apos;s help documentation for instructions.
                </li>
                <li>
                  <strong>In-app preferences:</strong> Functional preferences
                  (theme, language, currency) can be changed directly inside
                  the Docita application.
                </li>
                <li>
                  <strong>Clearing local storage:</strong> You can clear local
                  storage at any time via your browser&apos;s developer tools or
                  site-data settings.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Note: Disabling strictly necessary cookies will prevent you from
                logging in and using the application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                7. Compliance
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our cookie practices are consistent with the Digital Personal
                Data Protection Act, 2023 (India) and the Information Technology
                Act, 2000. We do not use cookies to build advertising profiles
                or to share data with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                8. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Cookie Policy from time to time to reflect
                changes in technology or regulation. The &quot;Last
                updated&quot; date at the top of this page will be revised
                accordingly. Continued use of our services after any changes
                constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about our use of cookies, please contact:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">Docita Data Protection Team</p>
                <p className="text-muted-foreground">
                  Email:{" "}
                  <a
                    href="mailto:admin@docita.work"
                    className="text-primary hover:underline"
                  >
                    admin@docita.work
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Address: Docita HQ, Hyderabad, India
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold">Docita</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-foreground font-medium">
                Cookie Policy
              </Link>
              <Link
                href="/contact"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 Docita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
