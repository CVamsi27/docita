"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Stethoscope, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
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

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: November 26, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Docita&apos;s clinic management software
                and related services (the &quot;Service&quot;), you agree to be
                bound by these Terms of Service (&quot;Terms&quot;). If you do
                not agree to these Terms, you may not use the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These Terms apply to all users of the Service, including
                healthcare providers, clinic administrators, staff members, and
                any other authorized users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Docita provides a cloud-based clinic management platform that
                includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Patient record management</li>
                <li>Appointment scheduling</li>
                <li>Prescription management</li>
                <li>Billing and invoicing</li>
                <li>WhatsApp integration for patient communication</li>
                <li>Analytics and reporting</li>
                <li>Document management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. Account Registration
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.1 Account Creation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                To use the Service, you must create an account by providing
                accurate and complete information. You are responsible for
                maintaining the confidentiality of your account credentials.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.2 Account Requirements
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You must be at least 18 years old to create an account</li>
                <li>
                  You must be a licensed healthcare provider or authorized
                  representative of a healthcare facility
                </li>
                <li>
                  You must provide valid professional credentials when requested
                </li>
                <li>
                  You are responsible for all activities that occur under your
                  account
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-6 mb-3">
                3.3 Account Security
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You must immediately notify us of any unauthorized use of your
                account or any other security breach. We are not liable for any
                loss or damage arising from your failure to protect your account
                credentials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                4. Subscription and Payment
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                4.1 Subscription Plans
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service is offered through various subscription tiers with
                different features and pricing. Details of current plans are
                available on our website.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                4.2 Payment Terms
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  Subscription fees are billed in advance on a monthly or annual
                  basis
                </li>
                <li>
                  All fees are non-refundable except as expressly stated in
                  these Terms
                </li>
                <li>
                  We reserve the right to change pricing with 30 days&apos;
                  notice
                </li>
                <li>
                  Failure to pay may result in suspension or termination of your
                  account
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-6 mb-3">4.3 Free Trial</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may offer free trials for certain subscription plans. At the
                end of the trial period, you will be automatically charged
                unless you cancel before the trial ends.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                5.1 Permitted Use
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You may use the Service only for lawful purposes related to
                clinic management and healthcare delivery, in compliance with
                all applicable laws and regulations.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                5.2 Prohibited Activities
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Use the Service for any unlawful purpose</li>
                <li>Violate any applicable healthcare laws or regulations</li>
                <li>Upload malicious code or interfere with the Service</li>
                <li>
                  Attempt to gain unauthorized access to any systems or data
                </li>
                <li>
                  Share your account credentials with unauthorized persons
                </li>
                <li>
                  Use the Service to store or transmit infringing or illegal
                  content
                </li>
                <li>
                  Reverse engineer or attempt to extract source code from the
                  Service
                </li>
                <li>
                  Resell or redistribute the Service without authorization
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Data Ownership and Responsibilities
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">6.1 Your Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of all data you enter into the Service
                (&quot;Your Data&quot;). You grant us a limited license to use
                Your Data solely to provide and improve the Service.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                6.2 Data Responsibility
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>The accuracy and legality of Your Data</li>
                <li>
                  Obtaining necessary patient consents for data collection and
                  storage
                </li>
                <li>Complying with healthcare privacy laws and regulations</li>
                <li>Maintaining appropriate backups of critical data</li>
              </ul>

              <h3 className="text-xl font-medium mt-6 mb-3">6.3 Data Export</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may export Your Data at any time using the export features
                provided in the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                7. Intellectual Property
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">7.1 Our Rights</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including all software, designs, trademarks, and
                content (excluding Your Data), is owned by Docita and protected
                by intellectual property laws.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                7.2 License Grant
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Subject to these Terms, we grant you a limited, non-exclusive,
                non-transferable license to access and use the Service for your
                internal business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Disclaimers</h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                8.1 No Medical Advice
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service is a practice management tool and does not provide
                medical advice, diagnosis, or treatment recommendations. All
                medical decisions remain the sole responsibility of the
                healthcare provider.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                8.2 Service Availability
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                IMPLIED. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE
                SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOCITA SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
                DATA, OR GOODWILL.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR
                THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE
                TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                10. Indemnification
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Docita, its officers,
                directors, employees, and agents from any claims, damages,
                losses, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any applicable laws or regulations</li>
                <li>Any claims related to Your Data or patient care</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                11.1 Termination by You
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by contacting
                support. Upon termination, you will lose access to the Service
                and Your Data.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                11.2 Termination by Us
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to the Service
                immediately if you violate these Terms or for any other reason
                with reasonable notice.
              </p>

              <h3 className="text-xl font-medium mt-6 mb-3">
                11.3 Effect of Termination
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination, your right to use the Service will cease
                immediately. We will retain Your Data for a reasonable period to
                allow you to export it, after which it may be deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                12. Governing Law and Disputes
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by the laws of India. Any disputes
                arising from these Terms or the Service shall be resolved
                through binding arbitration in accordance with the Arbitration
                and Conciliation Act, 1996, with the seat of arbitration in
                Hyderabad, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                13. Changes to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these Terms at any time. We will notify you of
                material changes by email or through the Service. Your continued
                use of the Service after such changes constitutes acceptance of
                the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                14. General Provisions
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Entire Agreement:</strong> These Terms constitute the
                  entire agreement between you and Docita regarding the Service.
                </li>
                <li>
                  <strong>Severability:</strong> If any provision is found
                  unenforceable, the remaining provisions will continue in
                  effect.
                </li>
                <li>
                  <strong>Waiver:</strong> Our failure to enforce any right or
                  provision does not constitute a waiver.
                </li>
                <li>
                  <strong>Assignment:</strong> You may not assign these Terms
                  without our consent. We may assign our rights and obligations
                  freely.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">Docita</p>
                <p className="text-muted-foreground">
                  Email: legal@docita.work
                </p>
                <p className="text-muted-foreground">
                  Support: support@docita.work
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
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
              <Link href="/terms" className="text-foreground font-medium">
                Terms of Service
              </Link>
              <Link
                href="/#contact"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Docita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
