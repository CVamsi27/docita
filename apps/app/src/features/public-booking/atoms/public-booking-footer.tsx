"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { SupportContact } from "@/components/support-contact/support-contact";
import { SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING } from "@/lib/constants/support-contact";
import { cn } from "@workspace/ui/lib/utils";
import { PublicBookingTrustRow } from "./public-booking-trust-row";

export function PublicBookingPageFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl space-y-1 max-md:max-w-lg sm:space-y-2",
        className,
      )}
    >
      <PublicBookingPoweredByFooter />
      <SupportContact
        layout="inline"
        variant="compact"
        minimalLinks
        whatsappMessage={SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING}
        className="max-w-xl lg:mx-auto"
      />
    </div>
  );
}

function PublicBookingPoweredByFooter({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation("PublicBooking");

  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-6xl border-t border-border/30 pt-1.5 sm:pt-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-8 sm:gap-y-1">
        <PublicBookingTrustRow />
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-auto min-h-0 gap-1 rounded-full px-2 py-0 text-[length:var(--fs-2xs)] font-normal text-muted-foreground hover:bg-muted/35 hover:text-foreground sm:gap-1.5 sm:px-2.5 sm:py-0.5"
        >
          <a
            href="https://docita.work"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            <span className="font-medium text-foreground/85">
              {t("footer.poweredBy")}
            </span>
            <DocitaLogo
              showText={false}
              className="h-4 w-4 sm:h-5 sm:w-5"
              iconClassName="h-4 w-4 sm:h-5 sm:w-5"
            />
          </a>
        </Button>
      </div>
    </footer>
  );
}
