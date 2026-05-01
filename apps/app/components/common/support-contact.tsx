"use client";

import { cn } from "@workspace/ui/lib/utils";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import {
  getPhoneDigits,
  getSupportPhoneDisplay,
  getSupportPhoneNumber,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
} from "@/lib/support-contact";

export type SupportContactLayout = "inline" | "stack";
export type SupportContactVariant = "compact" | "footer";

export interface SupportContactProps {
  className?: string;
  layout?: SupportContactLayout;
  variant?: SupportContactVariant;
  /** Overrides default prefilled WhatsApp message. */
  whatsappMessage?: string;
}

export function SupportContact({
  className,
  layout = "inline",
  variant = "compact",
  whatsappMessage = SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
}: SupportContactProps) {
  const supportPhone = getSupportPhoneNumber();
  const supportPhoneDigits = getPhoneDigits(supportPhone);
  const supportPhoneDisplay = getSupportPhoneDisplay();
  const hasPhoneSupport = supportPhoneDigits.length > 0;
  const isStack = layout === "stack";
  const isFooter = variant === "footer";

  const emailBlock = (
    <>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="underline underline-offset-4 hover:text-foreground transition-colors"
      >
        {SUPPORT_EMAIL}
      </a>
    </>
  );

  const phoneCallBlock = hasPhoneSupport ? (
    <a
      href={`tel:+${supportPhoneDigits}`}
      className="underline underline-offset-4 transition-colors hover:text-foreground"
    >
      {supportPhoneDisplay}
    </a>
  ) : null;

  const whatsappBlock = hasPhoneSupport ? (
    <WhatsAppButton
      phoneNumber={supportPhone}
      message={whatsappMessage}
      label="WhatsApp"
      variant="outline"
      size="sm"
      className={cn(isStack && "shrink-0")}
    />
  ) : null;

  if (isStack) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 text-center text-xs text-muted-foreground",
          isFooter && "rounded-lg border border-border/60 bg-muted/20 px-4 py-4",
          className,
        )}
      >
        <p className="max-w-md">
          <span className="font-medium text-foreground">Need help?</span> Email {emailBlock}
          {hasPhoneSupport ? "." : ""}
        </p>
        {hasPhoneSupport ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>
              Call {phoneCallBlock}
            </span>
            {whatsappBlock}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <span>Need help? Email {emailBlock}</span>
      {hasPhoneSupport ? (
        <>
          <span className="hidden sm:inline" aria-hidden>
            |
          </span>
          <span className="flex flex-wrap items-center justify-center gap-2">
            <span>
              Call{" "}
              {phoneCallBlock}
            </span>
            {whatsappBlock}
          </span>
        </>
      ) : null}
    </div>
  );
}
