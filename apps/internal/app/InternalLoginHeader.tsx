"use client";

import { ShieldCheck } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/layout/section-heading";

export function InternalLoginHeader() {
  return (
    <div className="flex flex-col items-center space-y-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70">
        <ShieldCheck className="h-6 w-6 text-primary" />
      </div>
      <SectionHeading
        align="center"
        size="page"
        title="Docita Internal"
        description="Internal Console - Product Owners & System Admins"
      />
    </div>
  );
}
