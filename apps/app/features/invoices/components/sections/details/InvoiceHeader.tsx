import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Clinic, Invoice } from "@workspace/types";
import Image from "next/image";
import { useFacilityLabel } from "@/lib/facility-label";

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
  const facilityLabel = useFacilityLabel();
  return (
    <CardHeader className="flex flex-row justify-between items-start border-b pb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {clinic?.logo ? (
            <div className="relative h-12 w-12 rounded-xl overflow-hidden border">
              <Image
                src={clinic.logo || ""}
                alt={clinic.name || `${facilityLabel} Logo`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {clinic?.name?.charAt(0) || "D"}
            </div>
          )}
          <div>
            <CardTitle className="text-xl">
              {clinic?.name || `${facilityLabel} Name`}
            </CardTitle>
            {clinic?.website && (
              <a
                href={clinic.website}
                target="_blank"
                rel="noreferrer"
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
              <span className="font-medium">Phone:</span> {clinic.phone}
            </p>
          )}
          {clinic?.email && (
            <p>
              <span className="font-medium">Email:</span> {clinic.email}
            </p>
          )}
        </CardDescription>
      </div>
      <div className="text-right">
        <h2 className="text-2xl font-bold text-primary mb-1">INVOICE</h2>
        <p className="text-sm font-medium text-muted-foreground">
          #{invoice.id}
        </p>
        <div className="mt-4 text-sm">
          <div className="flex justify-end gap-4">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {invoice.createdAt ? formatDate(invoice.createdAt) : "N/A"}
            </span>
          </div>
          <div className="flex justify-end gap-4 mt-1">
            <span className="text-muted-foreground">Due Date:</span>
            <span className="font-medium">
              {invoice.updatedAt ? formatDate(invoice.updatedAt) : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
