"use client"

import { API_URL } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Search, Download } from "lucide-react"
import { format } from "date-fns"
import { WhatsAppButton } from "@/components/common/whatsapp-button"

interface Invoice {
  id: string
  total: number
  status: string
  createdAt: string
  patient: {
    firstName: string
    lastName: string
    phoneNumber: string
  }
  appointment?: {
    doctor: {
      name: string
    }
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/invoices`)
      const data = await response.json()
      if (Array.isArray(data)) {
        setInvoices(data)
      } else {
        console.error("Invalid invoices data:", data)
        setInvoices([])
      }
    } catch (error) {
      console.error("Failed to load invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download PDF:", error)
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    `${invoice.patient.firstName} ${invoice.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.patient.phoneNumber.includes(searchTerm)
  )

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track patient invoices and payments.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or phone..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices generated for patients</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead>Invoice ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {invoice.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {invoice.patient.firstName} {invoice.patient.lastName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {invoice.patient.phoneNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.appointment?.doctor.name || '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₹{invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPDF(invoice.id)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <WhatsAppButton 
                        phoneNumber={invoice.patient.phoneNumber}
                        message={`Hello ${invoice.patient.firstName}, here is your invoice link for ${process.env.NEXT_PUBLIC_CLINIC_NAME || 'Docita Clinic'}: ${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.id}`}
                        variant="ghost"
                        label=""
                        className="h-8 w-8 p-0"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
