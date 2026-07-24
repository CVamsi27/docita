"use client";

import { Mail, Phone } from "lucide-react";
import { Button, MicroLabel } from "@workspace/ui/components";
import { WhatsAppButton } from "@/components/whatsapp/whatsapp-button";
import { getPhoneDigits, getSupportPhoneDisplay, getSupportPhoneNumber, SUPPORT_EMAIL, SUPPORT_WHATSAPP_MESSAGE_DEFAULT } from "@/lib/constants/support-contact";
import { cn } from "@workspace/ui/lib/utils";
import { AUTH_ASSURANCE_ITEMS } from "@/features/auth/lib/auth-assurance-items";

export interface AuthPreDashboardFooterProps {
  className?: string;
  "data-testid"?: string;
  whatsappMessage?: string;
  /** e.g. `lg:hidden` when the left branding rail already shows assurance items. */
  trustRowClassName?: string;
}

export function AuthPreDashboardFooter({
  className,
  "data-testid": dataTestId,
  whatsappMessage = SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
  trustRowClassName,
}: AuthPreDashboardFooterProps) {
  const supportPhone = getSupportPhoneNumber();
  const supportPhoneDigits = getPhoneDigits(supportPhone);
  const supportPhoneDisplay = getSupportPhoneDisplay();
  const hasPhoneSupport = supportPhoneDigits.length > 0;

  return (
    <footer
      data-testid={dataTestId}
      className={cn("w-full", className)}
      aria-label="Security and support"
    >
      <div className="rounded-[var(--radius)] border border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-border/50 pb-4 text-[length:var(--fs-xs)] text-muted-foreground",
            trustRowClassName,
          )}
          aria-label="Security and privacy"
        >
          {AUTH_ASSURANCE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-success"
                  aria-hidden
                />
                <span className="font-medium text-foreground/90">
                  {item.label}
                </span>
              </span>
            );
          })}
        </div>

        <div
          className={cn(
            "flex flex-col items-center gap-3 text-center",
            trustRowClassName ? "pt-4 lg:pt-0" : "pt-4",
          )}
        >
          <MicroLabel as="p" className="text-[length:var(--fs-2xs)]">
            Need help
          </MicroLabel>
          <div className="flex w-full max-w-sm flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
            >
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Email
                <span className="sr-only">{` ${SUPPORT_EMAIL}`}</span>
              </a>
            </Button>
            {hasPhoneSupport ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
                >
                  <a href={`tel:+${supportPhoneDigits}`}>
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Call
                    <span className="sr-only">{` ${supportPhoneDisplay}`}</span>
                  </a>
                </Button>
                <WhatsAppButton
                  phoneNumber={supportPhone}
                  message={whatsappMessage}
                  label="WhatsApp"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)] [&_svg]:h-3.5 [&_svg]:w-3.5"
                />
              </>
            ) : null}
          </div>
          <p className="max-w-sm text-[length:var(--fs-2xs)] leading-relaxed text-muted-foreground">
            <span className="text-foreground/80">{SUPPORT_EMAIL}</span>
            {hasPhoneSupport ? <> · {supportPhoneDisplay}</> : null}
          </p>
        </div>
      </div>
    </footer>
  );
}
