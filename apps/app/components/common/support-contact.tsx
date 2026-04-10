"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
  getPhoneDigits,
  getSupportPhoneDisplay,
  getSupportPhoneNumber,
  SUPPORT_EMAIL,
} from "@/lib/support-contact";

export function SupportContact({ className }: { className?: string }) {
  const supportPhone = getSupportPhoneNumber();
  const supportPhoneDigits = getPhoneDigits(supportPhone);
  const supportPhoneDisplay = getSupportPhoneDisplay();

  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      Need help? Email{" "}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="underline underline-offset-4 hover:text-foreground transition-colors"
      >
        {SUPPORT_EMAIL}
      </a>{" "}
      or call{" "}
      <a
        href={`tel:+${supportPhoneDigits}`}
        className="underline underline-offset-4 hover:text-foreground transition-colors"
      >
        {supportPhoneDisplay}
      </a>
      .
    </p>
  );
}
