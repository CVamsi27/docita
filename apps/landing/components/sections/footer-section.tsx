"use client";

import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";

export function FooterSection() {
  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <DocitaLogo className="mb-4" textClassName="text-foreground" />
            <p className="text-sm mb-4">
              The complete operating system for modern clinics. Simplifying
              healthcare delivery one patient at a time.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#testimonials" className="hover:text-primary">
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-primary">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-primary">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 shrink-0" />
                <a
                  href="mailto:support@docita.work"
                  className="hover:text-primary transition-colors"
                >
                  support@docita.work
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                <span>Aparna Cyberscape, Nalagandla,<br />Hyderabad, Telangana 500019</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 space-y-4 text-sm">
          <div className="text-center text-muted-foreground text-xs leading-relaxed">
            <p>© {new Date().getFullYear()} Docita. All rights reserved.</p>
            <p className="mt-1">
              Docita is operated by <strong>CHANDALURI VAMSI KRISHNA</strong>, a registered sole proprietorship in India.
            </p>
            <p>GSTIN: 36CJPPC6222C1ZI</p>
            <p>Address: Aparna Cyberscape, Nalagandla, Hyderabad, Telangana 500019</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/refund-policy" className="hover:text-primary">
              Refund Policy
            </Link>
            <Link href="/cookies" className="hover:text-primary">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
