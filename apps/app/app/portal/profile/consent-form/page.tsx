"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Printer } from "lucide-react";
import { usePatientConsentSettings } from "@workspace/data-access";
import { BackButton } from "@/components/navigation/back-button";
import { formatDate, formatDateTime } from "@/lib/formatters";

const formatConsentDateTime = (date?: string | null) => {
  if (!date) return "Not available";
  const formatted = formatDateTime(date, "dd MMM yyyy, HH:mm");
  return formatted.length > 0 ? formatted : "Not available";
};

export default function ConsentFormPage() {
  const { user } = useAuth();
  const { data: consentSettings } = usePatientConsentSettings();

  const today = useMemo(
    () =>
      formatDate(new Date(), "dd MMMM yyyy"),
    [],
  );

  const whatsappStatus = consentSettings?.whatsappConsent ? "Given" : "Not Given";
  const storageStatus = "Given";

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <BackButton
          fallback="/portal/profile"
          label="Back to Profile"
          variant="outline"
          size="sm"
        />
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="consent-print-root">
        <CardHeader className="space-y-3 border-b">
          <div className="text-center space-y-1">
            <CardTitle className="ui-section-title">Patient Consent Form</CardTitle>
            <p className="ui-page-subtitle">
              Health Data Storage and WhatsApp Notification Consent
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <section className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="font-medium">Patient Name:</span> {user?.name || "Not available"}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user?.email || "Not available"}
            </p>
            <p>
              <span className="font-medium">Date:</span> {today}
            </p>
            <p>
              <span className="font-medium">Consent Record Time:</span>
              <span className="ml-1">
                {formatConsentDateTime(consentSettings?.whatsappConsentAt)}
              </span>
            </p>
          </section>

          <section className="space-y-2 text-sm leading-6">
            <h2 className="text-base font-semibold">1. Consent for Health Data Storage</h2>
            <p>
              I understand and consent that my health and medical information may be collected,
              processed, and stored in secure digital systems for treatment, billing, compliance,
              and continuity of care.
            </p>
            <p>
              I understand this processing follows applicable Indian data protection requirements,
              including the Digital Personal Data Protection Act, 2023 and healthcare record
              handling practices where applicable to the facility.
            </p>
            <p>
              <span className="font-medium">Current Choice:</span> {storageStatus}
            </p>
          </section>

          <section className="space-y-2 text-sm leading-6">
            <h2 className="text-base font-semibold">2. Consent for WhatsApp Notifications</h2>
            <p>
              I consent to receive appointment reminders, follow-up information, prescription
              sharing links, and billing updates on my registered WhatsApp number.
            </p>
            <p>
              I understand WhatsApp communication may include limited health-related information
              necessary for care delivery. I can withdraw this consent from profile settings at
              any time.
            </p>
            <p>
              <span className="font-medium">Current Choice:</span> {whatsappStatus}
            </p>
          </section>

          <section className="space-y-2 text-sm leading-6">
            <h2 className="text-base font-semibold">3. Patient Acknowledgement</h2>
            <p>
              I confirm that I have read and understood this consent form and that the above
              choices represent my consent preferences.
            </p>
          </section>

          <section className="rounded-md border bg-muted/20 p-4 text-sm leading-6">
            <h2 className="text-base font-semibold mb-1">Hospital Display Copy</h2>
            <p>
              This consent form is maintained for digital display and record for patient
              information and hospital reference. Physical signature is not required for this
              portal copy.
            </p>
          </section>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .consent-print-root,
          .consent-print-root * {
            visibility: visible;
          }
          .consent-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
