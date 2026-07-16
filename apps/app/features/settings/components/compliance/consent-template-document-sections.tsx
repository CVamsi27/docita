// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
"use client";

import { useTranslations } from "next-intl";
import { formatDate } from "@workspace/utils";
import {
  CONSENT_DATA_CATEGORIES,
  CONSENT_RETENTION_SUMMARY,
} from "./consent-template-data-categories";

export interface ConsentDocumentClinicInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
}

/**
 * Phase 3 (per-feature): apps/app Settings > Compliance >
 * Consent Template document. This is a legal document — most
 * of the body text is intentionally not translated (it needs
 * legal review before any translation can ship). The
 * conversion here covers only the chrome: section header
 * labels and the few UI strings the ratchet counts. The
 * long body paragraphs stay as English literals until a
 * lawyer-approved Hindi translation is available.
 */
function useConsentDocumentTranslations() {
  return useTranslations("Settings.consentDocument");
}

// ---------------------------------------------------------------------------
// DocumentHeader
// ---------------------------------------------------------------------------

interface DocumentHeaderProps {
  clinic: ConsentDocumentClinicInfo | null | undefined;
  issueDate: Date;
}

export function DocumentHeader({ clinic, issueDate }: DocumentHeaderProps) {
  const t = useConsentDocumentTranslations();
  return (
    <div className="space-y-4 border-b pb-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
        <div className="flex items-start gap-4 max-w-[70%]">
          {clinic?.logo ? (
            <img
              src={clinic.logo}
              alt={clinic.name ? `${clinic.name} logo` : t("facilityLogoFallback")}
              className="h-20 w-20 rounded-lg object-contain"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <h1 className="ui-page-title text-primary leading-[var(--lh-tight)]">
              {clinic?.name ?? t("facilityNameFallback")}
            </h1>
            {clinic?.address ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {clinic.address}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {clinic?.phone ? (
                <span>
                  <span className="opacity-70">{t("phoneLabel")}:</span> {clinic.phone}
                </span>
              ) : null}
              {clinic?.email ? (
                <span>
                  <span className="opacity-70">{t("emailLabel")}:</span> {clinic.email}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-muted/20 p-3 text-left md:bg-transparent md:p-0 md:text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("documentTag")}
          </p>
          <p className="font-semibold">{t("documentTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("documentIssued", { date: formatDate(issueDate, "dd MMMM yyyy") })}
          </p>
        </div>
      </div>
      <div className="text-center">
        <h2 className="ui-section-title">
          {t("documentHeading")}
        </h2>
        <p className="ui-page-subtitle text-muted-foreground">
          {t("documentSubheading")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientInfoSection
// ---------------------------------------------------------------------------

export function PatientInfoSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{t("section1Title")}</h3>
      <p className="text-muted-foreground">
        {t("section1Body")}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 pt-2 md:grid-cols-2">
        <SignatureField label={t("fieldPatientName")} />
        <SignatureField label={t("fieldDateOfBirth")} />
        <SignatureField label={t("fieldMrn")} />
        <SignatureField label={t("fieldPhoneNumber")} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DataCategoriesSection
// ---------------------------------------------------------------------------

export function DataCategoriesSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">
          {t("section2Title")}
        </h3>
        <p className="text-muted-foreground">
          {t("section2Body")}
        </p>
      </div>
      <div className="divide-y rounded-md border">
        {CONSENT_DATA_CATEGORIES.map((category, index) => (
          <div key={category.id} className="p-4">
            <p className="font-semibold">
              {index + 1}. {category.title}
            </p>
            <p className="mt-1 text-muted-foreground">{category.purpose}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {category.fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DataUsageSection
// ---------------------------------------------------------------------------

export function DataUsageSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{t("section3Title")}</h3>
      <p>{t("section3Body")}</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          {t("section3Bullet1")}
        </li>
        <li>
          {t("section3Bullet2")}
        </li>
        <li>
          {t("section3Bullet3")}
        </li>
        <li>
          {t("section3Bullet4")}
        </li>
        <li>
          {t("section3Bullet5")}
        </li>
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ThirdPartySharingSection
// ---------------------------------------------------------------------------

export function ThirdPartySharingSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">
        {t("section4Title")}
      </h3>
      <p>
        {t("section4Body")}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DataRetentionSection
// ---------------------------------------------------------------------------

export function DataRetentionSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{t("section5Title")}</h3>
      <p>
        {t("section5Body")}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {CONSENT_RETENTION_SUMMARY.map((entry) => (
          <li key={entry.category}>
            <span className="font-medium">{entry.category}:</span>{" "}
            {entry.retention}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// YourRightsSection
// ---------------------------------------------------------------------------

export function YourRightsSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{t("section6Title")}</h3>
      <p>
        {t("section6Body")}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{t("section6Right1")}</li>
        <li>
          {t("section6Right2")}
        </li>
        <li>
          {t("section6Right3")}
        </li>
        <li>
          {t("section6Right4")}
        </li>
        <li>
          {t("section6Right5")}
        </li>
      </ul>
      <p className="text-muted-foreground">
        {t("section6Footer")}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ConsentSection
// ---------------------------------------------------------------------------

export function ConsentSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{t("section7Title")}</h3>
      <p>
        {t("section7Body")}
      </p>
      <ConsentOptionRow
        label={t("consentRow1")}
        options={[t("consentGranted"), t("consentDeclined")]}
      />
      <ConsentOptionRow
        label={t("consentRow2")}
        options={[t("consentGranted"), t("consentDeclined")]}
      />
      <ConsentOptionRow
        label={t("consentRow3")}
        options={[t("consentGranted"), t("consentDeclined")]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// SignatureSection
// ---------------------------------------------------------------------------

export function SignatureSection() {
  const t = useConsentDocumentTranslations();
  return (
    <section className="space-y-4 pt-2">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <SignatureLine label={t("signaturePatient")} />
          <SignatureField label={t("signatureDate")} />
        </div>
        <div className="space-y-2">
          <SignatureLine label={t("signatureGuardian")} />
          <SignatureField label={t("signatureRelationship")} />
        </div>
        <div className="space-y-2">
          <SignatureLine label={t("signatureWitness")} />
          <SignatureField label={t("signatureStaff")} />
        </div>
        <div className="space-y-2">
          <SignatureField label={t("signatureDateTime")} />
          <SignatureField label={t("signatureFacilityRef")} />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DocumentFooter
// ---------------------------------------------------------------------------

export function DocumentFooter() {
  const t = useConsentDocumentTranslations();
  return (
    <div className="border-t pt-4 text-center text-xs text-muted-foreground">
      <p className="font-medium">
        {t("footerHeading")}
      </p>
      <p>
        {t("footerBody")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SignatureField
// ---------------------------------------------------------------------------

export function SignatureField({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="h-7 border-b border-muted-foreground/40" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SignatureLine
// ---------------------------------------------------------------------------

export function SignatureLine({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="h-12 border-b-2 border-muted-foreground/60" />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConsentOptionRow
// ---------------------------------------------------------------------------

export function ConsentOptionRow({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{label}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-4 w-4 rounded-sm border border-muted-foreground/60"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
