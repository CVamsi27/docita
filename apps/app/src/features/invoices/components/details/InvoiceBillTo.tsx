import { getPatientFullName } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import type { Invoice, Patient } from "@workspace/types";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

interface InvoiceBillToProps {
  invoice: Invoice & { patient?: Patient };
}

export function InvoiceBillTo({ invoice }: InvoiceBillToProps) {
  const { t } = useTranslation("Invoices.billTo");
  return (
    <div className="grid md:grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("billToTitle")}
        </h3>
        {invoice.patient ? (
          <div className="text-sm space-y-1">
            <p className="font-bold text-lg">
              {getPatientFullName(invoice.patient)}
            </p>
            <p>{invoice.patient.address || "-"}</p>
            <p>{invoice.patient.email}</p>
            <p>{invoice.patient.phoneNumber}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("unknownPatient")}</p>
        )}
      </div>
      <div className="md:text-right">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("paymentDetailsTitle")}
        </h3>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground mr-2">{t("methodLabel")}</span>
            <span className="capitalize">{invoice.paymentMethod || "N/A"}</span>
          </p>
          <p>
            <span className="text-muted-foreground mr-2">{t("statusLabel")}</span>
            <span className="capitalize font-medium">
              {humanizeUiLabel(invoice.status)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
