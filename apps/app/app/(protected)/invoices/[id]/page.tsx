"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import {
  ArrowLeft,
  Download,
  Edit,
  Loader2,
  Lock,
  Printer,
  Share2,
} from "lucide-react";
import { useSmartBack } from "@/hooks/use-smart-back";
import { format } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { apiHooks } from "@/lib/api-hooks";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { InvoiceItem } from "@workspace/types";
import Image from "next/image";

interface DoctorInfo {
  name?: string;
  qualification?: string;
  registrationNumber?: string;
  signatureUrl?: string;
}

interface ClinicInfo {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params["id"] as string;
  const { canAccess } = usePermissionStore();
  const { clinic: contextClinic } = useClinic();
  const hasWhatsAppAccess = canAccess(Feature.ONE_WAY_WHATSAPP);
  const goBack = useSmartBack("/invoices");

  const { data: invoice, isLoading, error } = apiHooks.useInvoice(invoiceId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!invoice) return;

    const patientName = invoice.patient
      ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
      : "Patient";

    const total = calculateTotal();
    const date = format(new Date(invoice.createdAt), "dd/MM/yyyy");

    let message = `*Invoice for ${patientName}*\n\n`;
    message += `Invoice #: ${invoice.id?.slice(0, 8).toUpperCase()}\n`;
    message += `Date: ${date}\n`;
    message += `Status: ${invoice.status?.toUpperCase()}\n\n`;
    message += `*Items:*\n`;

    invoice.items?.forEach((item: InvoiceItem, index: number) => {
      message += `${index + 1}. ${item.description}\n`;
      message += `   Qty: ${item.quantity} × ₹${item.price} = ₹${item.quantity * item.price}\n\n`;
    });

    message += `*Total Amount: ₹${total}*\n\n`;
    message += `Thank you for choosing our services!`;

    const phoneNumber = invoice.patient?.phoneNumber?.replace(/[^0-9]/g, "");
    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  const calculateTotal = (): number => {
    if (!invoice?.items) return Number(invoice?.total) || 0;
    return invoice.items.reduce(
      (sum: number, item) => sum + Number(item.quantity) * Number(item.price),
      0,
    );
  };

  if (error) {
    toast.error("Failed to load invoice");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const patientName = invoice.patient
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
    : "Patient";

  const doctorInfo = invoice.appointment?.doctor as DoctorInfo | undefined;
  const doctorName = doctorInfo?.name;

  // Get clinic info from invoice patient's clinic or from context
  const clinicInfo =
    (invoice.patient as { clinic?: ClinicInfo })?.clinic || contextClinic;

  const total = calculateTotal();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Invoice</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(invoice.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/invoices/${invoiceId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {hasWhatsAppAccess ? (
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <Share2 className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to access WhatsApp sharing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Content - Print Optimized */}
      <Card className="print:shadow-none print:border-2 print:border-gray-300">
        <CardHeader className="space-y-4 pb-4">
          {/* Clinic Header */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-4">
            <div className="flex items-start gap-4">
              {clinicInfo?.logo && (
                <Image
                  src={clinicInfo.logo}
                  alt="Clinic Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {clinicInfo?.name || "Medical Clinic"}
                </h1>
                {clinicInfo?.address && (
                  <p className="text-sm text-muted-foreground">
                    {clinicInfo.address}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  {clinicInfo?.phone && <span>📞 {clinicInfo.phone}</span>}
                  {clinicInfo?.email && <span>✉️ {clinicInfo.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-primary">INVOICE</h2>
              <p className="text-lg font-mono font-semibold mt-1">
                #{invoice.id?.slice(0, 8).toUpperCase()}
              </p>
              <Badge
                variant={
                  invoice.status === "paid"
                    ? "default"
                    : invoice.status === "pending"
                      ? "secondary"
                      : "destructive"
                }
                className="mt-2"
              >
                {invoice.status?.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Bill To & Invoice Details */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Bill To
              </p>
              <p className="font-semibold text-lg">{patientName}</p>
              {invoice.patient?.phoneNumber && (
                <p className="text-sm text-muted-foreground">
                  📞 {invoice.patient.phoneNumber}
                </p>
              )}
              {invoice.patient?.email && (
                <p className="text-sm text-muted-foreground">
                  ✉️ {invoice.patient.email}
                </p>
              )}
              {invoice.patient?.address && (
                <p className="text-sm text-muted-foreground mt-1">
                  📍 {invoice.patient.address}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Invoice Date
                </p>
                <p className="font-semibold">
                  {format(new Date(invoice.createdAt), "dd MMMM yyyy")}
                </p>
              </div>
              {doctorName && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Attending Physician
                  </p>
                  <p className="font-semibold">Dr. {doctorName}</p>
                  {doctorInfo?.registrationNumber && (
                    <p className="text-sm text-muted-foreground">
                      Reg. No: {doctorInfo.registrationNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Items Table */}
          <div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-primary/10">
                  <tr>
                    <th className="text-left p-3 font-semibold text-primary">
                      #
                    </th>
                    <th className="text-left p-3 font-semibold text-primary">
                      Description
                    </th>
                    <th className="text-center p-3 font-semibold text-primary w-20">
                      Qty
                    </th>
                    <th className="text-right p-3 font-semibold text-primary w-32">
                      Unit Price
                    </th>
                    <th className="text-right p-3 font-semibold text-primary w-32">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: InvoiceItem, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3 font-medium">{item.description}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        ₹{(item.quantity * item.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Section */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-primary pt-2 mt-2">
                <span>Total Amount:</span>
                <span className="text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-muted/30 p-4 rounded-lg print:bg-gray-50">
            <p className="text-sm">
              <span className="text-muted-foreground">Amount in words: </span>
              <span className="font-medium capitalize">
                {numberToWords(total)} Rupees Only
              </span>
            </p>
          </div>

          {/* Signature Section */}
          {doctorInfo && (
            <div className="pt-8 mt-4 border-t">
              <div className="flex justify-end">
                <div className="text-center min-w-[200px]">
                  {doctorInfo?.signatureUrl ? (
                    <div className="mb-2">
                      <Image
                        src={doctorInfo.signatureUrl}
                        alt="Authorized Signature"
                        width={150}
                        height={60}
                        className="h-[60px] w-auto mx-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-[60px] border-b-2 border-gray-400 mb-2" />
                  )}
                  <p className="font-bold">Dr. {doctorName}</p>
                  {doctorInfo?.qualification && (
                    <p className="text-sm text-muted-foreground">
                      {doctorInfo.qualification}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Authorized Signatory
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Thank you for your visit!</p>
            <p>
              This is a computer-generated invoice and is valid without
              signature
            </p>
            <p>
              For any queries, please contact us at{" "}
              {clinicInfo?.phone || clinicInfo?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const numStr = Math.floor(num).toString();

  if (numStr.length > 9) return "Amount too large";

  const padded = numStr.padStart(9, "0");
  const crore = parseInt(padded.slice(0, 2));
  const lakh = parseInt(padded.slice(2, 4));
  const thousand = parseInt(padded.slice(4, 6));
  const hundred = parseInt(padded.slice(6, 7));
  const remaining = parseInt(padded.slice(7, 9));

  let result = "";

  if (crore > 0) {
    result += convertTwoDigits(crore, ones, tens) + " Crore ";
  }
  if (lakh > 0) {
    result += convertTwoDigits(lakh, ones, tens) + " Lakh ";
  }
  if (thousand > 0) {
    result += convertTwoDigits(thousand, ones, tens) + " Thousand ";
  }
  if (hundred > 0) {
    result += ones[hundred] + " Hundred ";
  }
  if (remaining > 0) {
    if (result) result += "and ";
    result += convertTwoDigits(remaining, ones, tens);
  }

  return result.trim();
}

function convertTwoDigits(num: number, ones: string[], tens: string[]): string {
  if (num < 20) return ones[num] || "";
  return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
}
