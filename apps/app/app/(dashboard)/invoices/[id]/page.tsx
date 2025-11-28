/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ArrowLeft, Printer, Download, Share2, Edit, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@workspace/ui/components/badge"
import { apiHooks } from "@/lib/api-hooks"

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  
  const { data: invoice, isLoading, error } = apiHooks.useInvoice(invoiceId)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    window.print()
  }

  const handleShareWhatsApp = () => {
    if (!invoice) return

    const patientName = invoice.patient 
      ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
      : "Patient"
    
    const total = calculateTotal()
    const date = format(new Date(invoice.createdAt), "dd/MM/yyyy")
    
    let message = `*Invoice for ${patientName}*\n\n`
    message += `Invoice #: ${invoice.id?.slice(0, 8).toUpperCase()}\n`
    message += `Date: ${date}\n`
    message += `Status: ${invoice.status?.toUpperCase()}\n\n`
    message += `*Items:*\n`
    
    invoice.items?.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.description}\n`
      message += `   Qty: ${item.quantity} × ₹${item.price} = ₹${item.quantity * item.price}\n\n`
    })
    
    message += `*Total Amount: ₹${total}*\n\n`
    message += `Thank you for choosing our services!`

    const phoneNumber = invoice.patient?.phoneNumber?.replace(/[^0-9]/g, '')
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
  }

  const calculateTotal = () => {
    return invoice?.items?.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.price), 0) || invoice?.totalAmount || 0
  }

  if (error) {
    toast.error("Failed to load invoice")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/invoices")}>Back to Invoices</Button>
      </div>
    )
  }

  const patientName = invoice.patient 
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
    : "Patient"

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
          <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
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

      {/* Invoice Content */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Invoice</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                #{invoice.id?.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground">
                Date: {format(new Date(invoice.createdAt), "dd MMMM yyyy")}
              </p>
            </div>
            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'pending' ? 'secondary' : 'destructive'}>
              {invoice.status?.toUpperCase()}
            </Badge>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Bill To</p>
            <p className="font-semibold text-lg">{patientName}</p>
            {invoice.patient?.phoneNumber && (
              <p className="text-sm text-muted-foreground">{invoice.patient.phoneNumber}</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Items Table */}
          <div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-center p-3 font-semibold w-20">Qty</th>
                    <th className="text-right p-3 font-semibold w-32">Price</th>
                    <th className="text-right p-3 font-semibold w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">₹{item.price.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">₹{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                <span>Total Amount:</span>
                <span className="text-primary">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t text-center text-sm text-muted-foreground">
            <p>Thank you for your visit!</p>
            <p className="mt-1">This is a digitally generated invoice</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
