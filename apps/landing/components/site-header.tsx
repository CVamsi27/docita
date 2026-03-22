"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { LandingThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2 flex-1">
          <DocitaLogo />
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="#features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="#testimonials"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Testimonials
          </Link>
          <Link
            href="#faq"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <LandingThemeToggle />
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`}
          >
            <Button variant="outline">Login</Button>
          </Link>
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
          >
            <Button>Start 14-Day Free Trial</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
