"use client";

import { useTranslation } from "react-i18next";
import { DPDP_NOTICE_TEXT_PATIENT, DPDP_NOTICE_TITLE } from "@workspace/types";
import { Checkbox } from "@workspace/ui/components/form/checkbox";

interface DpdpConsentNoticeProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** DPDP data-processing notice + consent checkbox shown to new patients during public booking. */
export function DpdpConsentNotice({ checked, onCheckedChange }: DpdpConsentNoticeProps) {
  const { t } = useTranslation("PublicBooking");

  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-border/70 bg-muted/30 p-4 sm:col-span-2">
      <p className="text-[length:var(--fs-sm)] font-semibold text-foreground">
        {DPDP_NOTICE_TITLE}
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      </p>
      <p className="text-[length:var(--fs-xs)] leading-relaxed text-muted-foreground">
        {DPDP_NOTICE_TEXT_PATIENT}
      </p>
      <label
        htmlFor="pb-dpdp-consent"
        className="mt-2 flex cursor-pointer items-start gap-2 text-[length:var(--fs-sm)]"
      >
        <Checkbox
          id="pb-dpdp-consent"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <span>{t("dpdpConsent.label")}</span>
      </label>
    </div>
  );
}
