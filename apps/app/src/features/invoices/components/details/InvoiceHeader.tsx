import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { useTranslation } from "react-i18next";
import type { Clinic, Invoice } from "@workspace/types";
import { useFacilityLabel } from "@/lib/formatters/facility-label";

interface InvoiceHeaderProps {
  invoice: Invoice;
  formatDate: (date: Date | string) => string;
  clinic?: Partial<Clinic> | null;
}

export function InvoiceHeader({
  invoice,
  formatDate,
  clinic,
}: InvoiceHeaderProps) {
  const { t } = useTranslation("Invoices.header");
  const facilityLabel = useFacilityLabel();
  const documentTitle = invoice.taxSummary?.documentTitle ?? t("invoiceTitle");
  return (
    <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {clinic?.logo ? (
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border">
              <img
                src={clinic.logo}
                alt={clinic.name || t("logoAlt", { facility: facilityLabel })}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {clinic?.name?.charAt(0) || "D"}
            </div>
          )}
          <div>
            <CardTitle className="text-xl">
              {clinic?.name || t("nameFallback", { facility: facilityLabel })}
            </CardTitle>
            {clinic?.website && (
              <a
                href={clinic.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline"
              >
                {clinic.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <CardDescription className="mt-4 text-sm max-w-[300px] space-y-1">
          {clinic?.address && (
            <p className="whitespace-pre-line">{clinic.address}</p>
          )}
          {clinic?.phone && (
            <p>
              <span className="font-medium">{t("phoneLabel")}</span> {clinic.phone}
            </p>
          )}
          {clinic?.email && (
            <p>
              <span className="font-medium">{t("emailLabel")}</span> {clinic.email}
            </p>
          )}
        </CardDescription>
      </div>
      <div className="w-full text-left sm:w-auto sm:text-right">
        <h2 className="ui-section-title mb-1 text-[var(--fs-2xl)] text-primary">
          {documentTitle}
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          #{invoice.invoiceNumber ?? invoice.id}
        </p>
        <dl className="mt-4 inline-grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-left text-sm">
          <dt className="text-muted-foreground">{t("dateLabel")}</dt>
          <dd className="font-medium">
            {invoice.issuedAt || invoice.createdAt
              ? formatDate(invoice.issuedAt ?? invoice.createdAt)
              : t("notAvailable")}
          </dd>
          <dt className="text-muted-foreground">{t("dueDateLabel")}</dt>
          <dd className="font-medium">
            {invoice.dueDate ? formatDate(invoice.dueDate) : t("notAvailable")}
          </dd>
        </dl>
      </div>
    </CardHeader>
  );
}
