"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { LandingThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet";

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

        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
          <div className="hidden md:flex items-center gap-4">
            <LandingThemeToggle />
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`}
            >
              <Button variant="outline">Login</Button>
            </Link>
          </div>
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
            className="hidden sm:inline-flex"
          >
            <Button>Start 14-Day Free Trial</Button>
          </Link>

          <div className="md:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex justify-between items-center mb-8">
                  <DocitaLogo />
                  <LandingThemeToggle />
                </div>
                <nav className="flex flex-col gap-4 text-lg font-medium">
                  <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
                  <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
                  <Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link>
                  <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                </nav>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`} className="w-full">
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`} className="w-full">
                    <Button className="w-full">Start Free Trial</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
