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

interface DocumentHeaderProps {
  clinic: ConsentDocumentClinicInfo | null | undefined;
  issueDate: Date;
}

export function DocumentHeader({ clinic, issueDate }: DocumentHeaderProps) {
  return (
    <div className="space-y-4 border-b pb-6">
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
            <h1 className="text-xl font-bold text-primary leading-tight">
              {clinic?.name ?? "Your Facility"}
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
            Legal Document
          </p>
          <p className="font-semibold">
            Patient Consent Form
          </p>
          <p className="text-xs text-muted-foreground">
            Issued {formatDate(issueDate, "dd MMMM yyyy")}
          </p>
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          Informed Consent for Collection, Use, and Processing of Personal Data
        </h2>
        <p className="text-sm text-muted-foreground">
          Under the Digital Personal Data Protection Act, 2023
        </p>
      </div>
    </div>
  );
}

export function PatientInfoSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">1. Patient Information</h3>
      <p className="text-muted-foreground">
        Please fill in the blanks below. This section identifies the patient
        whose data is being collected and processed.
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 pt-2 md:grid-cols-2">
        <SignatureField label="Patient Full Name" />
        <SignatureField label="Date of Birth" />
        <SignatureField label="Medical Record Number (MRN)" />
        <SignatureField label="Phone Number" />
      </div>
    </section>
  );
}

export function DataCategoriesSection() {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">
          2. Categories of Data Collected
        </h3>
        <p className="text-muted-foreground">
          The following categories of personal data may be collected, stored,
          and processed:
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

export function DataUsageSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">3. Purpose of Data Processing</h3>
      <p>
        Your personal data is processed for the following purposes:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Providing medical treatment, diagnosis, and healthcare services</li>
        <li>
          Maintaining your medical records and facilitating continuity of care
        </li>
        <li>
          Processing insurance claims, billing, and payments where applicable
        </li>
        <li>
          Sending appointment reminders, test results, and treatment
          follow-ups via the communication channels you have consented to
        </li>
        <li>
          Complying with legal and regulatory obligations, including
          reporting requirements under applicable law
        </li>
      </ul>
    </section>
  );
}

export function ThirdPartySharingSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">
        4. Sharing of Data with Third Parties
      </h3>
      <p>
        Your data may be shared with:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Other healthcare providers involved in your treatment (with your
          explicit consent)
        </li>
        <li>
          Insurance companies and third-party administrators for claim
          processing
        </li>
        <li>
          Regulatory authorities as required by applicable law
        </li>
        <li>
          Technology service providers who store and process data on behalf
          of the facility (under strict data processing agreements)
        </li>
      </ul>
      <p className="text-muted-foreground">
        Your data will not be sold, rented, or used for purposes other than
        those listed in this consent form without your explicit further
        consent.
      </p>
    </section>
  );
}

export function DataRetentionSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">5. Data Retention</h3>
      <p>
        Your personal data will be retained for as long as necessary to fulfill
        the purposes for which it was collected, or as required by applicable
        law. The following retention periods apply:
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

export function YourRightsSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">
        6. Your Rights Under the DPDP Act, 2023
      </h3>
      <p>
        Under the Digital Personal Data Protection Act, 2023, you have the
        following rights regarding your personal data:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <span className="font-medium">Right to Access:</span> Request a
          summary of your personal data held by the facility
        </li>
        <li>
          <span className="font-medium">Right to Correction:</span> Request
          correction of inaccurate or incomplete data
        </li>
        <li>
          <span className="font-medium">Right to Deletion:</span> Request
          deletion of your data, subject to legal retention requirements
        </li>
        <li>
          <span className="font-medium">Right to Withdraw Consent:</span>{' '}
          Withdraw your consent at any time, subject to legal and contractual
          limitations
        </li>
        <li>
          <span className="font-medium">Right to Grievance Redressal:</span>{' '}
          Lodge a complaint regarding the handling of your personal data
        </li>
      </ul>
      <p className="text-muted-foreground">
        To exercise any of these rights, please contact the facility using the
        contact details provided at the top of this document.
      </p>
    </section>
  );
}

export function ConsentSection() {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">
        7. Consent Declaration
      </h3>
      <p>
        By signing below, I confirm that I have read and understood the
        information provided in this consent form. I consent to the collection,
        use, storage, and processing of my personal data as described above.
      </p>
      <ConsentOptionRow
        label="I consent to the collection and use of my data for healthcare purposes."
        options={["Granted", "Declined"]}
      />
      <ConsentOptionRow
        label="I consent to receive appointment reminders and health updates via WhatsApp."
        options={["Granted", "Declined"]}
      />
      <ConsentOptionRow
        label="I consent to the sharing of my data with other healthcare providers for referral or continuity of care."
        options={["Granted", "Declined"]}
      />
    </section>
  );
}

export function SignatureSection() {
  const signatureBlocks = [
    { line: "Patient/Guardian Signature", fields: [] },
    { fields: ["Date"] },
    { fields: ["Patient Name (print)"] },
    { line: "Witness Signature", fields: ["Witness Name (print)"] },
    { fields: ["Staff Member Name", "Date and Time", "Facility Stamp"] },
  ];

  return (
    <section className="space-y-4 pt-2">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {signatureBlocks.map((block, idx) => (
          <div key={idx} className="space-y-2">
            {block.line ? <SignatureLine label={block.line} /> : null}
            {block.fields.map((fieldKey) => (
              <SignatureField key={fieldKey} label={fieldKey} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DocumentFooter() {
  return (
    <div className="border-t pt-4 text-center text-xs text-muted-foreground">
      <p className="font-medium">
        This document is issued in accordance with the Digital Personal Data
        Protection Act, 2023
      </p>
      <p>
        Please retain a copy of this signed consent form for your records. A
        digital copy is also maintained in the patient&apos;s medical record.
      </p>
    </div>
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
