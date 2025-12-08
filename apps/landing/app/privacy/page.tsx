"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Stethoscope, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mb-8">
            Last updated: November 26, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Docita (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our clinic management software and
                related services (the &quot;Service&quot;).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Please read this privacy policy carefully. By using our Service,
                you agree to the collection and use of information in accordance
                with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-medium mt-6 mb-3">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Account Information:</strong> Name, email address,
                  phone number, clinic name, and professional credentials when
                  you register.
                </li>
                <li>
                  <strong>Patient Data:</strong> Patient records, medical
                  history, appointments, prescriptions, and billing information
                  that you enter into the system.
                </li>
                <li>
                  <strong>Payment Information:</strong> Billing details and
                  payment method information for subscription services.
                </li>
                <li>
                  <strong>Communications:</strong> Messages, feedback, and
                  support requests you send to us.
                </li>
              </ul>

              <h3 className="text-xl font-medium mt-6 mb-3">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Usage Data:</strong> Information about how you use the
                  Service, including features accessed and time spent.
                </li>
                <li>
                  <strong>Device Information:</strong> Browser type, operating
                  system, IP address, and device identifiers.
                </li>
                <li>
                  <strong>Cookies:</strong> We use cookies and similar
                  technologies to enhance your experience.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the collected information for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Providing, maintaining, and improving our Service</li>
                <li>Processing transactions and sending related information</li>
                <li>
                  Sending administrative information, updates, and security
                  alerts
                </li>
                <li>
                  Responding to your comments, questions, and support requests
                </li>
                <li>Analyzing usage patterns to improve user experience</li>
                <li>
                  Detecting, preventing, and addressing technical issues and
                  fraud
                </li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security
                measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure data centers with physical security measures</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account
                is active or as needed to provide you services. We will retain
                and use your information as necessary to comply with legal
                obligations, resolve disputes, and enforce our agreements.
                Medical records are retained in accordance with applicable
                healthcare regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                6. Data Sharing and Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Service Providers:</strong> With third-party vendors
                  who assist in providing our services (e.g., cloud hosting,
                  payment processing).
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law,
                  regulation, or legal process.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a
                  merger, acquisition, or sale of assets.
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you have given us
                  explicit permission.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>
                  We do not sell your personal information or patient data to
                  third parties.
                </strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data.
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  data.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  data.
                </li>
                <li>
                  <strong>Portability:</strong> Request transfer of your data to
                  another service.
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain types of
                  processing.
                </li>
                <li>
                  <strong>Withdrawal:</strong> Withdraw consent where processing
                  is based on consent.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at
                privacy@docita.work.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                8. Healthcare Compliance
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Docita is designed to help healthcare providers maintain
                compliance with applicable healthcare regulations including but
                not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Information Technology Act, 2000 (India)</li>
                <li>Digital Personal Data Protection Act, 2023 (India)</li>
                <li>Medical Council of India guidelines</li>
                <li>HIPAA (for applicable US users)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                9. Children&apos;s Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is not intended for children under 18 years of age.
                We do not knowingly collect personal information from children
                under 18. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the &quot;Last updated&quot; date. You
                are advised to review this Privacy Policy periodically for any
                changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our privacy
                practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">Docita</p>
                <p className="text-muted-foreground">
                  Email: privacy@docita.work
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
              <Link href="/privacy" className="text-foreground font-medium">
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
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
