"use client";

// check-as-cast-density: allow-file
// This is a static legal/consent template containing user-facing prose (e.g.
// "such as WhatsApp", "as long as necessary"). The density scanner uses a
// simple regex that flags the English word "as" in JSX text as a type cast.
// There are no TypeScript type assertions in this file.

import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
import { Separator } from "@workspace/ui/components/layout/separator";
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

interface ConsentTemplateDocumentProps {
  clinic: ConsentDocumentClinicInfo | null | undefined;
  generatedOn?: Date;
}

export function ConsentTemplateDocument({
  clinic,
  generatedOn,
}: ConsentTemplateDocumentProps) {
  const issueDate = generatedOn ?? new Date();

  return (
    <Card className="border-0 shadow-none print:border-0 print:shadow-none">
      <CardHeader className="space-y-4 border-b pb-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
          <div className="flex items-start gap-4 max-w-[70%]">
            {clinic?.logo ? (
              <img
                src={clinic.logo}
                alt={clinic.name ? `${clinic.name} logo` : "Facility logo"}
                className="h-20 w-20 rounded-lg object-contain"
              />
            ) : null}
            <div className="flex flex-col gap-1">
              <h1 className="ui-page-title text-primary leading-[var(--lh-tight)]">
                {clinic?.name ?? "Your facility"}
              </h1>
              {clinic?.address ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {clinic.address}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {clinic?.phone ? (
                  <span>
                    <span className="opacity-70">Phone:</span> {clinic.phone}
                  </span>
                ) : null}
                {clinic?.email ? (
                  <span>
                    <span className="opacity-70">Email:</span> {clinic.email}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 p-3 text-left md:bg-transparent md:p-0 md:text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Document
            </p>
            <p className="font-semibold">Patient Data &amp; Consent Form</p>
            <p className="text-xs text-muted-foreground">
              Issued {formatDate(issueDate, "dd MMMM yyyy")}
            </p>
          </div>
        </div>
        <div className="text-center">
          <h2 className="ui-section-title">
            Patient Consent for Collection and Use of Health Data
          </h2>
          <p className="ui-page-subtitle text-muted-foreground">
            Provided under the Digital Personal Data Protection Act, 2023 and
            applicable healthcare record-handling standards.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6 text-sm leading-6">
        <section className="space-y-2">
          <h3 className="text-base font-semibold">1. Patient Information</h3>
          <p className="text-muted-foreground">
            Please verify the details on file. If anything is incorrect, ask the
            facility to update your record before signing.
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 pt-2 md:grid-cols-2">
            <SignatureField label="Patient name" />
            <SignatureField label="Date of birth" />
            <SignatureField label="MRN / Patient ID" />
            <SignatureField label="Phone number" />
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">
              2. Categories of Data We Collect
            </h3>
            <p className="text-muted-foreground">
              The facility named above collects, processes, and stores the
              following categories of personal and health data about you. Each
              entry lists the purpose for which the data is used.
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

        <Separator />

        <section className="space-y-2">
          <h3 className="text-base font-semibold">3. How We Use Your Data</h3>
          <p>Your data is processed only for the following purposes:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Delivering clinical care, including diagnosis, treatment, and
              continuity across visits.
            </li>
            <li>
              Communicating appointments, follow-ups, prescriptions, and lab
              results through channels you opt into (such as WhatsApp, SMS, or
              email).
            </li>
            <li>
              Generating invoices, processing payments, and supporting insurance
              claims where applicable.
            </li>
            <li>
              Maintaining mandatory clinical, billing, and audit records under
              Indian healthcare regulations.
            </li>
            <li>
              Anonymous, aggregated quality and safety reporting. Identifiable
              data is never sold, leased, or used for marketing without your
              separate opt-in.
            </li>
          </ul>
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-base font-semibold">
            4. Sharing With Third Parties
          </h3>
          <p>
            Your data may be shared only with: (a) clinicians directly involved
            in your care, (b) labs and pharmacies you are referred to, (c)
            statutory or regulatory authorities when required by law, and (d)
            secure cloud and technology vendors bound by data-processing
            agreements consistent with the DPDP Act, 2023.
          </p>
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-base font-semibold">5. Data Retention</h3>
          <p>
            Records are retained only for as long as necessary for clinical,
            legal, and regulatory purposes. Indicative retention periods:
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

        <Separator />

        <section className="space-y-2">
          <h3 className="text-base font-semibold">6. Your Rights</h3>
          <p>
            Under the Digital Personal Data Protection Act, 2023, you have the
            right to:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access a copy of the personal data we hold about you.</li>
            <li>
              Request correction of inaccurate or out-of-date information.
            </li>
            <li>
              Request deletion of data that is no longer required for care or
              legal reasons.
            </li>
            <li>
              Withdraw any consent you have given (for example, WhatsApp
              communications).
            </li>
            <li>
              Nominate a person to exercise these rights on your behalf in case
              of incapacity or death.
            </li>
          </ul>
          <p className="text-muted-foreground">
            To exercise any of these rights, contact the facility using the
            details at the top of this form.
          </p>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-base font-semibold">7. Patient Consent</h3>
          <p>
            I confirm that I have read and understood this form. I consent to
            the facility collecting, processing, and storing the categories of
            data listed above for the purposes described, in compliance with the
            Digital Personal Data Protection Act, 2023 and applicable healthcare
            record-handling standards.
          </p>
          <ConsentOptionRow
            label="Consent to general health data collection and storage (required for care)"
            options={["Granted", "Declined"]}
          />
          <ConsentOptionRow
            label="Consent to WhatsApp reminders and follow-ups"
            options={["Granted", "Declined"]}
          />
          <ConsentOptionRow
            label="Consent to email and SMS notifications"
            options={["Granted", "Declined"]}
          />
        </section>

        <Separator />

        <section className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <SignatureLine label="Patient signature" />
              <SignatureField label="Date" />
            </div>
            <div className="space-y-2">
              <SignatureLine label="Guardian / authorised signatory (if applicable)" />
              <SignatureField label="Relationship to patient" />
            </div>
            <div className="space-y-2">
              <SignatureLine label="Witness / staff signature" />
              <SignatureField label="Staff name &amp; role" />
            </div>
            <div className="space-y-2">
              <SignatureField label="Date and time of signing" />
              <SignatureField label="Facility reference / consent ID" />
            </div>
          </div>
        </section>

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p className="font-medium">
            This form should be retained with the patient&apos;s medical record.
            A digital audit trail of the recorded consent is maintained by the
            facility.
          </p>
          <p>
            For questions about how your data is handled, contact the facility
            named above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SignatureField({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="h-7 border-b border-muted-foreground/40" />
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="h-12 border-b-2 border-muted-foreground/60" />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function ConsentOptionRow({
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
